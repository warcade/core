//! Developer API Module
//!
//! Provides HTTP endpoints for the Developer IDE:
//! - List plugins in projects folder
//! - Read/write plugin files
//! - Create new plugins

use hyper::{Response, StatusCode};
use http_body_util::{Full, combinators::BoxBody, BodyExt};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::convert::Infallible;

fn full_body(s: &str) -> BoxBody<Bytes, Infallible> {
    Full::new(Bytes::from(s.to_string()))
        .map_err(|_: Infallible| unreachable!())
        .boxed()
}

fn json_response(status: StatusCode, body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(full_body(body))
        .unwrap()
}

fn get_projects_dir() -> Option<PathBuf> {
    dirs::data_local_dir()
        .map(|d| d.join("WebArcade").join("projects"))
}

#[derive(Serialize)]
struct PluginInfo {
    id: String,
    name: String,
    has_backend: bool,
    has_frontend: bool,
}

/// GET /developer/plugins - List all plugins in projects folder
pub fn handle_list_plugins() -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    if !projects_dir.exists() {
        if let Err(e) = fs::create_dir_all(&projects_dir) {
            return json_response(StatusCode::INTERNAL_SERVER_ERROR,
                &format!(r#"{{"error":"Failed to create projects directory: {}"}}"#, e));
        }
    }

    let mut plugins = Vec::new();

    if let Ok(entries) = fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let id = entry.file_name().to_string_lossy().to_string();
                let has_backend = path.join("mod.rs").exists() || path.join("Cargo.toml").exists();
                let has_frontend = path.join("index.jsx").exists() || path.join("index.js").exists();

                // Try to get name from package.json or Cargo.toml
                let name = get_plugin_name(&path).unwrap_or_else(|| id.clone());

                plugins.push(PluginInfo {
                    id,
                    name,
                    has_backend,
                    has_frontend,
                });
            }
        }
    }

    let json = serde_json::to_string(&plugins).unwrap_or_else(|_| "[]".to_string());
    json_response(StatusCode::OK, &json)
}

fn get_plugin_name(path: &PathBuf) -> Option<String> {
    // Try package.json first
    let package_json = path.join("package.json");
    if package_json.exists() {
        if let Ok(content) = fs::read_to_string(&package_json) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(name) = json.get("name").and_then(|n| n.as_str()) {
                    return Some(name.to_string());
                }
            }
        }
    }

    // Try Cargo.toml
    let cargo_toml = path.join("Cargo.toml");
    if cargo_toml.exists() {
        if let Ok(content) = fs::read_to_string(&cargo_toml) {
            if let Ok(toml) = content.parse::<toml::Value>() {
                if let Some(name) = toml.get("package")
                    .and_then(|p| p.get("name"))
                    .and_then(|n| n.as_str()) {
                    return Some(name.to_string());
                }
            }
        }
    }

    None
}

#[derive(Serialize)]
struct FileNode {
    name: String,
    path: String,
    #[serde(rename = "type")]
    node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileNode>>,
}

/// GET /developer/tree/:plugin - Get file tree for a plugin
pub fn handle_get_tree(plugin_id: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let plugin_dir = projects_dir.join(plugin_id);
    if !plugin_dir.exists() {
        return json_response(StatusCode::NOT_FOUND,
            &format!(r#"{{"error":"Plugin not found: {}"}}"#, plugin_id));
    }

    let tree = build_file_tree(&plugin_dir, plugin_id);
    let json = serde_json::to_string(&tree).unwrap_or_else(|_| "{}".to_string());
    json_response(StatusCode::OK, &json)
}

fn build_file_tree(path: &PathBuf, relative_path: &str) -> FileNode {
    let name = path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    if path.is_file() {
        return FileNode {
            name,
            path: relative_path.to_string(),
            node_type: "file".to_string(),
            children: None,
        };
    }

    let mut children = Vec::new();
    if let Ok(entries) = fs::read_dir(path) {
        let mut entries: Vec<_> = entries.flatten().collect();
        entries.sort_by(|a, b| {
            let a_is_dir = a.path().is_dir();
            let b_is_dir = b.path().is_dir();
            match (a_is_dir, b_is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.file_name().cmp(&b.file_name()),
            }
        });

        for entry in entries {
            let entry_path = entry.path();
            let entry_name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden files and build artifacts
            if entry_name.starts_with('.') || entry_name == "target" || entry_name == "node_modules" {
                continue;
            }

            let child_relative = format!("{}/{}", relative_path, entry_name);
            children.push(build_file_tree(&entry_path, &child_relative));
        }
    }

    FileNode {
        name,
        path: relative_path.to_string(),
        node_type: "folder".to_string(),
        children: Some(children),
    }
}

/// GET /developer/file/:plugin/:path - Read a file
pub fn handle_get_file(plugin_id: &str, file_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let full_path = projects_dir.join(plugin_id).join(file_path);

    if !full_path.exists() {
        return json_response(StatusCode::NOT_FOUND,
            &format!(r#"{{"error":"File not found: {}"}}"#, file_path));
    }

    match fs::read_to_string(&full_path) {
        Ok(content) => {
            let response = serde_json::json!({ "content": content });
            json_response(StatusCode::OK, &response.to_string())
        }
        Err(e) => json_response(StatusCode::INTERNAL_SERVER_ERROR,
            &format!(r#"{{"error":"Failed to read file: {}"}}"#, e)),
    }
}

/// PUT /developer/file/:plugin/:path - Save a file
pub fn handle_save_file(plugin_id: &str, file_path: &str, content: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let full_path = projects_dir.join(plugin_id).join(file_path);

    // Ensure parent directory exists
    if let Some(parent) = full_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return json_response(StatusCode::INTERNAL_SERVER_ERROR,
                &format!(r#"{{"error":"Failed to create directory: {}"}}"#, e));
        }
    }

    match fs::write(&full_path, content) {
        Ok(_) => json_response(StatusCode::OK, r#"{"success":true}"#),
        Err(e) => json_response(StatusCode::INTERNAL_SERVER_ERROR,
            &format!(r#"{{"error":"Failed to write file: {}"}}"#, e)),
    }
}

#[derive(Deserialize)]
pub struct CreateFileRequest {
    pub path: String,
    #[serde(rename = "type")]
    pub file_type: String,
    pub name: String,
}

/// POST /developer/file/:plugin - Create a file or folder
pub fn handle_create_file(plugin_id: &str, request: CreateFileRequest) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let base_path = projects_dir.join(plugin_id);
    let target_path = if request.path.is_empty() {
        base_path.join(&request.name)
    } else {
        base_path.join(&request.path).join(&request.name)
    };

    if request.file_type == "folder" {
        match fs::create_dir_all(&target_path) {
            Ok(_) => json_response(StatusCode::OK, r#"{"success":true}"#),
            Err(e) => json_response(StatusCode::INTERNAL_SERVER_ERROR,
                &format!(r#"{{"error":"Failed to create folder: {}"}}"#, e)),
        }
    } else {
        // Ensure parent exists
        if let Some(parent) = target_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        match fs::write(&target_path, "") {
            Ok(_) => json_response(StatusCode::OK, r#"{"success":true}"#),
            Err(e) => json_response(StatusCode::INTERNAL_SERVER_ERROR,
                &format!(r#"{{"error":"Failed to create file: {}"}}"#, e)),
        }
    }
}

/// DELETE /developer/file/:plugin/:path - Delete a file or folder
pub fn handle_delete_file(plugin_id: &str, file_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let full_path = projects_dir.join(plugin_id).join(file_path);

    if !full_path.exists() {
        return json_response(StatusCode::NOT_FOUND,
            &format!(r#"{{"error":"File not found: {}"}}"#, file_path));
    }

    let result = if full_path.is_dir() {
        fs::remove_dir_all(&full_path)
    } else {
        fs::remove_file(&full_path)
    };

    match result {
        Ok(_) => json_response(StatusCode::OK, r#"{"success":true}"#),
        Err(e) => json_response(StatusCode::INTERNAL_SERVER_ERROR,
            &format!(r#"{{"error":"Failed to delete: {}"}}"#, e)),
    }
}

#[derive(Deserialize)]
pub struct CreatePluginRequest {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub template: String,
}

/// POST /developer/create - Create a new plugin from template
pub fn handle_create_plugin(request: CreatePluginRequest) -> Response<BoxBody<Bytes, Infallible>> {
    let projects_dir = match get_projects_dir() {
        Some(d) => d,
        None => return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            r#"{"error":"Could not find projects directory"}"#),
    };

    let plugin_dir = projects_dir.join(&request.id);

    if plugin_dir.exists() {
        return json_response(StatusCode::CONFLICT,
            &format!(r#"{{"error":"Plugin already exists: {}"}}"#, request.id));
    }

    if let Err(e) = fs::create_dir_all(&plugin_dir) {
        return json_response(StatusCode::INTERNAL_SERVER_ERROR,
            &format!(r#"{{"error":"Failed to create plugin directory: {}"}}"#, e));
    }

    // Create files based on template
    let description = request.description.as_deref().unwrap_or("");
    let author = request.author.as_deref().unwrap_or("WebArcade");

    // package.json
    let package_json = serde_json::json!({
        "name": request.id,
        "version": "1.0.0",
        "description": description,
        "author": author,
        "main": "index.jsx"
    });
    let _ = fs::write(plugin_dir.join("package.json"),
        serde_json::to_string_pretty(&package_json).unwrap());

    // index.jsx
    let index_jsx = format!(r#"import {{ createPlugin }} from '@/api/plugin';
import {{ IconApps }} from '@tabler/icons-solidjs';
import Viewport from './viewport.jsx';

export default createPlugin({{
  id: '{}',
  name: '{}',
  version: '1.0.0',
  description: '{}',
  author: '{}',

  async onStart(api) {{
    console.log('[{}] Starting...');

    api.viewport('{}-viewport', {{
      label: '{}',
      component: Viewport,
      icon: IconApps,
      description: '{}'
    }});

    api.menu('{}-menu', {{
      label: '{}',
      icon: IconApps,
      onClick: () => {{
        api.open('{}-viewport', {{ label: '{}' }});
      }}
    }});
  }}
}});
"#, request.id, request.name, description, author,
    request.name, request.id, request.name, description,
    request.id, request.name, request.id, request.name);
    let _ = fs::write(plugin_dir.join("index.jsx"), index_jsx);

    // viewport.jsx
    let viewport_jsx = format!(r#"import {{ createSignal }} from 'solid-js';

export default function Viewport() {{
  const [count, setCount] = createSignal(0);

  return (
    <div class="flex flex-col items-center justify-center h-full bg-base-100">
      <h1 class="text-2xl font-bold mb-4">{}</h1>
      <p class="text-base-content/60 mb-4">{}</p>
      <button
        class="btn btn-primary"
        onClick={{() => setCount(c => c + 1)}}
      >
        Count: {{count()}}
      </button>
    </div>
  );
}}
"#, request.name, description);
    let _ = fs::write(plugin_dir.join("viewport.jsx"), viewport_jsx);

    // Add backend files for backend/fullstack templates
    if request.template == "backend" || request.template == "fullstack" {
        // Cargo.toml
        let cargo_toml = format!(r#"[package]
name = "{}"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = {{ version = "1", features = ["derive"] }}

[routes]
"GET /hello" = "handle_hello"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
"#, request.id);
        let _ = fs::write(plugin_dir.join("Cargo.toml"), cargo_toml);

        // mod.rs
        let mod_rs = format!(r#"use api::{{Plugin, PluginMetadata}};

pub mod router;

pub struct {}Plugin;

impl Plugin for {}Plugin {{
    fn metadata(&self) -> PluginMetadata {{
        PluginMetadata {{
            id: "{}".to_string(),
            name: "{}".to_string(),
            version: "1.0.0".to_string(),
            description: "{}".to_string(),
            author: "{}".to_string(),
        }}
    }}
}}
"#, to_pascal_case(&request.id), to_pascal_case(&request.id),
    request.id, request.name, description, author);
        let _ = fs::write(plugin_dir.join("mod.rs"), mod_rs);

        // router.rs
        let router_rs = r#"use api::http::{HttpRequest, HttpResponse};

pub async fn handle_hello(_req: HttpRequest) -> HttpResponse {
    HttpResponse::json(&serde_json::json!({
        "message": "Hello from the backend!"
    }))
}
"#;
        let _ = fs::write(plugin_dir.join("router.rs"), router_rs);
    }

    let response = serde_json::json!({
        "success": true,
        "plugin": {
            "id": request.id,
            "name": request.name
        }
    });
    json_response(StatusCode::OK, &response.to_string())
}

fn to_pascal_case(s: &str) -> String {
    s.split(|c| c == '_' || c == '-')
        .map(|part| {
            let mut chars = part.chars();
            match chars.next() {
                Some(first) => first.to_uppercase().chain(chars).collect(),
                None => String::new(),
            }
        })
        .collect()
}

// ============================================================================
// Toolchain Detection API
// ============================================================================

#[derive(Serialize)]
pub struct ToolchainStatus {
    pub rust_installed: bool,
    pub rust_version: Option<String>,
    pub cargo_installed: bool,
    pub cargo_version: Option<String>,
    pub msvc_installed: bool,
    pub ready_to_build: bool,
}

/// Check if Rust and required build tools are installed
pub fn check_toolchain() -> ToolchainStatus {
    use std::process::Command;

    // Check rustc
    let (rust_installed, rust_version) = match Command::new("rustc")
        .arg("--version")
        .output()
    {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check cargo
    let (cargo_installed, cargo_version) = match Command::new("cargo")
        .arg("--version")
        .output()
    {
        Ok(output) if output.status.success() => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            (true, Some(version))
        }
        _ => (false, None),
    };

    // Check MSVC on Windows
    #[cfg(target_os = "windows")]
    let msvc_installed = check_msvc_installed();
    #[cfg(not(target_os = "windows"))]
    let msvc_installed = true; // Not needed on other platforms

    let ready_to_build = rust_installed && cargo_installed && msvc_installed;

    ToolchainStatus {
        rust_installed,
        rust_version,
        cargo_installed,
        cargo_version,
        msvc_installed,
        ready_to_build,
    }
}

#[cfg(target_os = "windows")]
fn check_msvc_installed() -> bool {
    use std::process::Command;

    // Try to find cl.exe (MSVC compiler) or check for VS installation
    // Method 1: Check if we can find vswhere
    let vswhere_paths = [
        r"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe",
        r"C:\Program Files\Microsoft Visual Studio\Installer\vswhere.exe",
    ];

    for vswhere in &vswhere_paths {
        if std::path::Path::new(vswhere).exists() {
            if let Ok(output) = Command::new(vswhere)
                .args(&["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"])
                .output()
            {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() {
                        return true;
                    }
                }
            }
        }
    }

    // Method 2: Check for Build Tools standalone installation
    let build_tools_path = r"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools";
    if std::path::Path::new(build_tools_path).exists() {
        return true;
    }

    let build_tools_path_2019 = r"C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools";
    if std::path::Path::new(build_tools_path_2019).exists() {
        return true;
    }

    // Method 3: Try to invoke cl.exe directly (might be in PATH)
    if Command::new("cl").output().is_ok() {
        return true;
    }

    false
}

/// HTTP handler for toolchain check
pub fn handle_check_toolchain() -> Response<BoxBody<Bytes, Infallible>> {
    let status = check_toolchain();
    let json = serde_json::to_string(&status).unwrap();
    json_response(StatusCode::OK, &json)
}

// ============================================================================
// Toolchain Installation API
// ============================================================================

#[derive(Serialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub error: Option<String>,
}

pub type InstallLogCallback = std::sync::Arc<dyn Fn(&str) + Send + Sync>;

/// Download and run rustup installer
pub fn install_rust(log_callback: InstallLogCallback) -> InstallResult {
    use std::process::{Command, Stdio};
    use std::io::{BufRead, BufReader};

    log_callback("Checking for existing Rust installation...");

    let status = check_toolchain();
    if status.rust_installed && status.cargo_installed {
        log_callback("Rust is already installed!");
        return InstallResult {
            success: true,
            message: "Rust is already installed".to_string(),
            error: None,
        };
    }

    #[cfg(target_os = "windows")]
    {
        log_callback("Downloading rustup installer...");

        let temp_dir = std::env::temp_dir();
        let rustup_path = temp_dir.join("rustup-init.exe");

        // Download rustup-init.exe
        let download_result = download_file(
            "https://win.rustup.rs/x86_64",
            &rustup_path,
            log_callback.clone(),
        );

        if let Err(e) = download_result {
            return InstallResult {
                success: false,
                message: "Failed to download rustup".to_string(),
                error: Some(e.to_string()),
            };
        }

        log_callback("Running rustup installer...");
        log_callback("This will install Rust with default options (includes MSVC target)...");

        // Run rustup-init with default options (-y for non-interactive)
        let mut child = match Command::new(&rustup_path)
            .args(&["-y", "--default-toolchain", "stable", "--profile", "default"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                return InstallResult {
                    success: false,
                    message: "Failed to run rustup installer".to_string(),
                    error: Some(e.to_string()),
                };
            }
        };

        // Stream output
        if let Some(stdout) = child.stdout.take() {
            let callback = log_callback.clone();
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                callback(&line);
            }
        }
        if let Some(stderr) = child.stderr.take() {
            let callback = log_callback.clone();
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                callback(&line);
            }
        }

        let exit_status = match child.wait() {
            Ok(s) => s,
            Err(e) => {
                return InstallResult {
                    success: false,
                    message: "Rustup installer failed".to_string(),
                    error: Some(e.to_string()),
                };
            }
        };

        // Clean up
        let _ = fs::remove_file(&rustup_path);

        if exit_status.success() {
            log_callback("Rust installed successfully!");
            log_callback("You may need to restart WebArcade for PATH changes to take effect.");
            InstallResult {
                success: true,
                message: "Rust installed successfully".to_string(),
                error: None,
            }
        } else {
            InstallResult {
                success: false,
                message: "Rustup installer exited with error".to_string(),
                error: Some(format!("Exit code: {:?}", exit_status.code())),
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        log_callback("Downloading and running rustup installer...");

        // On Unix, use curl | sh
        let mut child = match Command::new("sh")
            .args(&["-c", "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                return InstallResult {
                    success: false,
                    message: "Failed to run rustup installer".to_string(),
                    error: Some(e.to_string()),
                };
            }
        };

        if let Some(stdout) = child.stdout.take() {
            let callback = log_callback.clone();
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                callback(&line);
            }
        }
        if let Some(stderr) = child.stderr.take() {
            let callback = log_callback.clone();
            let reader = BufReader::new(stderr);
            for line in reader.lines().flatten() {
                callback(&line);
            }
        }

        let exit_status = match child.wait() {
            Ok(s) => s,
            Err(e) => {
                return InstallResult {
                    success: false,
                    message: "Rustup installer failed".to_string(),
                    error: Some(e.to_string()),
                };
            }
        };

        if exit_status.success() {
            log_callback("Rust installed successfully!");
            InstallResult {
                success: true,
                message: "Rust installed successfully".to_string(),
                error: None,
            }
        } else {
            InstallResult {
                success: false,
                message: "Rustup installer exited with error".to_string(),
                error: Some(format!("Exit code: {:?}", exit_status.code())),
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn download_file(url: &str, dest: &std::path::Path, log_callback: InstallLogCallback) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use std::process::{Command, Stdio};

    log_callback(&format!("Downloading from {}...", url));

    // Use PowerShell to download (available on all modern Windows)
    let ps_script = format!(
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '{}' -OutFile '{}'",
        url,
        dest.display()
    );

    let output = Command::new("powershell")
        .args(&["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &ps_script])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()?;

    if output.status.success() {
        log_callback("Download complete!");
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Download failed: {}", stderr).into())
    }
}

/// Download and install Visual Studio Build Tools
pub fn install_msvc(log_callback: InstallLogCallback) -> InstallResult {
    use std::process::{Command, Stdio};

    #[cfg(not(target_os = "windows"))]
    {
        return InstallResult {
            success: true,
            message: "MSVC not required on this platform".to_string(),
            error: None,
        };
    }

    #[cfg(target_os = "windows")]
    {
        log_callback("Checking for MSVC Build Tools...");

        if check_msvc_installed() {
            log_callback("MSVC Build Tools already installed!");
            return InstallResult {
                success: true,
                message: "MSVC Build Tools already installed".to_string(),
                error: None,
            };
        }

        log_callback("Downloading Visual Studio Build Tools installer...");

        let temp_dir = std::env::temp_dir();
        let installer_path = temp_dir.join("vs_buildtools.exe");

        // Download VS Build Tools installer
        let download_result = download_file(
            "https://aka.ms/vs/17/release/vs_buildtools.exe",
            &installer_path,
            log_callback.clone(),
        );

        if let Err(e) = download_result {
            return InstallResult {
                success: false,
                message: "Failed to download VS Build Tools".to_string(),
                error: Some(e.to_string()),
            };
        }

        log_callback("Running Visual Studio Build Tools installer...");
        log_callback("This will install the C++ build tools required for Rust...");
        log_callback("A separate installer window will open. Please complete the installation.");

        // Run the installer with workload for C++ build tools
        // Note: This opens a GUI installer - we can't fully automate it without admin
        let result = Command::new(&installer_path)
            .args(&[
                "--add", "Microsoft.VisualStudio.Workload.VCTools",
                "--add", "Microsoft.VisualStudio.Component.Windows11SDK.22000",
                "--includeRecommended",
                "--passive",  // Shows progress but doesn't require interaction
                "--wait",     // Wait for installation to complete
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .status();

        // Clean up installer
        let _ = fs::remove_file(&installer_path);

        match result {
            Ok(status) if status.success() => {
                log_callback("Visual Studio Build Tools installed successfully!");
                InstallResult {
                    success: true,
                    message: "MSVC Build Tools installed successfully".to_string(),
                    error: None,
                }
            }
            Ok(status) => {
                // Some exit codes indicate reboot required (3010) which is still success
                if status.code() == Some(3010) {
                    log_callback("Installation complete. A system restart may be required.");
                    InstallResult {
                        success: true,
                        message: "MSVC installed (restart may be required)".to_string(),
                        error: None,
                    }
                } else {
                    InstallResult {
                        success: false,
                        message: "VS Build Tools installation may have failed".to_string(),
                        error: Some(format!("Exit code: {:?}", status.code())),
                    }
                }
            }
            Err(e) => InstallResult {
                success: false,
                message: "Failed to run VS Build Tools installer".to_string(),
                error: Some(e.to_string()),
            },
        }
    }
}

// ============================================================================
// Export App API
// ============================================================================

#[derive(Deserialize)]
pub struct ExportAppRequest {
    pub app_name: String,
    pub app_id: String,
    pub window_title: String,
}

#[derive(Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

pub type ExportLogCallback = std::sync::Arc<dyn Fn(&str) + Send + Sync>;

/// Run the export build process with log streaming
pub fn run_export_build(
    request: ExportAppRequest,
    log_callback: ExportLogCallback,
) -> ExportResult {
    use std::process::{Command, Stdio};
    use std::io::{BufRead, BufReader};

    log_callback(&format!("Starting export build for '{}'...", request.app_name));

    // Get the project root directory (parent of src-tauri)
    let exe_path = std::env::current_exe().ok();
    let project_root = exe_path
        .as_ref()
        .and_then(|p| p.parent()) // src-tauri/target/debug or release
        .and_then(|p| p.parent()) // src-tauri/target
        .and_then(|p| p.parent()) // src-tauri
        .and_then(|p| p.parent()); // project root

    let project_root = match project_root {
        Some(p) => p.to_path_buf(),
        None => {
            // Fallback: try current working directory
            match std::env::current_dir() {
                Ok(cwd) => cwd,
                Err(e) => {
                    return ExportResult {
                        success: false,
                        output_path: None,
                        error: Some(format!("Could not determine project root: {}", e)),
                    };
                }
            }
        }
    };

    log_callback(&format!("Project root: {:?}", project_root));

    // Step 1: Update tauri.export.conf.json
    log_callback("Updating export configuration...");
    let export_config_path = project_root.join("src-tauri").join("tauri.export.conf.json");

    if !export_config_path.exists() {
        return ExportResult {
            success: false,
            output_path: None,
            error: Some(format!("Export config not found: {:?}", export_config_path)),
        };
    }

    // Read and modify the export config
    let config_content = match fs::read_to_string(&export_config_path) {
        Ok(c) => c,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to read export config: {}", e)),
            };
        }
    };

    // Store original config to restore later
    let original_config = config_content.clone();

    let mut config: serde_json::Value = match serde_json::from_str(&config_content) {
        Ok(c) => c,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to parse export config: {}", e)),
            };
        }
    };

    // Update the config values
    config["productName"] = serde_json::json!(request.app_name);
    config["identifier"] = serde_json::json!(request.app_id);
    if let Some(windows) = config["app"]["windows"].as_array_mut() {
        if let Some(window) = windows.get_mut(0) {
            window["title"] = serde_json::json!(request.window_title);
        }
    }

    // IMPORTANT: Clear beforeBuildCommand since we build frontend separately
    // This prevents conflicts with the running dev server
    if config.get("build").is_some() {
        config["build"]["beforeBuildCommand"] = serde_json::json!("");
    }

    // Write back the config
    if let Err(e) = fs::write(&export_config_path, serde_json::to_string_pretty(&config).unwrap()) {
        return ExportResult {
            success: false,
            output_path: None,
            error: Some(format!("Failed to write export config: {}", e)),
        };
    }
    log_callback(&format!("Updated config: productName='{}', identifier='{}'", request.app_name, request.app_id));

    // Clone paths for use in restore
    let export_config_path_for_restore = export_config_path.clone();

    // Step 2: Copy plugins from AppData to src-tauri/plugins
    log_callback("Copying plugins to bundle...");
    let plugins_src = dirs::data_local_dir()
        .map(|d| d.join("WebArcade").join("plugins"))
        .unwrap_or_default();

    let plugins_dest = project_root.join("src-tauri").join("plugins");

    // Clean and create destination
    if plugins_dest.exists() {
        let _ = fs::remove_dir_all(&plugins_dest);
    }
    if let Err(e) = fs::create_dir_all(&plugins_dest) {
        return ExportResult {
            success: false,
            output_path: None,
            error: Some(format!("Failed to create plugins directory: {}", e)),
        };
    }

    // Copy each plugin
    if plugins_src.exists() {
        if let Ok(entries) = fs::read_dir(&plugins_src) {
            for entry in entries.flatten() {
                let src_path = entry.path();
                if src_path.is_dir() {
                    let plugin_name = entry.file_name();
                    let dest_path = plugins_dest.join(&plugin_name);
                    log_callback(&format!("Copying plugin: {:?}", plugin_name));
                    if let Err(e) = copy_dir_recursive(&src_path, &dest_path) {
                        log_callback(&format!("Warning: Failed to copy plugin {:?}: {}", plugin_name, e));
                    }
                }
            }
        }
    }

    // Step 3: Run the frontend build first
    log_callback("Building frontend (export mode)...");

    #[cfg(target_os = "windows")]
    let (shell, shell_arg) = ("cmd", "/C");
    #[cfg(not(target_os = "windows"))]
    let (shell, shell_arg) = ("sh", "-c");

    // Build frontend with BUILD_MODE=export
    let frontend_cmd = "cross-env BUILD_MODE=export bunx rspack build --mode production";
    let mut child = match Command::new(shell)
        .arg(shell_arg)
        .arg(frontend_cmd)
        .current_dir(&project_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to start frontend build: {}", e)),
            };
        }
    };

    // Stream frontend build output
    if let Some(stdout) = child.stdout.take() {
        let callback = log_callback.clone();
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            callback(&line);
        }
    }
    if let Some(stderr) = child.stderr.take() {
        let callback = log_callback.clone();
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            callback(&line);
        }
    }

    let frontend_status = match child.wait() {
        Ok(s) => s,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Frontend build failed: {}", e)),
            };
        }
    };

    if !frontend_status.success() {
        return ExportResult {
            success: false,
            output_path: None,
            error: Some("Frontend build failed".to_string()),
        };
    }

    // Step 4: Run Tauri build
    log_callback("Building Tauri app (this may take a few minutes)...");

    let tauri_cmd = format!(
        "npx tauri build --config src-tauri/tauri.export.conf.json -- --no-default-features --features custom-protocol"
    );

    let mut child = match Command::new(shell)
        .arg(shell_arg)
        .arg(&tauri_cmd)
        .current_dir(&project_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Failed to start Tauri build: {}", e)),
            };
        }
    };

    // Stream Tauri build output
    if let Some(stdout) = child.stdout.take() {
        let callback = log_callback.clone();
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            callback(&line);
        }
    }
    if let Some(stderr) = child.stderr.take() {
        let callback = log_callback.clone();
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            callback(&line);
        }
    }

    // Wait for completion
    let status = match child.wait() {
        Ok(s) => s,
        Err(e) => {
            return ExportResult {
                success: false,
                output_path: None,
                error: Some(format!("Tauri build failed: {}", e)),
            };
        }
    };

    // Restore original config (so manual bun run export still works)
    let _ = fs::write(&export_config_path_for_restore, &original_config);

    if status.success() {
        let output_path = project_root
            .join("src-tauri")
            .join("target")
            .join("release")
            .join("bundle");

        log_callback("Export completed successfully!");
        log_callback(&format!("Output: {:?}", output_path));

        ExportResult {
            success: true,
            output_path: Some(output_path.to_string_lossy().to_string()),
            error: None,
        }
    } else {
        ExportResult {
            success: false,
            output_path: None,
            error: Some(format!("Build failed with exit code: {:?}", status.code())),
        }
    }
}

/// Recursively copy a directory
fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

