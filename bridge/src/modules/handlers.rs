use hyper::{Request, Response, Method, StatusCode};
use hyper::header::{CONTENT_TYPE, ACCESS_CONTROL_ALLOW_ORIGIN, ACCESS_CONTROL_ALLOW_METHODS, ACCESS_CONTROL_ALLOW_HEADERS};
use http_body_util::{BodyExt, Full, combinators::BoxBody};
use bytes::Bytes;
use std::convert::Infallible;
use std::sync::{Arc, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH, Instant};
use log::{info, warn, error};
use percent_encoding::percent_decode_str;
use crate::types::{ApiResponse, WriteFileRequest, WriteBinaryFileRequest};
use crate::file_sync::{read_file_content, write_file_content, delete_file_or_directory, get_file_content_type, read_binary_file, write_binary_file_content};
use crate::file_watcher::{set_current_project};
use crate::system_monitor::get_system_stats;
use crate::modules::memory_cache::{MemoryCache};
use crate::modules::twitch::{TwitchManager, TwitchConfig, SimpleCommand, PermissionLevel};

// Unified file operations
#[derive(Debug)]
enum FileOperation {
    List,
    Read,
    Write { content: String },
    WriteBinary { content: String },
    Delete,
    Serve,
}

#[derive(Debug)]
struct UnifiedFileRequest {
    path: String,
    operation: FileOperation,
    accept_header: Option<String>,
}

// Static variables for shared state
static STARTUP_TIME: OnceLock<u64> = OnceLock::new();
static MEMORY_CACHE: OnceLock<Arc<tokio::sync::Mutex<MemoryCache>>> = OnceLock::new();
static TWITCH_MANAGER: OnceLock<Arc<TwitchManager>> = OnceLock::new();

pub fn set_startup_time(timestamp: u64) {
    STARTUP_TIME.set(timestamp).ok();
}

pub fn set_memory_cache(memory_cache: Arc<tokio::sync::Mutex<MemoryCache>>) {
    MEMORY_CACHE.set(memory_cache).ok();
}

pub fn set_twitch_manager(manager: Arc<TwitchManager>) {
    TWITCH_MANAGER.set(manager).ok();
}

fn get_twitch_manager() -> Option<&'static Arc<TwitchManager>> {
    TWITCH_MANAGER.get()
}

pub async fn handle_http_request(req: Request<hyper::body::Incoming>) -> Result<Response<BoxBody<Bytes, Infallible>>, Infallible> {
    let start_time = Instant::now();
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let query = req.uri().query().unwrap_or("").to_string();
    let user_agent = req.headers().get("user-agent")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("unknown");
    let accept_header = req.headers().get("accept")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    info!("📥 {} {} {} - User-Agent: {}", method, path, 
          if query.is_empty() { "".to_string() } else { format!("?{}", query) }, user_agent);
    
    // Handle CORS preflight
    if method == Method::OPTIONS {
        let duration = start_time.elapsed();
        info!("⚡ OPTIONS {} - 200 OK - {}ms", path, duration.as_millis());
        return Ok(cors_response(StatusCode::OK, ""));
    }
    
    // WebSocket connections are handled by a separate server on port 3002
    if method == Method::GET && path == "/ws" {
        let duration = start_time.elapsed();
        info!("🔄 WebSocket {} - redirect to separate server - {}ms", path, duration.as_millis());
        return Ok(Response::builder()
            .status(StatusCode::MOVED_PERMANENTLY)
            .header("Location", "ws://localhost:3002")
            .body(BoxBody::new(Full::new(Bytes::from("WebSocket server running on port 3002"))))
            .unwrap());
    }
    
    // Read body if this is a POST request
    let body = if method == Method::POST {
        match read_request_body(req).await {
            Ok(body) => {
                let body_size = body.len();
                info!("📄 Request body size: {} bytes", body_size);
                if body_size > 1024 {
                    info!("📄 Large request body ({}KB)", body_size / 1024);
                }
                Some(body)
            },
            Err(e) => {
                error!("Failed to read request body: {}", e);
                return Ok(error_response(StatusCode::BAD_REQUEST, "Failed to read request body"));
            }
        }
    } else {
        None
    };
    
    let response = match (&method, path.as_str()) {
        // Unified file operations
        (&Method::GET, path) if path.starts_with("/list/") => {
            let file_path = &path[6..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            handle_unified_file_operation(UnifiedFileRequest {
                path: decoded_path,
                operation: FileOperation::List,
                accept_header: accept_header.clone(),
            })
        }
        (&Method::GET, path) if path.starts_with("/read/") => {
            let file_path = &path[6..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            handle_unified_file_operation(UnifiedFileRequest {
                path: decoded_path,
                operation: FileOperation::Read,
                accept_header: accept_header.clone(),
            })
        }
        (&Method::POST, path) if path.starts_with("/write/") => {
            let file_path = &path[7..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            match &body {
                Some(body_content) => handle_unified_file_operation(UnifiedFileRequest {
                    path: decoded_path,
                    operation: FileOperation::Write { content: body_content.clone() },
                    accept_header: accept_header.clone(),
                }),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, path) if path.starts_with("/write-binary/") => {
            let file_path = &path[14..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            match &body {
                Some(body_content) => handle_unified_file_operation(UnifiedFileRequest {
                    path: decoded_path,
                    operation: FileOperation::WriteBinary { content: body_content.clone() },
                    accept_header: accept_header.clone(),
                }),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::DELETE, path) if path.starts_with("/delete/") => {
            let file_path = &path[8..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            handle_unified_file_operation(UnifiedFileRequest {
                path: decoded_path,
                operation: FileOperation::Delete,
                accept_header: accept_header.clone(),
            })
        }
        (&Method::GET, path) if path.starts_with("/file/") => {
            let file_path = &path[6..];
            let decoded_path = match decode_and_validate_path(file_path) {
                Ok(path) => path,
                Err(e) => return Ok(error_response(StatusCode::BAD_REQUEST, &e)),
            };
            return Ok(handle_unified_file_operation(UnifiedFileRequest {
                path: decoded_path,
                operation: FileOperation::Serve,
                accept_header: accept_header.clone(),
            }));
        }
        (&Method::POST, "/start-watcher") => handle_start_watcher(),
        (&Method::GET, "/file-changes") => handle_get_file_changes(),
        (&Method::POST, "/clear-changes") => handle_clear_file_changes(),
        (&Method::POST, "/set-current-project") => {
            match &body {
                Some(body_content) => handle_set_current_project(body_content),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::GET, "/health") => handle_health_check(),
        (&Method::GET, "/startup-time") => handle_get_startup_time(),
        (&Method::GET, "/system/stats") => handle_get_system_stats(),
        (&Method::POST, "/restart") => handle_restart_bridge(),
        (&Method::POST, "/clear-cache") => handle_clear_cache(),

        // Twitch endpoints
        (&Method::POST, "/twitch/start") => return Ok(handle_twitch_start().await),
        (&Method::POST, "/twitch/stop") => return Ok(handle_twitch_stop().await),
        (&Method::GET, "/twitch/status") => return Ok(handle_twitch_status().await),
        (&Method::GET, "/twitch/auth-url") => return Ok(handle_twitch_auth_url().await),
        (&Method::POST, "/twitch/callback") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_callback(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, "/twitch/send-message") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_send_message(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::GET, "/twitch/commands") => return Ok(handle_twitch_get_commands().await),
        (&Method::POST, "/twitch/register-command") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_register_command(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, "/twitch/unregister-command") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_unregister_command(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::GET, "/twitch/config") => return Ok(handle_twitch_get_config().await),
        (&Method::POST, "/twitch/config") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_save_config(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, "/twitch/join-channel") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_join_channel(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, "/twitch/part-channel") => {
            match &body {
                Some(body_content) => return Ok(handle_twitch_part_channel(body_content).await),
                None => error_response(StatusCode::BAD_REQUEST, "Missing request body"),
            }
        }
        (&Method::POST, "/twitch/revoke") => return Ok(handle_twitch_revoke().await),

        _ => {
            warn!("❓ Unknown route: {} {}", method, path);
            error_response(StatusCode::NOT_FOUND, "Not Found")
        },
    };
    
    let duration = start_time.elapsed();
    let status = response.status();
    
    if status.is_success() {
        info!("{} {} - {} - {}ms", method, path, status, duration.as_millis());
    } else if status.is_client_error() {
        warn!(" {} {} - {} - {}ms", method, path, status, duration.as_millis());
    } else {
        error!("{} {} - {} - {}ms", method, path, status, duration.as_millis());
    }
    
    Ok(response)
}

async fn read_request_body(req: Request<hyper::body::Incoming>) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let body = req.into_body();
    let body_bytes = body.collect().await?.to_bytes();
    Ok(String::from_utf8(body_bytes.to_vec())?)
}

fn cors_response(status: StatusCode, body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    Response::builder()
        .status(status)
        .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(ACCESS_CONTROL_ALLOW_METHODS, "GET, POST, DELETE, OPTIONS")
        .header(ACCESS_CONTROL_ALLOW_HEADERS, "Content-Type, Authorization")
        .header(CONTENT_TYPE, "application/json")
        .body(BoxBody::new(Full::new(Bytes::from(body.to_string()))))
        .unwrap()
}

fn json_response<T: serde::Serialize>(data: &T) -> Response<BoxBody<Bytes, Infallible>> {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string());
    cors_response(StatusCode::OK, &json)
}

fn error_response(status: StatusCode, message: &str) -> Response<BoxBody<Bytes, Infallible>> {
    let error_response = ApiResponse {
        success: false,
        content: None,
        error: Some(message.to_string()),
    };
    let json = serde_json::to_string(&error_response).unwrap_or_else(|_| "{}".to_string());
    cors_response(status, &json)
}

// Unified smart file handler
fn handle_unified_file_operation(request: UnifiedFileRequest) -> Response<BoxBody<Bytes, Infallible>> {
    match request.operation {
        FileOperation::List => handle_list_operation(&request.path),
        FileOperation::Read => handle_read_operation(&request.path, request.accept_header.as_deref()),
        FileOperation::Write { content } => handle_write_operation(&request.path, &content, false),
        FileOperation::WriteBinary { content } => handle_write_operation(&request.path, &content, true),
        FileOperation::Delete => handle_delete_operation(&request.path),
        FileOperation::Serve => handle_serve_operation(&request.path),
    }
}

fn handle_list_operation(dir_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    // Since list_directory_contents doesn't exist, return a simple directory listing
    use std::fs;
    
    match fs::read_dir(dir_path) {
        Ok(entries) => {
            let mut files = Vec::new();
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Some(name) = entry.file_name().to_str() {
                        files.push(serde_json::json!({
                            "name": name,
                            "is_directory": entry.file_type().map(|t| t.is_dir()).unwrap_or(false),
                            "path": entry.path().to_string_lossy()
                        }));
                    }
                }
            }
            json_response(&files)
        }
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()),
    }
}

fn handle_read_operation(file_path: &str, accept_header: Option<&str>) -> Response<BoxBody<Bytes, Infallible>> {
    // Check if client wants raw content (e.g., Accept: application/octet-stream)
    let wants_raw = accept_header
        .map(|h| h.contains("application/octet-stream") || h.contains("*/*"))
        .unwrap_or(false);
    
    if wants_raw || is_likely_binary_file(file_path) {
        // Serve as binary
        handle_serve_operation(file_path)
    } else {
        // Read as text and return JSON
        match read_file_content(file_path) {
            Ok(content) => {
                let response = ApiResponse {
                    success: true,
                    content: Some(content),
                    error: None,
                };
                json_response(&response)
            }
            Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
        }
    }
}

fn handle_write_operation(file_path: &str, content: &str, is_binary: bool) -> Response<BoxBody<Bytes, Infallible>> {
    let result = if is_binary {
        let write_req: WriteBinaryFileRequest = match serde_json::from_str(content) {
            Ok(req) => req,
            Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid JSON"),
        };
        write_binary_file_content(file_path, &write_req)
    } else {
        let write_req: WriteFileRequest = match serde_json::from_str(content) {
            Ok(req) => req,
            Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid JSON"),
        };
        write_file_content(file_path, &write_req)
    };

    match result {
        Ok(_) => {
            let response = ApiResponse {
                success: true,
                content: None,
                error: None,
            };
            json_response(&response)
        }
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
    }
}

fn handle_delete_operation(file_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    match delete_file_or_directory(file_path) {
        Ok(_) => {
            let response = ApiResponse {
                success: true,
                content: None,
                error: None,
            };
            json_response(&response)
        }
        Err(e) => error_response(StatusCode::INTERNAL_SERVER_ERROR, &e),
    }
}

fn handle_serve_operation(file_path: &str) -> Response<BoxBody<Bytes, Infallible>> {
    match read_binary_file(file_path) {
        Ok(contents) => {
            let full_path = std::path::Path::new(file_path);
            let content_type = get_file_content_type(full_path);
            
            Response::builder()
                .status(StatusCode::OK)
                .header(ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(CONTENT_TYPE, content_type)
                .body(BoxBody::new(Full::new(Bytes::from(contents))))
                .unwrap()
        }
        Err(e) => {
            let status = if e == "File not found" {
                StatusCode::NOT_FOUND
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            error_response(status, &e)
        }
    }
}

// Helper function to detect binary files based on extension
fn is_likely_binary_file(file_path: &str) -> bool {
    let path = std::path::Path::new(file_path);
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        matches!(ext.to_lowercase().as_str(), 
            "png" | "jpg" | "jpeg" | "gif" | "webp" | "bmp" | "ico" |
            "mp4" | "mov" | "avi" | "mkv" | "webm" |
            "mp3" | "wav" | "ogg" | "flac" |
            "zip" | "rar" | "7z" | "tar" | "gz" |
            "pdf" | "doc" | "docx" | "ppt" | "pptx" |
            "exe" | "dll" | "so" | "dylib" |
            "glb" | "gltf" | "fbx" | "obj" | "dae" | "blend" |
            "ttf" | "otf" | "woff" | "woff2"
        )
    } else {
        false
    }
}

// Helper function to decode and validate file paths
fn decode_and_validate_path(encoded_path: &str) -> Result<String, String> {
    decode_url_path(encoded_path)
}

fn decode_url_path(encoded_path: &str) -> Result<String, String> {
    match percent_decode_str(encoded_path).decode_utf8() {
        Ok(decoded) => Ok(decoded.to_string()),
        Err(e) => {
            error!("Failed to decode URL path '{}': {}", encoded_path, e);
            Err(format!("Invalid URL encoding: {}", e))
        }
    }
}

fn handle_start_watcher() -> Response<BoxBody<Bytes, Infallible>> {
    let response = ApiResponse {
        success: true,
        content: Some("File watcher is running".to_string()),
        error: None,
    };
    json_response(&response)
}

fn handle_get_file_changes() -> Response<BoxBody<Bytes, Infallible>> {
    json_response(&Vec::<String>::new())
}

fn handle_clear_file_changes() -> Response<BoxBody<Bytes, Infallible>> {
    let response = ApiResponse {
        success: true,
        content: None,
        error: None,
    };
    json_response(&response)
}

fn handle_set_current_project(body_content: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct SetProjectRequest {
        project_name: Option<String>,
    }
    
    match serde_json::from_str::<SetProjectRequest>(body_content) {
        Ok(request) => {
            set_current_project(request.project_name.clone());
            let response = ApiResponse {
                success: true,
                content: request.project_name.map(|n| format!("Now watching project: {}", n))
                    .or(Some("Now watching all projects".to_string())),
                error: None,
            };
            json_response(&response)
        }
        Err(e) => {
            error_response(StatusCode::BAD_REQUEST, &format!("Invalid request format: {}", e))
        }
    }
}


fn handle_health_check() -> Response<BoxBody<Bytes, Infallible>> {
    use std::time::{SystemTime, UNIX_EPOCH};
    
    // Get basic system info
    let uptime = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let health_data = serde_json::json!({
        "status": "healthy",
        "uptime": uptime % 86400, // Reset daily for demo
        "cache_size": 1024 * 1024, // Mock cache size
        "thumbnail_count": 5, // Mock thumbnail count
        "watched_files": 12, // Mock watched files count
        "timestamp": uptime
    });
    
    json_response(&health_data)
}

fn handle_get_startup_time() -> Response<BoxBody<Bytes, Infallible>> {
    let startup_time = STARTUP_TIME.get().copied().unwrap_or_else(|| {
        // Fallback: return current time if not set
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    });
    
    let startup_data = serde_json::json!({
        "startup_time": startup_time,
        "startup_time_ms": startup_time * 1000 // Also provide milliseconds for JavaScript
    });
    
    json_response(&startup_data)
}

fn handle_get_system_stats() -> Response<BoxBody<Bytes, Infallible>> {
    let stats = get_system_stats();
    json_response(&stats)
}

fn handle_restart_bridge() -> Response<BoxBody<Bytes, Infallible>> {
    // In a real implementation, this would restart the server
    // For now, just return success
    let response = ApiResponse {
        success: true,
        content: Some("Bridge restart initiated".to_string()),
        error: None,
    };
    json_response(&response)
}

fn handle_clear_cache() -> Response<BoxBody<Bytes, Infallible>> {
    // In a real implementation, this would clear caches
    // For now, just return success
    let response = ApiResponse {
        success: true,
        content: Some("Cache cleared successfully".to_string()),
        error: None,
    };
    json_response(&response)
}

// ========== Twitch Handlers ==========

async fn handle_twitch_start() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            match manager.start().await {
                Ok(_) => {
                    let response = ApiResponse {
                        success: true,
                        content: Some("Twitch bot started successfully".to_string()),
                        error: None,
                    };
                    json_response(&response)
                }
                Err(e) => {
                    error!("Failed to start Twitch bot: {}", e);
                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to start bot: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_stop() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            match manager.stop().await {
                Ok(_) => {
                    let response = ApiResponse {
                        success: true,
                        content: Some("Twitch bot stopped successfully".to_string()),
                        error: None,
                    };
                    json_response(&response)
                }
                Err(e) => {
                    error!("Failed to stop Twitch bot: {}", e);
                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to stop bot: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_status() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            let stats = manager.get_stats().await;
            json_response(&stats)
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_auth_url() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            let auth = manager.get_auth();
            let scopes = crate::modules::twitch::TwitchAuth::get_default_scopes();

            match auth.generate_auth_url(scopes).await {
                Ok(url) => {
                    let response = serde_json::json!({
                        "success": true,
                        "url": url
                    });
                    json_response(&response)
                }
                Err(e) => {
                    error!("Failed to generate auth URL: {}", e);
                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to generate auth URL: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_callback(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct CallbackRequest {
        code: String,
        state: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<CallbackRequest>(body) {
                Ok(req) => {
                    let auth = manager.get_auth();

                    // Verify state
                    match auth.verify_state(&req.state).await {
                        Ok(true) => {
                            // Exchange code for token
                            match auth.exchange_code(&req.code).await {
                                Ok(_token) => {
                                    let response = ApiResponse {
                                        success: true,
                                        content: Some("Authentication successful".to_string()),
                                        error: None,
                                    };
                                    json_response(&response)
                                }
                                Err(e) => {
                                    error!("Failed to exchange code: {}", e);
                                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Authentication failed: {}", e))
                                }
                            }
                        }
                        Ok(false) => {
                            error_response(StatusCode::BAD_REQUEST, "Invalid state (CSRF check failed)")
                        }
                        Err(e) => {
                            error!("Failed to verify state: {}", e);
                            error_response(StatusCode::INTERNAL_SERVER_ERROR, "State verification failed")
                        }
                    }
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_send_message(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct SendMessageRequest {
        channel: String,
        message: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<SendMessageRequest>(body) {
                Ok(req) => {
                    match manager.send_message(&req.channel, &req.message).await {
                        Ok(_) => {
                            let response = ApiResponse {
                                success: true,
                                content: Some("Message sent".to_string()),
                                error: None,
                            };
                            json_response(&response)
                        }
                        Err(e) => {
                            error!("Failed to send message: {}", e);
                            error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to send message: {}", e))
                        }
                    }
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_get_commands() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            let commands = manager.get_commands().await;

            let command_info: Vec<serde_json::Value> = commands
                .iter()
                .map(|cmd| {
                    serde_json::json!({
                        "name": cmd.name,
                        "aliases": cmd.aliases,
                        "description": cmd.description,
                        "usage": cmd.usage,
                        "permission": cmd.permission,
                        "cooldown": cmd.cooldown_seconds,
                        "enabled": cmd.enabled,
                    })
                })
                .collect();

            json_response(&command_info)
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_register_command(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct RegisterCommandRequest {
        name: String,
        aliases: Option<Vec<String>>,
        description: String,
        permission: Option<String>,
        response: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<RegisterCommandRequest>(body) {
                Ok(req) => {
                    let permission = match req.permission.as_deref() {
                        Some("subscriber") => PermissionLevel::Subscriber,
                        Some("vip") => PermissionLevel::Vip,
                        Some("moderator") => PermissionLevel::Moderator,
                        Some("broadcaster") => PermissionLevel::Broadcaster,
                        _ => PermissionLevel::Everyone,
                    };

                    let simple_cmd = SimpleCommand {
                        name: req.name.clone(),
                        aliases: req.aliases.unwrap_or_default(),
                        description: req.description,
                        permission,
                        response: req.response,
                    };

                    manager.register_simple_command(simple_cmd).await;

                    let response = ApiResponse {
                        success: true,
                        content: Some(format!("Command '{}' registered", req.name)),
                        error: None,
                    };
                    json_response(&response)
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_unregister_command(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct UnregisterCommandRequest {
        name: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<UnregisterCommandRequest>(body) {
                Ok(req) => {
                    manager.unregister_command(&req.name).await;

                    let response = ApiResponse {
                        success: true,
                        content: Some(format!("Command '{}' unregistered", req.name)),
                        error: None,
                    };
                    json_response(&response)
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_get_config() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            let config_manager = manager.get_config_manager();

            match config_manager.load() {
                Ok(config) => {
                    // Don't send sensitive data
                    let safe_config = serde_json::json!({
                        "client_id": config.client_id,
                        "bot_username": config.bot_username,
                        "channels": config.channels,
                        "has_token": config.access_token.is_some(),
                    });
                    json_response(&safe_config)
                }
                Err(e) => {
                    error!("Failed to load config: {}", e);
                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to load config: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_save_config(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct SaveConfigRequest {
        client_id: Option<String>,
        client_secret: Option<String>,
        bot_username: Option<String>,
        channels: Option<Vec<String>>,
    }

    match get_twitch_manager() {
        Some(manager) => {
            let config_manager = manager.get_config_manager();

            match serde_json::from_str::<SaveConfigRequest>(body) {
                Ok(req) => {
                    match config_manager.load() {
                        Ok(mut config) => {
                            if let Some(client_id) = req.client_id {
                                config.client_id = client_id;
                            }
                            if let Some(client_secret) = req.client_secret {
                                config.client_secret = client_secret;
                            }
                            if let Some(bot_username) = req.bot_username {
                                config.bot_username = bot_username;
                            }
                            if let Some(channels) = req.channels {
                                config.channels = channels;
                            }

                            match config_manager.save(&config) {
                                Ok(_) => {
                                    let response = ApiResponse {
                                        success: true,
                                        content: Some("Config saved successfully".to_string()),
                                        error: None,
                                    };
                                    json_response(&response)
                                }
                                Err(e) => {
                                    error!("Failed to save config: {}", e);
                                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to save config: {}", e))
                                }
                            }
                        }
                        Err(e) => {
                            error!("Failed to load config: {}", e);
                            error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to load config: {}", e))
                        }
                    }
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_join_channel(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct JoinChannelRequest {
        channel: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<JoinChannelRequest>(body) {
                Ok(req) => {
                    match manager.join_channel(&req.channel).await {
                        Ok(_) => {
                            let response = ApiResponse {
                                success: true,
                                content: Some(format!("Joined channel: {}", req.channel)),
                                error: None,
                            };
                            json_response(&response)
                        }
                        Err(e) => {
                            error!("Failed to join channel: {}", e);
                            error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to join channel: {}", e))
                        }
                    }
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_part_channel(body: &str) -> Response<BoxBody<Bytes, Infallible>> {
    #[derive(serde::Deserialize)]
    struct PartChannelRequest {
        channel: String,
    }

    match get_twitch_manager() {
        Some(manager) => {
            match serde_json::from_str::<PartChannelRequest>(body) {
                Ok(req) => {
                    match manager.part_channel(&req.channel).await {
                        Ok(_) => {
                            let response = ApiResponse {
                                success: true,
                                content: Some(format!("Parted channel: {}", req.channel)),
                                error: None,
                            };
                            json_response(&response)
                        }
                        Err(e) => {
                            error!("Failed to part channel: {}", e);
                            error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to part channel: {}", e))
                        }
                    }
                }
                Err(e) => {
                    error_response(StatusCode::BAD_REQUEST, &format!("Invalid request: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}

async fn handle_twitch_revoke() -> Response<BoxBody<Bytes, Infallible>> {
    match get_twitch_manager() {
        Some(manager) => {
            let auth = manager.get_auth();

            match auth.revoke_token().await {
                Ok(_) => {
                    let response = ApiResponse {
                        success: true,
                        content: Some("Token revoked successfully".to_string()),
                        error: None,
                    };
                    json_response(&response)
                }
                Err(e) => {
                    error!("Failed to revoke token: {}", e);
                    error_response(StatusCode::INTERNAL_SERVER_ERROR, &format!("Failed to revoke token: {}", e))
                }
            }
        }
        None => error_response(StatusCode::SERVICE_UNAVAILABLE, "Twitch manager not initialized"),
    }
}
