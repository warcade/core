//! FFI HTTP Request/Response types for plugin communication
//!
//! These types are used for serializing data across the FFI boundary.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::CString;

/// FFI Request (for receiving from host)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub method: String,
    pub path: String,
    pub query: HashMap<String, String>,
    pub path_params: HashMap<String, String>,
    pub headers: HashMap<String, String>,
    pub body: String, // base64 encoded
    pub body_len: usize,
}

impl Request {
    /// Parse request from JSON pointer
    pub fn from_json(json_ptr: *const u8, json_len: usize) -> Result<Self, String> {
        let json_slice = unsafe { std::slice::from_raw_parts(json_ptr, json_len) };
        let json_str = std::str::from_utf8(json_slice)
            .map_err(|e| format!("Invalid UTF-8: {}", e))?;
        serde_json::from_str(json_str)
            .map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    /// Get decoded body bytes
    pub fn body_bytes(&self) -> Result<Vec<u8>, String> {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(&self.body)
            .map_err(|e| format!("Failed to decode body: {}", e))
    }

    /// Get body as string
    pub fn body_string(&self) -> Result<String, String> {
        let bytes = self.body_bytes()?;
        String::from_utf8(bytes).map_err(|e| format!("Body not UTF-8: {}", e))
    }

    /// Parse body as JSON
    pub fn body_json<T: for<'de> Deserialize<'de>>(&self) -> Result<T, String> {
        let s = self.body_string()?;
        serde_json::from_str(&s).map_err(|e| format!("Invalid JSON: {}", e))
    }

    /// Get header (case-insensitive)
    pub fn header(&self, name: &str) -> Option<&String> {
        let lower = name.to_lowercase();
        self.headers.iter()
            .find(|(k, _)| k.to_lowercase() == lower)
            .map(|(_, v)| v)
    }
}

/// FFI Response (for sending back to host)
#[derive(Debug, Clone, Serialize)]
pub struct Response {
    #[serde(rename = "__ffi_response__")]
    _marker: bool,
    pub status: u16,
    pub headers: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body_base64: Option<String>,
}

impl Response {
    /// Create new response with status
    pub fn new(status: u16) -> Self {
        Self {
            _marker: true,
            status,
            headers: HashMap::new(),
            body: None,
            body_base64: None,
        }
    }

    /// 200 OK
    pub fn ok() -> Self {
        Self::new(200)
    }

    /// 404 Not Found
    pub fn not_found() -> Self {
        Self::new(404)
    }

    /// 500 Internal Server Error
    pub fn internal_error() -> Self {
        Self::new(500)
    }

    /// Set header
    pub fn header(mut self, key: &str, value: &str) -> Self {
        self.headers.insert(key.to_string(), value.to_string());
        self
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

    /// Set binary body (base64 encoded)
    pub fn binary(mut self, data: &[u8], content_type: &str) -> Self {
        use base64::Engine;
        self.body_base64 = Some(base64::engine::general_purpose::STANDARD.encode(data));
        self.headers.insert("Content-Type".to_string(), content_type.to_string());
        self
    }

    /// Convert to JSON string
    pub fn to_json_string(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"__ffi_response__":true,"status":500,"headers":{},"body":{"error":"Serialization failed"}}"#.to_string()
        })
    }

    /// Convert to FFI pointer (caller must free)
    pub fn into_ffi_ptr(self) -> *const u8 {
        let json = self.to_json_string();
        let c_string = CString::new(json).unwrap_or_default();
        c_string.into_raw() as *const u8
    }
}

/// Free a string allocated by into_ffi_ptr
#[no_mangle]
pub extern "C" fn free_string(ptr: *mut u8) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr as *mut i8);
        }
    }
}

/// Helper for JSON success response
pub fn json_response<T: Serialize>(data: &T) -> Response {
    Response::ok().json(data)
}

/// Helper for error response
pub fn error_response(status: u16, message: &str) -> Response {
    Response::new(status).json(&serde_json::json!({"error": message}))
}
