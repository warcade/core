//! FFI HTTP Request/Response types and helpers for runtime plugins
//!
//! This module provides easy-to-use types for handling HTTP requests and responses
//! in DLL plugins. The bridge serializes the full HTTP context as JSON, and this
//! module helps parse it and construct responses.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::CString;

/// Represents a complete HTTP request with all context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    /// HTTP method (GET, POST, PUT, DELETE, etc.)
    pub method: String,
    /// Request path (e.g., "/upload")
    pub path: String,
    /// Parsed query parameters
    pub query: HashMap<String, String>,
    /// Extracted path parameters (e.g., {"id": "123"} for route "/user/:id")
    pub path_params: HashMap<String, String>,
    /// All request headers
    pub headers: HashMap<String, String>,
    /// Request body as base64 encoded string
    pub body: String,
    /// Original body length in bytes
    pub body_len: usize,
}

impl Request {
    /// Parse request from JSON string (called by handler)
    pub fn from_json(json_ptr: *const u8, json_len: usize) -> Result<Self, String> {
        let json_slice = unsafe { std::slice::from_raw_parts(json_ptr, json_len) };
        let json_str = std::str::from_utf8(json_slice)
            .map_err(|e| format!("Invalid UTF-8 in request JSON: {}", e))?;
        serde_json::from_str(json_str)
            .map_err(|e| format!("Failed to parse request JSON: {}", e))
    }

    /// Get the raw body bytes (decoded from base64)
    pub fn body_bytes(&self) -> Result<Vec<u8>, String> {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(&self.body)
            .map_err(|e| format!("Failed to decode body from base64: {}", e))
    }

    /// Get body as UTF-8 string
    pub fn body_string(&self) -> Result<String, String> {
        let bytes = self.body_bytes()?;
        String::from_utf8(bytes)
            .map_err(|e| format!("Body is not valid UTF-8: {}", e))
    }

    /// Parse body as JSON
    pub fn body_json<T: for<'de> Deserialize<'de>>(&self) -> Result<T, String> {
        let body_str = self.body_string()?;
        serde_json::from_str(&body_str)
            .map_err(|e| format!("Failed to parse body as JSON: {}", e))
    }

    /// Get a specific header (case-insensitive)
    pub fn header(&self, name: &str) -> Option<&String> {
        let lower_name = name.to_lowercase();
        self.headers.iter()
            .find(|(k, _)| k.to_lowercase() == lower_name)
            .map(|(_, v)| v)
    }

    /// Get a query parameter
    pub fn query_param(&self, name: &str) -> Option<&String> {
        self.query.get(name)
    }

    /// Get a path parameter
    pub fn path_param(&self, name: &str) -> Option<&String> {
        self.path_params.get(name)
    }

    /// Check if request has a specific content type
    pub fn is_content_type(&self, content_type: &str) -> bool {
        self.header("content-type")
            .map(|ct| ct.to_lowercase().contains(&content_type.to_lowercase()))
            .unwrap_or(false)
    }

    /// Check if request is multipart form data
    pub fn is_multipart(&self) -> bool {
        self.is_content_type("multipart/form-data")
    }

    /// Check if request is JSON
    pub fn is_json(&self) -> bool {
        self.is_content_type("application/json")
    }

    /// Get multipart boundary from content-type header
    pub fn multipart_boundary(&self) -> Option<String> {
        self.header("content-type")
            .and_then(|ct| {
                ct.split(';')
                    .find(|part| part.trim().to_lowercase().starts_with("boundary="))
                    .map(|part| {
                        part.trim()
                            .strip_prefix("boundary=")
                            .or_else(|| part.trim().strip_prefix("Boundary="))
                            .or_else(|| part.trim().strip_prefix("BOUNDARY="))
                            .unwrap_or("")
                            .trim_matches('"')
                            .to_string()
                    })
            })
    }

    /// Parse multipart form data and extract files
    pub fn parse_multipart(&self) -> Result<Vec<MultipartField>, String> {
        let boundary = self.multipart_boundary()
            .ok_or_else(|| "No boundary found in content-type header".to_string())?;

        let body_bytes = self.body_bytes()?;
        parse_multipart_body(&body_bytes, &boundary)
    }
}

/// Represents a field from multipart form data
#[derive(Debug, Clone)]
pub struct MultipartField {
    /// Field name
    pub name: String,
    /// Optional filename (for file uploads)
    pub filename: Option<String>,
    /// Content type of the field
    pub content_type: Option<String>,
    /// Field data as bytes
    pub data: Vec<u8>,
}

impl MultipartField {
    /// Get data as UTF-8 string
    pub fn as_string(&self) -> Result<String, String> {
        String::from_utf8(self.data.clone())
            .map_err(|e| format!("Field data is not valid UTF-8: {}", e))
    }

    /// Check if this is a file upload
    pub fn is_file(&self) -> bool {
        self.filename.is_some()
    }
}

/// Parse multipart body into fields
/// This handles binary data properly by working with raw bytes
fn parse_multipart_body(body: &[u8], boundary: &str) -> Result<Vec<MultipartField>, String> {
    let mut fields = Vec::new();
    let delimiter = format!("--{}", boundary).into_bytes();
    let end_delimiter = format!("--{}--", boundary).into_bytes();

    // Find all boundary positions in the raw bytes
    let mut positions = Vec::new();
    let mut i = 0;
    while i <= body.len().saturating_sub(delimiter.len()) {
        if &body[i..i + delimiter.len()] == delimiter.as_slice() {
            positions.push(i);
        }
        i += 1;
    }

    if positions.len() < 2 {
        return Ok(fields); // No complete parts found
    }

    // Process each part between boundaries
    for window in positions.windows(2) {
        let start = window[0] + delimiter.len();
        let end = window[1];

        if start >= end {
            continue;
        }

        let part = &body[start..end];

        // Skip leading \r\n
        let part = if part.starts_with(b"\r\n") {
            &part[2..]
        } else {
            part
        };

        // Find the header/body separator (\r\n\r\n)
        let separator = b"\r\n\r\n";
        let sep_pos = find_subsequence(part, separator);

        if sep_pos.is_none() {
            continue;
        }
        let sep_pos = sep_pos.unwrap();

        let headers_bytes = &part[..sep_pos];
        let body_bytes = &part[sep_pos + 4..]; // Skip \r\n\r\n

        // Remove trailing \r\n from body (before next boundary)
        let body_bytes = if body_bytes.ends_with(b"\r\n") {
            &body_bytes[..body_bytes.len() - 2]
        } else {
            body_bytes
        };

        // Parse headers (these are ASCII safe)
        let headers_str = String::from_utf8_lossy(headers_bytes);
        let mut name = String::new();
        let mut filename = None;
        let mut content_type = None;

        for line in headers_str.lines() {
            let line = line.trim();
            if line.to_lowercase().starts_with("content-disposition:") {
                // Parse Content-Disposition header
                for param in line.split(';').skip(1) {
                    let param = param.trim();
                    if param.starts_with("name=") {
                        name = param
                            .strip_prefix("name=")
                            .unwrap_or("")
                            .trim_matches('"')
                            .to_string();
                    } else if param.starts_with("filename=") {
                        filename = Some(
                            param
                                .strip_prefix("filename=")
                                .unwrap_or("")
                                .trim_matches('"')
                                .to_string(),
                        );
                    }
                }
            } else if line.to_lowercase().starts_with("content-type:") {
                content_type = Some(
                    line.strip_prefix("content-type:")
                        .or_else(|| line.strip_prefix("Content-Type:"))
                        .unwrap_or("")
                        .trim()
                        .to_string(),
                );
            }
        }

        if !name.is_empty() {
            fields.push(MultipartField {
                name,
                filename,
                content_type,
                data: body_bytes.to_vec(), // Keep raw binary data
            });
        }
    }

    Ok(fields)
}

/// Find the position of a subsequence in a byte slice
fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    if needle.is_empty() || haystack.len() < needle.len() {
        return None;
    }

    haystack.windows(needle.len()).position(|window| window == needle)
}

/// HTTP Response builder for FFI plugins
#[derive(Debug, Clone, Serialize)]
pub struct Response {
    /// Marker to identify this as an FFI response
    #[serde(rename = "__ffi_response__")]
    _marker: bool,
    /// HTTP status code
    pub status: u16,
    /// Response headers
    pub headers: HashMap<String, String>,
    /// Response body (for text/JSON)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<serde_json::Value>,
    /// Response body as base64 (for binary data)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_base64: Option<String>,
}

impl Response {
    /// Create a new response with status code
    pub fn new(status: u16) -> Self {
        Self {
            _marker: true,
            status,
            headers: HashMap::new(),
            body: None,
            body_base64: None,
        }
    }

    /// Create a 200 OK response
    pub fn ok() -> Self {
        Self::new(200)
    }

    /// Create a 201 Created response
    pub fn created() -> Self {
        Self::new(201)
    }

    /// Create a 400 Bad Request response
    pub fn bad_request() -> Self {
        Self::new(400)
    }

    /// Create a 401 Unauthorized response
    pub fn unauthorized() -> Self {
        Self::new(401)
    }

    /// Create a 403 Forbidden response
    pub fn forbidden() -> Self {
        Self::new(403)
    }

    /// Create a 404 Not Found response
    pub fn not_found() -> Self {
        Self::new(404)
    }

    /// Create a 500 Internal Server Error response
    pub fn internal_error() -> Self {
        Self::new(500)
    }

    /// Set a header
    pub fn header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
    }

    /// Set Content-Type header
    pub fn content_type(self, content_type: &str) -> Self {
        self.header("Content-Type", content_type)
    }

    /// Set JSON body
    pub fn json<T: Serialize>(mut self, data: &T) -> Self {
        self.body = Some(serde_json::to_value(data).unwrap_or(serde_json::Value::Null));
        self.headers.insert("Content-Type".to_string(), "application/json".to_string());
        self
    }

    /// Set text body
    pub fn text(mut self, text: &str) -> Self {
        self.body = Some(serde_json::Value::String(text.to_string()));
        if !self.headers.contains_key("Content-Type") {
            self.headers.insert("Content-Type".to_string(), "text/plain".to_string());
        }
        self
    }

    /// Set HTML body
    pub fn html(self, html: &str) -> Self {
        self.content_type("text/html").text(html)
    }

    /// Set binary body (will be base64 encoded)
    pub fn binary(mut self, data: &[u8], content_type: &str) -> Self {
        use base64::Engine;
        self.body_base64 = Some(base64::engine::general_purpose::STANDARD.encode(data));
        self.headers.insert("Content-Type".to_string(), content_type.to_string());
        self
    }

    /// Set file response with automatic MIME type detection
    pub fn file(self, data: &[u8], filename: &str) -> Self {
        let content_type = mime_type_from_extension(filename);
        self.binary(data, content_type)
            .header("Content-Disposition", &format!("inline; filename=\"{}\"", filename))
    }

    /// Set file download response
    pub fn download(self, data: &[u8], filename: &str) -> Self {
        let content_type = mime_type_from_extension(filename);
        self.binary(data, content_type)
            .header("Content-Disposition", &format!("attachment; filename=\"{}\"", filename))
    }

    /// Convert response to JSON string for FFI return
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"__ffi_response__":true,"status":500,"headers":{"Content-Type":"application/json"},"body":{"error":"Failed to serialize response"}}"#.to_string()
        })
    }

    /// Convert response to C string pointer for FFI return
    /// The caller is responsible for freeing this memory
    pub fn into_ffi_ptr(self) -> *const u8 {
        let json = self.to_json_string();
        let c_string = CString::new(json).unwrap_or_default();
        let ptr = c_string.into_raw() as *const u8;
        ptr
    }
}

/// Helper to create a JSON success response
pub fn json_response<T: Serialize>(data: &T) -> Response {
    Response::ok().json(data)
}

/// Helper to create an error response
pub fn error_response(status: u16, message: &str) -> Response {
    Response::new(status).json(&serde_json::json!({"error": message}))
}

/// Helper to create a simple success response
pub fn success_response(message: &str) -> Response {
    Response::ok().json(&serde_json::json!({"success": true, "message": message}))
}

/// Determine MIME type from file extension
fn mime_type_from_extension(filename: &str) -> &'static str {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        // Images
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",

        // Video
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "ogg" | "ogv" => "video/ogg",
        "avi" => "video/x-msvideo",
        "mov" => "video/quicktime",

        // Audio
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "flac" => "audio/flac",
        "aac" => "audio/aac",
        "oga" => "audio/ogg",

        // Documents
        "pdf" => "application/pdf",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "ppt" => "application/vnd.ms-powerpoint",
        "pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",

        // Text
        "txt" => "text/plain",
        "html" | "htm" => "text/html",
        "css" => "text/css",
        "js" => "application/javascript",
        "json" => "application/json",
        "xml" => "application/xml",
        "csv" => "text/csv",
        "md" => "text/markdown",

        // Archives
        "zip" => "application/zip",
        "tar" => "application/x-tar",
        "gz" => "application/gzip",
        "rar" => "application/vnd.rar",
        "7z" => "application/x-7z-compressed",

        // Other
        "wasm" => "application/wasm",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",

        _ => "application/octet-stream",
    }
}

/// Free a string that was allocated by into_ffi_ptr()
/// Plugin DLLs should export this function
#[no_mangle]
pub extern "C" fn free_string(ptr: *mut u8) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr as *mut i8);
        }
    }
}

/// Macro to define an FFI handler function
///
/// Usage:
/// ```
/// ffi_handler!(handle_upload, |req: Request| {
///     // Your handler logic here
///     Response::ok().json(&json!({"success": true}))
/// });
/// ```
#[macro_export]
macro_rules! ffi_handler {
    ($name:ident, |$req:ident: Request| $body:expr) => {
        #[no_mangle]
        pub extern "C" fn $name(request_ptr: *const u8, request_len: usize) -> *const u8 {
            let result = std::panic::catch_unwind(|| {
                match $crate::ffi_http::Request::from_json(request_ptr, request_len) {
                    Ok($req) => {
                        let response: $crate::ffi_http::Response = $body;
                        response.into_ffi_ptr()
                    }
                    Err(e) => {
                        $crate::ffi_http::error_response(400, &e).into_ffi_ptr()
                    }
                }
            });

            match result {
                Ok(ptr) => ptr,
                Err(_) => {
                    $crate::ffi_http::error_response(500, "Handler panicked").into_ffi_ptr()
                }
            }
        }
    };
}
