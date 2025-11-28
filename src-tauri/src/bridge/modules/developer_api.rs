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
