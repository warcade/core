use crate::core::plugin_context::PluginContext;
use crate::core::plugin_router::PluginRouter;
use crate::core::router_utils::*;
use crate::route;
use anyhow::Result;
use hyper::{Request, Response, StatusCode, body::Incoming};
use hyper::body::Bytes;
use http_body_util::{combinators::BoxBody, Full};
use std::convert::Infallible;
use sysinfo::System;
use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use std::io::{Read, Write};
use zip::ZipArchive;

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct BuildProgress {
    state: String,
    progress: u8,
    message: String,
    timestamp: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    errors: Option<Vec<String>>,
}

lazy_static::lazy_static! {
    static ref BUILD_PROGRESS: Arc<Mutex<BuildProgress>> = Arc::new(Mutex::new(BuildProgress {
        state: "idle".to_string(),
        progress: 0,
        message: "Ready".to_string(),
        timestamp: 0,
        errors: None,
    }));
}

pub async fn register_routes(ctx: &PluginContext) -> Result<()> {
    let mut router = PluginRouter::new();

    // GET /system/stats - Get all system statistics (CPU cores + memory)
    route!(router, GET "/stats" => handle_get_stats);

    // GET /system/cpu - Get CPU information
    route!(router, GET "/cpu" => handle_get_cpu);

    // GET /system/memory - Get memory information
    route!(router, GET "/memory" => handle_get_memory);

    // GET /system/settings?key=xxx - Get a specific setting by key
    route!(router, GET "/settings", query => handle_get_settings);

    // GET /system/build-progress - Get current build progress
    route!(router, GET "/build-progress" => handle_get_build_progress);

    // POST /system/build-progress - Update build progress (from rspack plugin)
    route!(router, POST "/build-progress" => handle_post_build_progress);

    // POST /system/trigger-rebuild - Trigger frontend rebuild by touching entry file
    route!(router, POST "/trigger-rebuild" => handle_trigger_rebuild);

    // POST /system/plugins/upload - Upload and install a plugin from a zip file
    route!(router, POST "/plugins/upload" => handle_plugin_upload);

    // DELETE /system/plugins/:plugin_name - Remove an installed plugin
    route!(router, DELETE "/plugins/:plugin_name", path => handle_plugin_delete);

    // POST /system/background/upload - Upload and save a background image or video
    route!(router, POST "/background/upload" => handle_background_upload);

    // GET /system/background/:filename - Serve background files
    route!(router, GET "/background/:filename", path => handle_serve_background);

    // GET /system/desktop-items - Get items from the Windows desktop folder
    route!(router, GET "/desktop-items" => handle_get_desktop_items);

    // POST /system/open-path - Open a file or folder using the default system handler
    route!(router, POST "/open-path" => handle_open_path);

    ctx.register_router("system", router).await;
    Ok(())
}

async fn handle_get_stats() -> Response<BoxBody<Bytes, Infallible>> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Calculate CPU usage
    let cpu_count = sys.cpus().len();
    let cpu_usage: f64 = sys.cpus().iter().map(|cpu| cpu.cpu_usage() as f64).sum::<f64>() / cpu_count as f64;

    // Calculate memory usage
    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let memory_usage = (used_memory as f64 / total_memory as f64) * 100.0;

    let response_data = serde_json::json!({
        "cpu_usage": cpu_usage,
        "memory_usage": memory_usage,
        "cpu": {
            "cores": cpu_count,
            "usage_percent": cpu_usage,
        },
        "memory": {
            "total": total_memory,
            "used": used_memory,
            "usage_percent": memory_usage,
        },
    });

    json_response(&response_data)
}

async fn handle_get_cpu() -> Response<BoxBody<Bytes, Infallible>> {
    let sys = System::new_all();

    let response_data = serde_json::json!({
        "cores": sys.cpus().len(),
    });

    json_response(&response_data)
}

async fn handle_get_memory() -> Response<BoxBody<Bytes, Infallible>> {
    let mut sys = System::new_all();
    sys.refresh_memory();

    let total_memory = sys.total_memory();
    let used_memory = sys.used_memory();
    let memory_usage = (used_memory as f64 / total_memory as f64) * 100.0;

    let response_data = serde_json::json!({
        "total": total_memory,
        "used": used_memory,
        "usage_percent": memory_usage,
    });

    json_response(&response_data)
}

async fn handle_get_settings(query: String) -> Response<BoxBody<Bytes, Infallible>> {
    let key = match parse_query_param(&query, "key") {
        Some(k) => k,
        None => return error_response(StatusCode::BAD_REQUEST, "Missing key parameter"),
    };

    let db_path = crate::core::database::get_database_path();
    match rusqlite::Connection::open(&db_path) {
        Ok(conn) => {
            let result: std::result::Result<String, _> = conn.query_row(
                "SELECT value FROM system_settings WHERE key = ?1",
                rusqlite::params![key],
                |row| row.get(0),
            );

            match result {
                Ok(value) => json_response(&serde_json::json!({ "key": key, "value": value })),
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    json_response(&serde_json::json!({ "key": key, "value": null }))
                }
                Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
            }
        }
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

async fn handle_get_build_progress() -> Response<BoxBody<Bytes, Infallible>> {
    let progress = BUILD_PROGRESS.lock().unwrap();
    json_response(&*progress)
}

async fn handle_post_build_progress(req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
    match read_json_body(req).await {
        Ok(body) => {
            match serde_json::from_value::<BuildProgress>(body) {
                Ok(new_progress) => {
                    let mut progress = BUILD_PROGRESS.lock().unwrap();
                    *progress = new_progress;
                    json_response(&serde_json::json!({ "success": true }))
                }
                Err(e) => error_response(StatusCode::BAD_REQUEST, &format!("Invalid build progress data: {}", e)),
            }
        }
        Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
    }
}

async fn handle_trigger_rebuild(_req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
    use std::fs::OpenOptions;
    use std::path::Path;

    // Touch the entry file to trigger rspack rebuild
    // Path is relative to the workspace root (one level up from bridge/)
    let entry_file = Path::new("../src/entry-client.jsx");

    if !entry_file.exists() {
        return error_response(StatusCode::NOT_FOUND, "Entry file not found");
    }

    match OpenOptions::new().write(true).append(true).open(entry_file) {
        Ok(file) => {
            // Set the file's modified time to now by opening it
            drop(file);

            // Also try to use filetime to ensure the timestamp updates
            if let Err(e) = filetime::set_file_mtime(
                entry_file,
                filetime::FileTime::now()
            ) {
                log::warn!("[System] Failed to update file time: {}", e);
            }

            log::info!("[System] Triggered rebuild by touching entry file");
            json_response(&serde_json::json!({
                "success": true,
                "message": "Rebuild triggered"
            }))
        }
        Err(e) => {
            error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to touch file: {}", e))
        }
    }
}

async fn handle_plugin_upload(req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
    use http_body_util::BodyExt;
    use multer::Multipart;
    use std::fs;
    use futures_util::stream;

    // Get the boundary from Content-Type header
    let content_type = match req.headers().get("content-type") {
        Some(ct) => match ct.to_str() {
            Ok(s) => s,
            Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid content-type header"),
        },
        None => return error_response(StatusCode::BAD_REQUEST, "Missing content-type header"),
    };

    let boundary = match multer::parse_boundary(content_type) {
        Ok(b) => b,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid multipart boundary"),
    };

    // Collect the body
    let body_bytes = match req.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(e) => return error_response(StatusCode::BAD_REQUEST, &format!("Failed to read body: {}", e)),
    };

    // Create a stream from the bytes
    let stream = stream::once(async move { Result::<_, std::io::Error>::Ok(body_bytes) });

    // Parse multipart
    let mut multipart = Multipart::new(stream, boundary);

    // Find the plugin file
    let mut plugin_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.ok().flatten() {
        if field.name() == Some("plugin") {
            match field.bytes().await {
                Ok(bytes) => {
                    plugin_data = Some(bytes.to_vec());
                    break;
                }
                Err(e) => return error_response(StatusCode::BAD_REQUEST, &format!("Failed to read file: {}", e)),
            }
        }
    }

    let plugin_data = match plugin_data {
        Some(data) => data,
        None => return error_response(StatusCode::BAD_REQUEST, "No plugin file found in request"),
    };

    // Extract the zip file
    let cursor = std::io::Cursor::new(plugin_data);
    let mut archive = match ZipArchive::new(cursor) {
        Ok(a) => a,
        Err(e) => return error_response(StatusCode::BAD_REQUEST, &format!("Invalid zip file: {}", e)),
    };

    // Determine plugin name from the zip structure
    // Expected structure: plugin_name/mod.rs, plugin_name/index.jsx, plugin_name/overlay.jsx, etc.
    let plugin_name = match determine_plugin_name(&mut archive) {
        Ok(name) => name,
        Err(e) => return error_response(StatusCode::BAD_REQUEST, &e),
    };

    // Extract to temporary location first
    let temp_dir = std::env::temp_dir().join(format!("webarcade_plugin_{}", plugin_name));
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    if let Err(e) = fs::create_dir_all(&temp_dir) {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to create temp directory: {}", e));
    }

    // Extract all files
    for i in 0..archive.len() {
        let mut file = match archive.by_index(i) {
            Ok(f) => f,
            Err(e) => {
                let _ = fs::remove_dir_all(&temp_dir);
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to read zip entry: {}", e));
            }
        };

        let outpath = match file.enclosed_name() {
            Some(path) => temp_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            let _ = fs::create_dir_all(&outpath);
        } else {
            if let Some(p) = outpath.parent() {
                let _ = fs::create_dir_all(p);
            }
            let mut outfile = match fs::File::create(&outpath) {
                Ok(f) => f,
                Err(e) => {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to create file: {}", e));
                }
            };
            let mut buffer = Vec::new();
            if let Err(e) = file.read_to_end(&mut buffer) {
                let _ = fs::remove_dir_all(&temp_dir);
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to read file: {}", e));
            }
            if let Err(e) = outfile.write_all(&buffer) {
                let _ = fs::remove_dir_all(&temp_dir);
                return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to write file: {}", e));
            }
        }
    }

    // Now copy the extracted files to the unified plugins directory
    // Working directory is bridge/, so paths are relative to that
    let workspace_root = PathBuf::from("..");

    let plugin_temp = temp_dir.join(&plugin_name);

    // Copy to unified plugins/plugin_name directory
    let plugin_dest = workspace_root.join("plugins").join(&plugin_name);
    if let Err(e) = copy_dir_all(&plugin_temp, &plugin_dest) {
        let _ = fs::remove_dir_all(&temp_dir);
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to copy plugin: {}", e));
    }
    log::info!("[System] Installed plugin to: {:?}", plugin_dest);

    // Clean up temp directory
    let _ = fs::remove_dir_all(&temp_dir);

    log::info!("[System] Successfully installed plugin: {}", plugin_name);

    // Run discovery script to regenerate both plugins.json and backend generated.rs
    log::info!("[System] Running plugin discovery script...");
    let workspace_root = PathBuf::from("..");

    let discovery_script = workspace_root.join("scripts").join("discover-plugins.js");
    if discovery_script.exists() {
        match std::process::Command::new("bun")
            .arg("run")
            .arg(&discovery_script)
            .current_dir(&workspace_root)
            .output()
        {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                if output.status.success() {
                    log::info!("[System] Plugin discovery completed:");
                    if !stdout.is_empty() {
                        log::info!("{}", stdout);
                    }
                    log::info!("[System] Cargo watch will auto-rebuild the backend");
                } else {
                    log::warn!("[System] Plugin discovery error: {}", stderr);
                }
            }
            Err(e) => log::warn!("[System] Could not run plugin discovery: {}", e),
        }
    } else {
        log::warn!("[System] Plugin discovery script not found at {:?}", discovery_script);
    }

    json_response(&serde_json::json!({
        "success": true,
        "pluginName": plugin_name,
        "message": "Plugin installed successfully. The frontend will auto-reload to show the new plugin."
    }))
}

async fn handle_plugin_delete(path: String) -> Response<BoxBody<Bytes, Infallible>> {
    use std::fs;

    // Extract plugin name from path (format: "/plugins/plugin_name")
    let plugin_name = path.trim_start_matches('/').trim_start_matches("plugins/");

    if plugin_name.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Plugin name is required");
    }

    log::info!("[System] Removing plugin: {}", plugin_name);

    // Working directory is bridge/, so paths are relative to that
    let workspace_root = PathBuf::from("..");

    // Remove from unified plugins directory
    let plugin_path = workspace_root.join("plugins").join(plugin_name);
    if !plugin_path.exists() {
        return error_response(StatusCode::NOT_FOUND, &format!("Plugin '{}' not found", plugin_name));
    }

    match fs::remove_dir_all(&plugin_path) {
        Ok(_) => {
            log::info!("[System] Removed plugin from: {:?}", plugin_path);
        }
        Err(e) => {
            log::warn!("[System] Failed to remove plugin: {}", e);
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to remove plugin: {}", e));
        }
    }

    // Run discovery script to regenerate both plugins.json and backend generated.rs
    log::info!("[System] Running plugin discovery script...");

    let discovery_script = workspace_root.join("scripts").join("discover-plugins.js");
    if discovery_script.exists() {
        match std::process::Command::new("bun")
            .arg("run")
            .arg(&discovery_script)
            .current_dir(&workspace_root)
            .output()
        {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let stderr = String::from_utf8_lossy(&output.stderr);

                if output.status.success() {
                    log::info!("[System] Plugin discovery completed:");
                    if !stdout.is_empty() {
                        log::info!("{}", stdout);
                    }
                    log::info!("[System] Cargo watch will auto-rebuild the backend");
                } else {
                    log::warn!("[System] Plugin discovery error: {}", stderr);
                }
            }
            Err(e) => log::warn!("[System] Could not run plugin discovery: {}", e),
        }
    } else {
        log::warn!("[System] Plugin discovery script not found at {:?}", discovery_script);
    }

    log::info!("[System] Successfully removed plugin: {}", plugin_name);

    json_response(&serde_json::json!({
        "success": true,
        "pluginName": plugin_name,
        "message": "Plugin removed successfully. The frontend will auto-reload."
    }))
}

fn determine_plugin_name(archive: &mut ZipArchive<std::io::Cursor<Vec<u8>>>) -> Result<String, String> {
    // Look for the first directory in the zip
    for i in 0..archive.len() {
        let file = archive.by_index(i).map_err(|e| format!("Failed to read zip: {}", e))?;
        if let Some(path) = file.enclosed_name() {
            if let Some(first_component) = path.components().next() {
                if let Some(name) = first_component.as_os_str().to_str() {
                    if name != "." && name != ".." {
                        return Ok(name.to_string());
                    }
                }
            }
        }
    }
    Err("Could not determine plugin name from zip structure".to_string())
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    use std::fs;

    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

async fn handle_background_upload(req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
    use http_body_util::BodyExt;
    use multer::Multipart;
    use std::fs;
    use futures_util::stream;

    // Get the boundary from Content-Type header
    let content_type = match req.headers().get("content-type") {
        Some(ct) => match ct.to_str() {
            Ok(s) => s,
            Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid content-type header"),
        },
        None => return error_response(StatusCode::BAD_REQUEST, "Missing content-type header"),
    };

    let boundary = match multer::parse_boundary(content_type) {
        Ok(b) => b,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid multipart boundary"),
    };

    // Collect the body
    let body_bytes = match req.collect().await {
        Ok(collected) => collected.to_bytes(),
        Err(e) => return error_response(StatusCode::BAD_REQUEST, &format!("Failed to read body: {}", e)),
    };

    // Create a stream from the bytes
    let stream = stream::once(async move { Result::<_, std::io::Error>::Ok(body_bytes) });

    // Parse multipart
    let mut multipart = Multipart::new(stream, boundary);

    // Find the background file
    let mut file_data: Option<Vec<u8>> = None;
    let mut file_name: Option<String> = None;

    while let Some(field) = multipart.next_field().await.ok().flatten() {
        if field.name() == Some("background") {
            if let Some(fname) = field.file_name() {
                file_name = Some(fname.to_string());
            }
            match field.bytes().await {
                Ok(bytes) => {
                    file_data = Some(bytes.to_vec());
                    break;
                }
                Err(e) => return error_response(StatusCode::BAD_REQUEST, &format!("Failed to read file: {}", e)),
            }
        }
    }

    let file_data = match file_data {
        Some(data) => data,
        None => return error_response(StatusCode::BAD_REQUEST, "No background file found in request"),
    };

    let original_name = file_name.unwrap_or_else(|| "background".to_string());

    // Determine file extension
    let extension = std::path::Path::new(&original_name)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("bin");

    // Generate unique filename with timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let safe_name = format!("background_{}.{}", timestamp, extension);

    // Get AppData directory
    let backgrounds_dir = dirs::data_local_dir()
        .expect("Failed to get local data directory")
        .join("WebArcade")
        .join("backgrounds");

    // Create backgrounds directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&backgrounds_dir) {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to create backgrounds directory: {}", e));
    }

    // Save the file
    let file_path = backgrounds_dir.join(&safe_name);
    if let Err(e) = fs::write(&file_path, &file_data) {
        return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to save background file: {}", e));
    }

    log::info!("[System] Saved background file: {:?}", file_path);

    // Return the URL to access the file
    let file_url = format!("http://localhost:3001/system/background/{}", safe_name);

    json_response(&serde_json::json!({
        "success": true,
        "url": file_url,
        "filename": safe_name
    }))
}

async fn handle_serve_background(path: String) -> Response<BoxBody<Bytes, Infallible>> {
    use std::fs;

    // Extract filename from path (format: "/background/filename.ext")
    let filename = path.trim_start_matches('/').trim_start_matches("background/");

    if filename.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "Filename is required");
    }

    // Get AppData directory
    let backgrounds_dir = dirs::data_local_dir()
        .expect("Failed to get local data directory")
        .join("WebArcade")
        .join("backgrounds");

    let file_path = backgrounds_dir.join(filename);

    // Security: Ensure the file is within the backgrounds directory
    if !file_path.starts_with(&backgrounds_dir) {
        return error_response(StatusCode::FORBIDDEN, "Access denied");
    }

    if !file_path.exists() {
        return error_response(StatusCode::NOT_FOUND, "Background file not found");
    }

    match fs::read(&file_path) {
        Ok(content) => {
            // Determine content type based on extension
            let content_type = if filename.ends_with(".jpg") || filename.ends_with(".jpeg") {
                "image/jpeg"
            } else if filename.ends_with(".png") {
                "image/png"
            } else if filename.ends_with(".gif") {
                "image/gif"
            } else if filename.ends_with(".webp") {
                "image/webp"
            } else if filename.ends_with(".mp4") {
                "video/mp4"
            } else if filename.ends_with(".webm") {
                "video/webm"
            } else if filename.ends_with(".ogg") || filename.ends_with(".ogv") {
                "video/ogg"
            } else {
                "application/octet-stream"
            };

            Response::builder()
                .status(StatusCode::OK)
                .header("Content-Type", content_type)
                .header("Access-Control-Allow-Origin", "*")
                .header("Cache-Control", "public, max-age=31536000") // Cache for 1 year
                .body(BoxBody::new(Full::new(Bytes::from(content))))
                .unwrap()
        }
        Err(_) => error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to read background file")
    }
}

async fn handle_get_desktop_items() -> Response<BoxBody<Bytes, Infallible>> {
    use std::fs;

    // Get the Windows desktop folder path
    let desktop_path = match dirs::desktop_dir() {
        Some(path) => path,
        None => return error_response(StatusCode::INTERNAL_SERVER_ERROR, "Could not find desktop directory"),
    };

    let mut items = Vec::new();

    match fs::read_dir(&desktop_path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();

                // Skip hidden files (starting with .)
                if name.starts_with('.') {
                    continue;
                }

                let is_dir = path.is_dir();
                let extension = if is_dir {
                    None
                } else {
                    path.extension().and_then(|e| e.to_str()).map(|s| s.to_lowercase())
                };

                // Determine item type
                let item_type = if is_dir {
                    "folder".to_string()
                } else if let Some(ref ext) = extension {
                    match ext.as_str() {
                        "lnk" => "shortcut".to_string(),
                        "exe" => "executable".to_string(),
                        "url" => "url".to_string(),
                        _ => "file".to_string(),
                    }
                } else {
                    "file".to_string()
                };

                items.push(serde_json::json!({
                    "name": name,
                    "path": path.to_string_lossy().to_string(),
                    "type": item_type,
                    "is_dir": is_dir,
                    "extension": extension,
                }));
            }
        }
        Err(e) => return error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to read desktop directory: {}", e)),
    }

    json_response(&serde_json::json!({
        "desktop_path": desktop_path.to_string_lossy().to_string(),
        "items": items
    }))
}

async fn handle_open_path(req: Request<Incoming>) -> Response<BoxBody<Bytes, Infallible>> {
    match read_json_body(req).await {
        Ok(body) => {
            let path = match body.get("path").and_then(|v| v.as_str()) {
                Some(p) => p,
                None => return error_response(StatusCode::BAD_REQUEST, "Missing path parameter"),
            };

            // Use the system's default handler to open the path
            #[cfg(target_os = "windows")]
            {
                match std::process::Command::new("explorer")
                    .arg(path)
                    .spawn()
                {
                    Ok(_) => json_response(&serde_json::json!({
                        "success": true,
                        "message": format!("Opened: {}", path)
                    })),
                    Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to open path: {}", e)),
                }
            }

            #[cfg(not(target_os = "windows"))]
            {
                error_response(StatusCode::NOT_IMPLEMENTED, "This feature is only available on Windows")
            }
        }
        Err(e) => error_response(StatusCode::BAD_REQUEST, &e),
    }
}

// Helper functions are now imported from router_utils
