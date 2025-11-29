//! Plugin Builder Module
//!
//! This module provides build functionality for WebArcade plugins.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildProgress {
    pub step: String,
    pub progress: f32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildLog {
    pub log_type: String,
    pub message: String,
    pub step: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub logs: Vec<BuildLog>,
}

/// Callback type for real-time build log streaming
pub type LogCallback = Arc<dyn Fn(BuildLog) + Send + Sync>;

pub struct PluginBuilder {
    plugin_dir: PathBuf,
    plugin_id: String,
    build_dir: PathBuf,
    project_root: PathBuf,
    log_callback: Option<LogCallback>,
}

impl PluginBuilder {
    pub fn new(plugin_id: &str) -> Result<Self> {
        // Get project root - try executable location first, fall back to current dir
        let project_root = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        // Check for plugin in AppData/Local/WebArcade/projects
        let appdata_dir = dirs::data_local_dir()
            .or_else(|| dirs::data_dir())
            .expect("Could not determine data directory");

        let webarcade_dir = appdata_dir.join("WebArcade");
        let plugin_dir = webarcade_dir.join("projects").join(plugin_id);

        if !plugin_dir.exists() {
            anyhow::bail!("Plugin directory does not exist: {:?}", plugin_dir);
        }

        // Build directory goes to AppData as well (works in both dev and production)
        let build_dir = webarcade_dir.join("build").join(plugin_id);
        fs::create_dir_all(&build_dir)?;

        Ok(Self {
            plugin_dir,
            plugin_id: plugin_id.to_string(),
            build_dir,
            project_root,
            log_callback: None,
        })
    }

    /// Set a callback to receive build logs in real-time
    pub fn with_callback(mut self, callback: LogCallback) -> Self {
        self.log_callback = Some(callback);
        self
    }

    /// Emit a log entry - pushes to logs vec and calls callback if set
    fn emit_log(&self, logs: &mut Vec<BuildLog>, log: BuildLog) {
        if let Some(ref callback) = self.log_callback {
            callback(log.clone());
        }
        logs.push(log);
    }

    pub fn build(&self) -> BuildResult {
        let mut logs: Vec<BuildLog> = Vec::new();

        // Auto-detect plugin type
        let has_backend = self.plugin_dir.join("mod.rs").exists()
            || self.plugin_dir.join("Cargo.toml").exists();
        let has_frontend = self.plugin_dir.join("index.jsx").exists()
            || self.plugin_dir.join("index.js").exists();

        self.emit_log(&mut logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Building plugin: {} (backend: {}, frontend: {})",
                self.plugin_id, has_backend, has_frontend),
            step: Some("init".to_string()),
        });

        // Clean build directory
        if self.build_dir.exists() {
            if let Err(e) = fs::remove_dir_all(&self.build_dir) {
                self.emit_log(&mut logs, BuildLog {
                    log_type: "warning".to_string(),
                    message: format!("Failed to clean build directory: {}", e),
                    step: Some("prepare".to_string()),
                });
            }
        }
        if let Err(e) = fs::create_dir_all(&self.build_dir) {
            self.emit_log(&mut logs, BuildLog {
                log_type: "error".to_string(),
                message: format!("Failed to create build directory: {}", e),
                step: Some("prepare".to_string()),
            });
            return BuildResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to create build directory: {}", e)),
                logs,
            };
        }

        // Build backend if present
        if has_backend {
            self.emit_log(&mut logs, BuildLog {
                log_type: "info".to_string(),
                message: "Setting up Rust backend...".to_string(),
                step: Some("backend_setup".to_string()),
            });

            if let Err(e) = self.setup_backend_build(&mut logs) {
                self.emit_log(&mut logs, BuildLog {
                    log_type: "error".to_string(),
                    message: format!("Backend setup failed: {}", e),
                    step: Some("backend_setup".to_string()),
                });
                return BuildResult {
                    success: false,
                    output_path: None,
                    error: Some(format!("Backend setup failed: {}", e)),
                    logs,
                };
            }

            self.emit_log(&mut logs, BuildLog {
                log_type: "info".to_string(),
                message: "Compiling Rust backend...".to_string(),
                step: Some("backend_compile".to_string()),
            });

            if let Err(e) = self.compile_backend(&mut logs) {
                self.emit_log(&mut logs, BuildLog {
                    log_type: "error".to_string(),
                    message: format!("Cargo build failed: {}", e),
                    step: Some("backend_compile".to_string()),
                });
                return BuildResult {
                    success: false,
                    output_path: None,
                    error: Some(format!("Cargo build failed: {}", e)),
                    logs,
                };
            }
        }

        // Bundle frontend if present
        if has_frontend {
            self.emit_log(&mut logs, BuildLog {
                log_type: "info".to_string(),
                message: "Bundling frontend...".to_string(),
                step: Some("frontend_bundle".to_string()),
            });

            if let Err(e) = self.bundle_frontend(&mut logs) {
                self.emit_log(&mut logs, BuildLog {
                    log_type: "error".to_string(),
                    message: format!("Frontend bundling failed: {}", e),
                    step: Some("frontend_bundle".to_string()),
                });
                return BuildResult {
                    success: false,
                    output_path: None,
                    error: Some(format!("Frontend bundling failed: {}", e)),
                    logs,
                };
            }
        }

        // Create package
        self.emit_log(&mut logs, BuildLog {
            log_type: "info".to_string(),
            message: "Creating distribution package...".to_string(),
            step: Some("packaging".to_string()),
        });

        match self.create_package(&mut logs) {
            Ok(zip_path) => {
                // Install the plugin to the plugins directory
                self.emit_log(&mut logs, BuildLog {
                    log_type: "info".to_string(),
                    message: "Installing plugin...".to_string(),
                    step: Some("install".to_string()),
                });

                if let Err(e) = self.install_plugin(&mut logs) {
                    self.emit_log(&mut logs, BuildLog {
                        log_type: "warning".to_string(),
                        message: format!("Plugin installation warning: {}", e),
                        step: Some("install".to_string()),
                    });
                }

                self.emit_log(&mut logs, BuildLog {
                    log_type: "success".to_string(),
                    message: format!("Build complete: {}", zip_path),
                    step: Some("complete".to_string()),
                });

                BuildResult {
                    success: true,
                    output_path: Some(zip_path),
                    error: None,
                    logs,
                }
            }
            Err(e) => {
                self.emit_log(&mut logs, BuildLog {
                    log_type: "error".to_string(),
                    message: format!("Packaging failed: {}", e),
                    step: Some("packaging".to_string()),
                });
                BuildResult {
                    success: false,
                    output_path: None,
                    error: Some(format!("Packaging failed: {}", e)),
                    logs,
                }
            },
        }
    }

    fn install_plugin(&self, logs: &mut Vec<BuildLog>) -> Result<()> {
        // Get the plugins directory
        let plugins_dir = dirs::data_local_dir()
            .ok_or_else(|| anyhow::anyhow!("Failed to get local data directory"))?
            .join("WebArcade")
            .join("plugins")
            .join(&self.plugin_id);

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Installing to: {}", plugins_dir.to_string_lossy()),
            step: Some("install".to_string()),
        });

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Copying from: {}", self.build_dir.to_string_lossy()),
            step: Some("install".to_string()),
        });

        // Create the plugin directory if it doesn't exist
        fs::create_dir_all(&plugins_dir)?;

        // Copy all files from build_dir to plugins_dir
        let mut files_copied = 0;
        for entry in fs::read_dir(&self.build_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                let file_name = entry.file_name();
                let dest_path = plugins_dir.join(&file_name);
                fs::copy(&path, &dest_path)?;
                files_copied += 1;
                self.emit_log(logs, BuildLog {
                    log_type: "info".to_string(),
                    message: format!("Copied: {} -> {}", file_name.to_string_lossy(), dest_path.to_string_lossy()),
                    step: Some("install".to_string()),
                });
            }
        }

        // Always create/update package.json with route info
        let dest_package_json = plugins_dir.join("package.json");
        let package_json = self.create_package_json()?;
        fs::write(&dest_package_json, &package_json)?;
        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: "Created: package.json with routes".to_string(),
            step: Some("install".to_string()),
        });

        self.emit_log(logs, BuildLog {
            log_type: "success".to_string(),
            message: format!("Plugin installed: {} files copied to {}", files_copied, plugins_dir.to_string_lossy()),
            step: Some("install".to_string()),
        });

        Ok(())
    }

    fn setup_backend_build(&self, logs: &mut Vec<BuildLog>) -> Result<()> {
        let rust_build_dir = self.build_dir.join("rust_build");
        fs::create_dir_all(&rust_build_dir)?;

        // Copy Rust source files
        self.copy_rust_files(&self.plugin_dir, &rust_build_dir, logs)?;

        // Find the API crate - try multiple locations
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));

        let possible_api_paths: Vec<PathBuf> = [
            // Dev mode: src-tauri/api (when running from src-tauri)
            Some(std::env::current_dir().unwrap_or_default().join("api")),
            // Dev mode: when project_root is src-tauri
            Some(self.project_root.join("api")),
            // Production: bundled api crate next to exe
            exe_dir.as_ref().map(|p| p.join("api")),
            // Production: in resources
            exe_dir.as_ref().map(|p| p.join("resources").join("api")),
            // Dev mode: navigate up from target/release or target/debug
            exe_dir.as_ref().and_then(|p| {
                // If exe is in target/release or target/debug, go up to src-tauri
                if p.ends_with("release") || p.ends_with("debug") {
                    p.parent() // target
                        .and_then(|p| p.parent()) // src-tauri
                        .map(|p| p.join("api"))
                } else {
                    None
                }
            }),
        ]
        .into_iter()
        .flatten()
        .collect();

        let api_path = possible_api_paths
            .iter()
            .find(|p| p.join("Cargo.toml").exists())
            .cloned()
            .ok_or_else(|| {
                let checked: Vec<_> = possible_api_paths.iter().map(|p| p.display().to_string()).collect();
                anyhow::anyhow!("Could not find API crate. Checked: {:?}", checked)
            })?;

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Using API crate at: {}", api_path.display()),
            step: Some("backend_setup".to_string()),
        });

        let api_path_str = api_path.to_string_lossy().replace("\\", "/");

        let plugin_cargo_toml = self.plugin_dir.join("Cargo.toml");
        let cargo_toml = if plugin_cargo_toml.exists() {
            let mut content = fs::read_to_string(&plugin_cargo_toml)?;

            // Inject API dependency path
            let re = regex::Regex::new(r#"api\s*=\s*\{[^}]*path\s*=\s*"[^"]*"[^}]*\}"#).unwrap();
            content = if re.is_match(&content) {
                re.replace(&content, format!("api = {{ path = \"{}\" }}", api_path_str)).to_string()
            } else {
                // Add api dependency
                let deps_re = regex::Regex::new(r"(?m)^\[dependencies\]\s*$").unwrap();
                if let Some(mat) = deps_re.find(&content) {
                    let insert_pos = mat.end();
                    let mut new_content = content.clone();
                    new_content.insert_str(insert_pos, &format!("\napi = {{ path = \"{}\" }}", api_path_str));
                    new_content
                } else {
                    format!("{}\n[dependencies]\napi = {{ path = \"{}\" }}\n", content, api_path_str)
                }
            };

            // Ensure [lib] section
            let lib_section_re = regex::Regex::new(r"(?m)\n?\[lib\][^\[]*").unwrap();
            content = lib_section_re.replace(&content, "").to_string();

            let package_re = regex::Regex::new(r"(?m)(\[package\][^\[]+)").unwrap();
            if let Some(mat) = package_re.find(&content) {
                let insert_pos = mat.end();
                content.insert_str(insert_pos, "\n[lib]\ncrate-type = [\"cdylib\"]\npath = \"lib.rs\"\n");
            }

            content
        } else {
            format!(
                r#"[package]
name = "{}"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]
path = "lib.rs"

[dependencies]
api = {{ path = "{}" }}

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
"#,
                self.plugin_id, api_path_str
            )
        };

        fs::write(rust_build_dir.join("Cargo.toml"), cargo_toml)?;

        // Create .cargo/config.toml for linker flags
        let cargo_config_dir = rust_build_dir.join(".cargo");
        fs::create_dir_all(&cargo_config_dir)?;
        let cargo_config = r#"[target.x86_64-pc-windows-msvc]
rustflags = ["-C", "link-args=/FORCE:UNRESOLVED"]

[target.x86_64-unknown-linux-gnu]
rustflags = ["-C", "link-args=-Wl,--allow-shlib-undefined"]

[target.x86_64-apple-darwin]
rustflags = ["-C", "link-args=-undefined dynamic_lookup"]

[target.aarch64-apple-darwin]
rustflags = ["-C", "link-args=-undefined dynamic_lookup"]
"#;
        fs::write(cargo_config_dir.join("config.toml"), cargo_config)?;

        // Generate lib.rs with FFI wrappers
        self.create_lib_rs(&rust_build_dir, logs)?;

        Ok(())
    }

    fn copy_rust_files(&self, src: &Path, dst: &Path, logs: &mut Vec<BuildLog>) -> Result<()> {
        let plugin_mod_dir = dst.join("plugin_mod");
        fs::create_dir_all(&plugin_mod_dir)?;

        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "rs" {
                        let dest_path = plugin_mod_dir.join(&file_name);
                        let content = fs::read_to_string(&path)?;

                        let modified_content = if file_name_str == "mod.rs" {
                            if content.contains("pub mod router;") {
                                content
                            } else {
                                content.replace("mod router;", "pub mod router;")
                            }
                        } else if file_name_str == "router.rs" {
                            let re = regex::Regex::new(r"(?m)^async fn ([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\) -> HttpResponse").unwrap();
                            re.replace_all(&content, "pub async fn $1($2) -> HttpResponse").to_string()
                        } else {
                            content
                        };

                        fs::write(&dest_path, modified_content)?;
                        self.emit_log(logs, BuildLog {
                            log_type: "info".to_string(),
                            message: format!("Copied: {}", file_name_str),
                            step: Some("backend_setup".to_string()),
                        });
                    }
                }
            }
        }

        Ok(())
    }

    fn create_lib_rs(&self, rust_build_dir: &Path, logs: &mut Vec<BuildLog>) -> Result<()> {
        let handlers = self.extract_handlers()?;
        let plugin_struct = self.get_plugin_struct_name();

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Found {} route handlers", handlers.len()),
            step: Some("backend_setup".to_string()),
        });

        let handler_wrappers = handlers.iter().map(|(handler_name, takes_request)| {
            // Generate the appropriate handler call based on whether it takes a request
            let handler_call = if *takes_request {
                format!("plugin_mod::router::{}(http_request.clone()).await", handler_name)
            } else {
                format!("plugin_mod::router::{}().await", handler_name)
            };

            format!(r##"
#[no_mangle]
pub extern "C" fn {handler_name}(request_ptr: *const u8, request_len: usize, runtime_ptr: *const ()) -> *const u8 {{
    use std::panic;
    use std::ffi::CString;
    use api::ffi_http::Response as FFIResponse;
    use api::http::HttpRequest;
    use api::tokio::runtime::Runtime;

    let result = panic::catch_unwind(|| {{
        // Parse request (even if handler doesn't use it, we validate the FFI)
        let _http_request = match HttpRequest::from_ffi_json(request_ptr, request_len) {{
            Ok(r) => r,
            Err(e) => {{
                let error_response = FFIResponse::new(400)
                    .json(&api::serde_json::json!({{"error": e}}));
                return error_response.into_ffi_ptr();
            }}
        }};
        #[allow(unused_variables)]
        let http_request = _http_request;

        let runtime = unsafe {{ &*(runtime_ptr as *const Runtime) }};
        runtime.block_on(async {{
            let handler_result = {handler_call};
            let response = handler_result;

            let (parts, body) = response.into_parts();
            let status = parts.status.as_u16();

            let mut headers = std::collections::HashMap::new();
            for (key, value) in parts.headers.iter() {{
                if let Ok(v) = value.to_str() {{
                    headers.insert(key.to_string(), v.to_string());
                }}
            }}

            let body_bytes = body.to_vec();

            let mut ffi_response = FFIResponse::new(status);
            ffi_response.headers = headers.clone();

            let content_type = headers.get("content-type")
                .or_else(|| headers.get("Content-Type"))
                .cloned()
                .unwrap_or_default()
                .to_lowercase();

            let is_binary = content_type.starts_with("image/")
                || content_type.starts_with("application/octet-stream");

            if is_binary {{
                use api::base64::Engine;
                ffi_response.body_base64 = Some(
                    api::base64::engine::general_purpose::STANDARD.encode(&body_bytes)
                );
            }} else if let Ok(body_str) = String::from_utf8(body_bytes.clone()) {{
                if let Ok(json_value) = api::serde_json::from_str::<api::serde_json::Value>(&body_str) {{
                    ffi_response.body = Some(json_value);
                }} else {{
                    ffi_response.body = Some(api::serde_json::Value::String(body_str));
                }}
            }} else {{
                use api::base64::Engine;
                ffi_response.body_base64 = Some(
                    api::base64::engine::general_purpose::STANDARD.encode(&body_bytes)
                );
            }}

            ffi_response.into_ffi_ptr()
        }})
    }});

    match result {{
        Ok(ptr) => ptr,
        Err(_) => {{
            let error = CString::new(r#"{{"__ffi_response__":true,"status":500,"headers":{{"Content-Type":"application/json"}},"body":{{"error":"Handler panicked"}}}}"#).unwrap();
            Box::leak(Box::new(error)).as_ptr() as *const u8
        }}
    }}
}}
"##)
        }).collect::<Vec<_>>().join("\n");

        let lib_content = format!(r#"// Auto-generated plugin library
pub mod plugin_mod;
pub use plugin_mod::*;
pub use api::ffi_http::free_string;

#[no_mangle]
pub extern "C" fn plugin_init(_ffi_ctx: *const ()) -> i32 {{ 0 }}

#[no_mangle]
pub extern "C" fn plugin_start(_ffi_ctx: *const ()) -> i32 {{ 0 }}

#[no_mangle]
pub extern "C" fn plugin_stop() -> i32 {{ 0 }}

#[no_mangle]
pub extern "C" fn plugin_metadata() -> *const u8 {{
    use api::{{Plugin, serde_json}};
    let plugin = plugin_mod::{};
    let metadata = plugin.metadata();
    let json = serde_json::to_string(&metadata).unwrap_or_default();
    Box::leak(Box::new(json)).as_ptr() as *const u8
}}

{}
"#, plugin_struct, handler_wrappers);

        fs::write(rust_build_dir.join("lib.rs"), lib_content)?;
        Ok(())
    }

    fn extract_handlers(&self) -> Result<Vec<(String, bool)>> {
        let mut handlers: Vec<(String, bool)> = Vec::new();

        // Check Cargo.toml for routes
        let cargo_toml_path = self.plugin_dir.join("Cargo.toml");
        if cargo_toml_path.exists() {
            let cargo_content = fs::read_to_string(&cargo_toml_path)?;
            if let Ok(cargo_toml) = cargo_content.parse::<toml::Value>() {
                if let Some(routes_table) = cargo_toml.get("routes").and_then(|r| r.as_table()) {
                    for (_, value) in routes_table {
                        if let Some(handler) = value.as_str() {
                            if !handlers.iter().any(|(h, _)| h == handler) {
                                handlers.push((handler.to_string(), false));
                            }
                        }
                    }
                }
            }
        }

        // Parse router.rs to detect handler signatures
        let router_path = self.plugin_dir.join("router.rs");
        if router_path.exists() {
            let router_content = fs::read_to_string(&router_path)?;

            // Update handlers with whether they take HttpRequest
            for (handler_name, takes_request) in handlers.iter_mut() {
                // Look for function signature pattern
                // Match: pub async fn handler_name(req: HttpRequest) or similar
                let pattern = format!(r"(?m)^pub\s+async\s+fn\s+{}\s*\(([^)]*)\)", regex::escape(handler_name));
                if let Ok(re) = regex::Regex::new(&pattern) {
                    if let Some(captures) = re.captures(&router_content) {
                        if let Some(params) = captures.get(1) {
                            let params_str = params.as_str().trim();
                            // Check if it has any parameters (non-empty and not just whitespace)
                            *takes_request = !params_str.is_empty() &&
                                (params_str.contains("HttpRequest") ||
                                 params_str.contains("Request") ||
                                 params_str.contains(":"));
                        }
                    }
                }
            }
        }

        Ok(handlers)
    }

    fn get_plugin_struct_name(&self) -> String {
        let parts: Vec<&str> = self.plugin_id.split(|c| c == '_' || c == '-').collect();
        let mut name = String::new();
        for part in parts {
            let mut chars = part.chars();
            if let Some(first) = chars.next() {
                name.push(first.to_uppercase().next().unwrap());
                name.push_str(chars.as_str());
            }
        }
        name.push_str("Plugin");
        name
    }

    fn compile_backend(&self, logs: &mut Vec<BuildLog>) -> Result<()> {
        let rust_build_dir = self.build_dir.join("rust_build");

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: "Running: cargo build --release --lib".to_string(),
            step: Some("cargo".to_string()),
        });

        let mut cmd = Command::new("cargo");
        cmd.current_dir(&rust_build_dir)
            .args(&["build", "--release", "--lib"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let mut child = cmd.spawn().context("Failed to spawn cargo build")?;

        use std::io::BufRead;
        use std::sync::mpsc;

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        let (tx, rx) = mpsc::channel::<(String, bool)>();
        let mut handles = vec![];

        if let Some(stdout) = stdout {
            let tx = tx.clone();
            handles.push(std::thread::spawn(move || {
                let reader = std::io::BufReader::new(stdout);
                for line in reader.lines().flatten() {
                    let _ = tx.send((line, false));
                }
            }));
        }

        if let Some(stderr) = stderr {
            let tx = tx.clone();
            handles.push(std::thread::spawn(move || {
                let reader = std::io::BufReader::new(stderr);
                for line in reader.lines().flatten() {
                    let _ = tx.send((line, true));
                }
            }));
        }

        drop(tx);

        for (msg, is_stderr) in rx {
            let log_type = if is_stderr {
                if msg.contains("error") || msg.contains("Error") { "error" }
                else if msg.contains("warning") || msg.contains("Warning") { "warning" }
                else { "info" }
            } else { "info" };

            self.emit_log(logs, BuildLog {
                log_type: log_type.to_string(),
                message: msg,
                step: Some("cargo".to_string()),
            });
        }

        for handle in handles {
            let _ = handle.join();
        }

        let status = child.wait().context("Failed to wait for cargo build")?;

        if !status.success() {
            anyhow::bail!("Cargo build failed - see logs for details");
        }

        // Copy compiled binary
        self.copy_compiled_binary(&rust_build_dir, logs)?;

        self.emit_log(logs, BuildLog {
            log_type: "success".to_string(),
            message: "Rust compilation successful!".to_string(),
            step: Some("backend_compile".to_string()),
        });

        Ok(())
    }

    fn copy_compiled_binary(&self, rust_build_dir: &Path, logs: &mut Vec<BuildLog>) -> Result<()> {
        let target_dir = rust_build_dir.join("target").join("release");

        let lib_name = if cfg!(target_os = "windows") {
            format!("{}.dll", self.plugin_id)
        } else if cfg!(target_os = "macos") {
            format!("lib{}.dylib", self.plugin_id)
        } else {
            format!("lib{}.so", self.plugin_id)
        };

        let src_path = target_dir.join(&lib_name);
        if src_path.exists() {
            let dest_path = self.build_dir.join(&lib_name);
            fs::copy(&src_path, &dest_path)?;
            self.emit_log(logs, BuildLog {
                log_type: "info".to_string(),
                message: format!("Copied: {}", lib_name),
                step: Some("backend_compile".to_string()),
            });
            Ok(())
        } else {
            anyhow::bail!("Could not find compiled library: {:?}", src_path)
        }
    }

    fn bundle_frontend(&self, logs: &mut Vec<BuildLog>) -> Result<()> {
        let has_frontend = self.plugin_dir.join("index.jsx").exists()
            || self.plugin_dir.join("index.js").exists();

        if !has_frontend {
            self.emit_log(logs, BuildLog {
                log_type: "info".to_string(),
                message: "No frontend files found, skipping".to_string(),
                step: Some("frontend_bundle".to_string()),
            });
            return Ok(());
        }

        // Install plugin's npm dependencies if needed
        self.install_npm_dependencies(logs)?;

        // Try to find bundler script in various locations
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));

        let possible_paths: Vec<PathBuf> = [
            // Production: bundled as Tauri resource (Windows)
            exe_dir.as_ref().map(|p| p.join("builder").join("scripts")),
            // Production: bundled as Tauri resource (macOS .app bundle)
            exe_dir.as_ref().map(|p| p.join("../Resources/builder/scripts")),
            // Dev mode: src-tauri/builder/scripts
            Some(self.project_root.join("builder").join("scripts")),
            // Dev mode: navigate up from target/release or target/debug
            exe_dir.as_ref().and_then(|p| {
                if p.ends_with("release") || p.ends_with("debug") {
                    p.parent() // target
                        .and_then(|p| p.parent()) // src-tauri
                        .map(|p| p.join("builder").join("scripts"))
                } else {
                    None
                }
            }),
        ]
        .into_iter()
        .flatten()
        .collect();

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Searching for bundler in {} locations", possible_paths.len()),
            step: Some("frontend_bundle".to_string()),
        });

        let bundler_dir = possible_paths
            .iter()
            .find(|p| p.join("build_plugin.js").exists())
            .cloned();

        let bundler_dir = match bundler_dir {
            Some(path) => {
                self.emit_log(logs, BuildLog {
                    log_type: "info".to_string(),
                    message: format!("Found bundler at: {}", path.display()),
                    step: Some("frontend_bundle".to_string()),
                });
                path
            }
            None => {
                self.emit_log(logs, BuildLog {
                    log_type: "warning".to_string(),
                    message: "Frontend bundler not found - skipping frontend build.".to_string(),
                    step: Some("frontend_bundle".to_string()),
                });
                for path in &possible_paths {
                    self.emit_log(logs, BuildLog {
                        log_type: "info".to_string(),
                        message: format!("  Checked: {}", path.display()),
                        step: Some("frontend_bundle".to_string()),
                    });
                }
                return Ok(());
            }
        };

        // Ensure bundler dependencies are installed
        self.ensure_bundler_dependencies(&bundler_dir, logs)?;

        let bundler_script = bundler_dir.join("build_plugin.js");
        let plugin_dir_str = self.plugin_dir.to_string_lossy();
        let build_dir_str = self.build_dir.to_string_lossy();

        let output = if Command::new("bun").arg("--version").output().is_ok() {
            self.emit_log(logs, BuildLog {
                log_type: "info".to_string(),
                message: "Using bun to bundle frontend".to_string(),
                step: Some("bundler".to_string()),
            });
            Command::new("bun")
                .arg("run")
                .arg(&bundler_script)
                .arg(&*plugin_dir_str)
                .arg(&*build_dir_str)
                .current_dir(&bundler_dir)
                .output()
                .context("Failed to execute bundler with bun")?
        } else {
            self.emit_log(logs, BuildLog {
                log_type: "info".to_string(),
                message: "Using node to bundle frontend".to_string(),
                step: Some("bundler".to_string()),
            });
            Command::new("node")
                .arg(&bundler_script)
                .arg(&*plugin_dir_str)
                .arg(&*build_dir_str)
                .current_dir(&bundler_dir)
                .output()
                .context("Failed to execute bundler with node")?
        };

        // Log output
        for line in String::from_utf8_lossy(&output.stdout).lines() {
            if !line.trim().is_empty() {
                self.emit_log(logs, BuildLog {
                    log_type: "info".to_string(),
                    message: line.to_string(),
                    step: Some("bundler".to_string()),
                });
            }
        }

        for line in String::from_utf8_lossy(&output.stderr).lines() {
            if !line.trim().is_empty() {
                let log_type = if line.contains("error") { "error" } else { "info" };
                self.emit_log(logs, BuildLog {
                    log_type: log_type.to_string(),
                    message: line.to_string(),
                    step: Some("bundler".to_string()),
                });
            }
        }

        if !output.status.success() {
            anyhow::bail!("Frontend bundling failed");
        }

        self.emit_log(logs, BuildLog {
            log_type: "success".to_string(),
            message: "Frontend bundling successful!".to_string(),
            step: Some("frontend_bundle".to_string()),
        });

        Ok(())
    }

    fn ensure_bundler_dependencies(&self, _bundler_dir: &Path, _logs: &mut Vec<BuildLog>) -> Result<()> {
        // In dev mode, the bundler uses the main project's node_modules
        // No separate installation needed
        Ok(())
    }

    fn install_npm_dependencies(&self, logs: &mut Vec<BuildLog>) -> Result<()> {
        let package_json_path = self.plugin_dir.join("package.json");
        if !package_json_path.exists() {
            return Ok(());
        }

        let content = fs::read_to_string(&package_json_path)?;
        let json: serde_json::Value = serde_json::from_str(&content)?;

        let has_deps = json.get("dependencies").and_then(|d| d.as_object()).map(|o| !o.is_empty()).unwrap_or(false);
        let has_dev_deps = json.get("devDependencies").and_then(|d| d.as_object()).map(|o| !o.is_empty()).unwrap_or(false);

        if !has_deps && !has_dev_deps {
            return Ok(());
        }

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: "Installing npm dependencies...".to_string(),
            step: Some("npm".to_string()),
        });

        let output = if Command::new("bun").arg("--version").output().is_ok() {
            Command::new("bun").arg("install").current_dir(&self.plugin_dir).output()
        } else {
            Command::new("npm").arg("install").current_dir(&self.plugin_dir).output()
        };

        if let Ok(output) = output {
            if output.status.success() {
                self.emit_log(logs, BuildLog {
                    log_type: "success".to_string(),
                    message: "Dependencies installed".to_string(),
                    step: Some("npm".to_string()),
                });
            }
        }

        Ok(())
    }

    fn create_package(&self, logs: &mut Vec<BuildLog>) -> Result<String> {
        use zip::write::SimpleFileOptions;
        use zip::ZipWriter;

        // Put zip files in AppData/Local/WebArcade/dist
        let appdata_dir = dirs::data_local_dir()
            .or_else(|| dirs::data_dir())
            .expect("Could not determine data directory");
        let dist_root = appdata_dir.join("WebArcade").join("dist");
        fs::create_dir_all(&dist_root)?;

        let zip_path = dist_root.join(format!("{}.zip", self.plugin_id));
        let zip_file = fs::File::create(&zip_path)?;
        let mut zip = ZipWriter::new(zip_file);
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        // Add build output files
        for entry in fs::read_dir(&self.build_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_file() {
                let file_name = entry.file_name();
                zip.start_file(file_name.to_string_lossy().as_ref(), options)?;
                let content = fs::read(&path)?;
                zip.write_all(&content)?;
            }
        }

        // Create/update package.json
        let package_json = self.create_package_json()?;
        zip.start_file("package.json", options)?;
        zip.write_all(package_json.as_bytes())?;

        zip.finish()?;

        self.emit_log(logs, BuildLog {
            log_type: "info".to_string(),
            message: format!("Created: {}", zip_path.to_string_lossy()),
            step: Some("packaging".to_string()),
        });

        Ok(zip_path.to_string_lossy().to_string())
    }

    fn create_package_json(&self) -> Result<String> {
        let package_json_path = self.plugin_dir.join("package.json");

        let mut package_json = if package_json_path.exists() {
            let content = fs::read_to_string(&package_json_path)?;
            serde_json::from_str::<serde_json::Value>(&content)?
        } else {
            serde_json::json!({
                "name": self.plugin_id,
                "version": "1.0.0"
            })
        };

        // Extract routes from Cargo.toml
        let routes = self.extract_routes()?;

        package_json["webarcade"] = serde_json::json!({
            "id": self.plugin_id,
            "routes": routes
        });

        Ok(serde_json::to_string_pretty(&package_json)?)
    }

    fn extract_routes(&self) -> Result<Vec<serde_json::Value>> {
        let mut routes = Vec::new();

        let cargo_toml_path = self.plugin_dir.join("Cargo.toml");
        if cargo_toml_path.exists() {
            let cargo_content = fs::read_to_string(&cargo_toml_path)?;
            if let Ok(cargo_toml) = cargo_content.parse::<toml::Value>() {
                if let Some(routes_table) = cargo_toml.get("routes").and_then(|r| r.as_table()) {
                    for (key, value) in routes_table {
                        if let Some(handler) = value.as_str() {
                            let parts: Vec<&str> = key.splitn(2, ' ').collect();
                            if parts.len() == 2 {
                                routes.push(serde_json::json!({
                                    "method": parts[0],
                                    "path": parts[1],
                                    "handler": handler
                                }));
                            }
                        }
                    }
                }
            }
        }

        Ok(routes)
    }
}

/// Build a plugin by ID - called from HTTP endpoint or Tauri command
pub fn build_plugin(plugin_id: &str) -> BuildResult {
    match PluginBuilder::new(plugin_id) {
        Ok(builder) => builder.build(),
        Err(e) => BuildResult {
            success: false,
            output_path: None,
            error: Some(format!("Failed to initialize builder: {}", e)),
            logs: vec![BuildLog {
                log_type: "error".to_string(),
                message: format!("Failed to initialize builder: {}", e),
                step: Some("init".to_string()),
            }],
        },
    }
}

/// Build a plugin by ID with a callback for real-time log streaming
pub fn build_plugin_with_callback(plugin_id: &str, callback: LogCallback) -> BuildResult {
    match PluginBuilder::new(plugin_id) {
        Ok(builder) => builder.with_callback(callback).build(),
        Err(e) => {
            // Call callback with the error
            callback(BuildLog {
                log_type: "error".to_string(),
                message: format!("Failed to initialize builder: {}", e),
                step: Some("init".to_string()),
            });
            BuildResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to initialize builder: {}", e)),
                logs: vec![BuildLog {
                    log_type: "error".to_string(),
                    message: format!("Failed to initialize builder: {}", e),
                    step: Some("init".to_string()),
                }],
            }
        },
    }
}
