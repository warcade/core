//! HTTP utilities and helpers - FFI compatible types for plugin development
//!
//! This module provides HTTP request and response types that are compatible with
//! the FFI boundary. Plugin developers use these types directly, and the builder
//! handles all FFI serialization/deserialization transparently.

use hyper::{body::Bytes, Response, StatusCode};
use http_body_util::{Full, combinators::BoxBody};
use std::convert::Infallible;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// HTTP Response type (uses hyper's response with BoxBody)
pub type HttpResponse = Response<BoxBody<Bytes, Infallible>>;

/// FFI-compatible HTTP Request type for plugin handlers
///
/// This type provides a clean API for accessing HTTP request data.
/// The builder automatically converts FFI data into this type.
///
/// # Example
/// ```rust
/// use api::core::*;
///
/// async fn handle_upload(req: HttpRequest) -> HttpResponse {
///     // Get headers
///     let content_type = req.header("content-type").unwrap_or(&"".to_string());
///
///     // Get body as bytes
///     let body = req.body_bytes();
///
///     // Parse multipart if needed
///     if req.is_multipart() {
///         let fields = req.parse_multipart().unwrap();
///         // Process fields...
///     }
///
///     json_response(&json!({"success": true}))
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpRequest {
    /// HTTP method (GET, POST, PUT, DELETE, etc.)
    pub method: String,
    /// Request path (e.g., "/upload")
    pub path: String,
    /// Parsed query parameters
    pub query: HashMap<String, String>,
    /// Extracted path parameters (e.g., {"id": "123"} for route "/user/:id")
    pub path_params: HashMap<String, String>,
    /// All request headers (lowercase keys)
    headers: HashMap<String, String>,
    /// Request body as raw bytes (not base64 encoded internally)
    body_data: Vec<u8>,
}

impl HttpRequest {
    /// Create a new HttpRequest
    pub fn new(method: String, path: String) -> Self {
        Self {
            method,
            path,
            query: HashMap::new(),
            path_params: HashMap::new(),
            headers: HashMap::new(),
            body_data: Vec::new(),
        }
    }

    /// Create from FFI JSON data (used by generated lib.rs)
    pub fn from_ffi_json(json_ptr: *const u8, json_len: usize) -> Result<Self, String> {
        let json_slice = unsafe { std::slice::from_raw_parts(json_ptr, json_len) };
        let json_str = std::str::from_utf8(json_slice)
            .map_err(|e| format!("Invalid UTF-8 in request JSON: {}", e))?;

        // Parse the FFI format (which has base64 body)
        #[derive(Deserialize)]
        struct FfiRequest {
            method: String,
            path: String,
            query: HashMap<String, String>,
            path_params: HashMap<String, String>,
            headers: HashMap<String, String>,
            body: String, // base64 encoded
        }

        let ffi_req: FfiRequest = serde_json::from_str(json_str)
            .map_err(|e| format!("Failed to parse request JSON: {}", e))?;

        // Decode body from base64
        use base64::Engine;
        let body_data = base64::engine::general_purpose::STANDARD
            .decode(&ffi_req.body)
            .map_err(|e| format!("Failed to decode body: {}", e))?;

        Ok(Self {
            method: ffi_req.method,
            path: ffi_req.path,
            query: ffi_req.query,
            path_params: ffi_req.path_params,
            headers: ffi_req.headers,
            body_data,
        })
    }

    /// Get the HTTP method
    pub fn method(&self) -> &str {
        &self.method
    }

    /// Get the request path
    pub fn path(&self) -> &str {
        &self.path
    }

    /// Get all headers
    pub fn headers(&self) -> &HashMap<String, String> {
        &self.headers
    }

    /// Get a specific header (case-insensitive)
    pub fn header(&self, name: &str) -> Option<&String> {
        let lower_name = name.to_lowercase();
        self.headers.iter()
            .find(|(k, _)| k.to_lowercase() == lower_name)
            .map(|(_, v)| v)
    }

    /// Get the raw body bytes
    pub fn body_bytes(&self) -> &[u8] {
        &self.body_data
    }

    /// Get the body length in bytes
    pub fn body_len(&self) -> usize {
        self.body_data.len()
    }

    /// Get body as owned Vec<u8>
    pub fn into_body_bytes(self) -> Vec<u8> {
        self.body_data
    }

    /// Get body as UTF-8 string
    pub fn body_string(&self) -> Result<String, String> {
        String::from_utf8(self.body_data.clone())
            .map_err(|e| format!("Body is not valid UTF-8: {}", e))
    }

    /// Parse body as JSON
    pub fn body_json<T: for<'de> Deserialize<'de>>(&self) -> Result<T, String> {
        let body_str = self.body_string()?;
        serde_json::from_str(&body_str)
            .map_err(|e| format!("Failed to parse body as JSON: {}", e))
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

    /// Parse multipart form data and extract fields
    pub fn parse_multipart(&self) -> Result<Vec<MultipartField>, String> {
        let boundary = self.multipart_boundary()
            .ok_or_else(|| "No boundary found in content-type header".to_string())?;

        parse_multipart_body(&self.body_data, &boundary)
    }

    /// Collect body - async compatibility method
    /// Returns the body bytes wrapped in a result
    pub async fn collect(&self) -> Result<CollectedBody, String> {
        Ok(CollectedBody {
            bytes: Bytes::from(self.body_data.clone()),
        })
    }
}

/// Collected body bytes (for async compatibility)
pub struct CollectedBody {
    bytes: Bytes,
}

impl CollectedBody {
    /// Get the bytes
    pub fn to_bytes(&self) -> Bytes {
        self.bytes.clone()
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

    /// Get the bytes
    pub fn bytes(&self) -> Result<Bytes, String> {
        Ok(Bytes::from(self.data.clone()))
    }
}

/// Parse multipart body into fields
/// This handles binary data properly by working with raw bytes
fn parse_multipart_body(body: &[u8], boundary: &str) -> Result<Vec<MultipartField>, String> {
    let mut fields = Vec::new();
    let delimiter = format!("--{}", boundary).into_bytes();

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

/// Create a JSON response
///
/// # Example
/// ```
/// # use webarcade_api::prelude::*;
/// async fn handler(req: HttpRequest) -> HttpResponse {
///     json_response(&json!({
///         "message": "Hello!"
///     }))
/// }
/// ```
pub fn json_response<T: Serialize>(data: &T) -> HttpResponse {
    let json = serde_json::to_string(data).unwrap_or_else(|_| "{}".to_string());
    let body = Full::new(Bytes::from(json));

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(BoxBody::new(body))
        .unwrap()
}

/// Create an error response
///
/// # Example
/// ```
/// # use webarcade_api::prelude::*;
/// async fn handler(req: HttpRequest) -> HttpResponse {
///     error_response(StatusCode::NOT_FOUND, "Not found")
/// }
/// ```
pub fn error_response(status: StatusCode, message: &str) -> HttpResponse {
    let body = Full::new(Bytes::from(format!(r#"{{"error":"{}"}}"#, message)));

    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(BoxBody::new(body))
        .unwrap()
}

/// Create a full_body helper
pub fn full_body(content: &str) -> BoxBody<Bytes, Infallible> {
    BoxBody::new(Full::new(Bytes::from(content.to_string())))
}
