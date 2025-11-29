use hyper::{Response, StatusCode};
use http_body_util::{Full, combinators::BoxBody};
use hyper::body::Bytes;
use std::convert::Infallible;
use std::fs;
use std::path::Path;
use std::collections::HashSet;

/// Get the bundled plugins directory (next to executable)
fn get_bundled_plugins_dir() -> Option<std::path::PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join("plugins")))
        .filter(|p| p.exists())
}

/// Get the AppData plugins directory
fn get_appdata_plugins_dir() -> std::path::PathBuf {
    dirs::data_local_dir()
        .expect("Failed to get local data directory")
        .join("WebArcade")
        .join("plugins")
}

/// Check if we're running in development mode
fn is_dev_mode() -> bool {
    // Check for dev-tools feature at runtime
    // In dev mode, the executable is typically in target/debug
    if let Ok(exe) = std::env::current_exe() {
        let path_str = exe.to_string_lossy();
        if path_str.contains("target\\debug") || path_str.contains("target/debug") {
            return true;
        }
    }
    // Also check for TAURI_DEV environment variable
    std::env::var("TAURI_DEV").is_ok()
}

/// Scan a directory for plugins and return their metadata
fn scan_plugins_dir(dir: &Path, loaded_ids: &mut HashSet<String>) -> Vec<serde_json::Value> {
    let mut plugins = Vec::new();

    if !dir.exists() {
        return plugins;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_dir() {
                    let package_path = path.join("package.json");
                    if let Ok(package_content) = fs::read_to_string(&package_path) {
                        if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&package_content) {
                            // Extract webarcade section and create plugin metadata
                            if let Some(webarcade) = package_json.get("webarcade") {
                                let plugin_id = webarcade.get("id")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("");

                                // Skip if already loaded (bundled takes priority)
                                if loaded_ids.contains(plugin_id) {
                                    continue;
                                }
                                loaded_ids.insert(plugin_id.to_string());

                                // Check if plugin.js exists (frontend plugin)
                                let has_plugin_js = path.join("plugin.js").exists();

                                // Check if any native library exists (backend plugin)
                                // Windows: .dll, Linux: .so, macOS: .dylib
                                let has_dll = fs::read_dir(&path)
                                    .map(|entries| {
                                        entries.filter_map(|e| e.ok())
                                            .any(|e| {
                                                e.path().extension()
                                                    .map(|ext| ext == "dll" || ext == "so" || ext == "dylib")
                                                    .unwrap_or(false)
                                            })
                                    })
                                    .unwrap_or(false);

                                // Create plugin metadata from package.json
                                let plugin_metadata = serde_json::json!({
                                    "id": plugin_id,
                                    "name": package_json.get("name").and_then(|v| v.as_str()).unwrap_or(plugin_id),
                                    "version": package_json.get("version").and_then(|v| v.as_str()).unwrap_or("1.0.0"),
                                    "description": package_json.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                                    "author": package_json.get("author").and_then(|v| v.as_str()).unwrap_or("Unknown"),
                                    "routes": webarcade.get("routes").cloned().unwrap_or(serde_json::json!([])),
                                    "has_plugin_js": has_plugin_js,
                                    "has_dll": has_dll
                                });

                                plugins.push(plugin_metadata);
                            }
                        }
                    }
                }
            }
        }
    }

    plugins
}

/// Handle /api/plugins/list - list runtime plugins
/// Priority: 1. Bundled plugins (for distribution) 2. AppData plugins (for development)
pub fn handle_list_plugins() -> Response<BoxBody<Bytes, Infallible>> {
    let mut plugins = Vec::new();
    let mut loaded_ids = HashSet::new();

    // In production mode, load bundled plugins first (they take priority)
    if !is_dev_mode() {
        if let Some(bundled_dir) = get_bundled_plugins_dir() {
            log::info!("📦 Loading bundled plugins from: {:?}", bundled_dir);
            plugins.extend(scan_plugins_dir(&bundled_dir, &mut loaded_ids));
        }
    }

    // Then load from AppData (skip duplicates)
    let appdata_dir = get_appdata_plugins_dir();
    if appdata_dir.exists() {
        log::info!("📦 Loading AppData plugins from: {:?}", appdata_dir);
        plugins.extend(scan_plugins_dir(&appdata_dir, &mut loaded_ids));
    }

    let json = serde_json::json!({
        "plugins": plugins
    }).to_string();

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(full_body(&json))
        .unwrap()
}

/// Handle /api/plugins/{plugin_id}/{file} - serve plugin files
/// Priority: 1. Bundled plugins (for distribution) 2. AppData plugins (for development)
pub fn handle_serve_plugin_file(plugin_id: &str, file_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    // Try bundled plugins first (for production/distribution)
    let mut plugin_dir: Option<std::path::PathBuf> = None;

    if !is_dev_mode() {
        if let Some(bundled_dir) = get_bundled_plugins_dir() {
            let bundled_plugin_dir = bundled_dir.join(plugin_id);
            if bundled_plugin_dir.exists() {
                plugin_dir = Some(bundled_plugin_dir);
            }
        }
    }

    // Fall back to AppData plugins
    if plugin_dir.is_none() {
        let appdata_plugin_dir = get_appdata_plugins_dir().join(plugin_id);
        if appdata_plugin_dir.exists() {
            plugin_dir = Some(appdata_plugin_dir);
        }
    }

    let plugin_dir = match plugin_dir {
        Some(dir) => dir,
        None => return error_response(StatusCode::NOT_FOUND, "Plugin not found"),
    };

    let file = plugin_dir.join(file_path);

    // Security: Ensure the file is within the plugin directory
    if !file.starts_with(&plugin_dir) {
        return error_response(StatusCode::FORBIDDEN, "Access denied");
    }

    if !file.exists() {
        return error_response(StatusCode::NOT_FOUND, "File not found");
    }

    match fs::read(&file) {
        Ok(content) => {
            let content_type = if file_path.ends_with(".js") {
                "application/javascript"
            } else if file_path.ends_with(".json") {
                "application/json"
            } else if file_path.ends_with(".css") {
                "text/css"
            } else {
                "application/octet-stream"
            };

            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", content_type)
                .header("Access-Control-Allow-Origin", "*")
                .body(BoxBody::new(Full::new(Bytes::from(content))))
                .unwrap()
        }
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to read file")
    }
}

fn full_body(s: &str) -> BoxBody<Bytes, Infallible> {
    use http_body_util::combinators::BoxBody;
    use http_body_util::BodyExt;
    BoxBody::new(Full::new(Bytes::from(s.to_string())).map_err(|err: Infallible| match err {}))
}

fn error_response(status: StatusCode, message: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let json = serde_json::json!({"error": message}).to_string();
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(full_body(&json))
        .unwrap()
}
