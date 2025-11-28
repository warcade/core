//! # WebArcade Plugin API (Lightweight)
//!
//! Minimal API for building WebArcade plugins with fast compile times.
//! This crate provides only what's needed for FFI plugin communication.
//!
//! ## Quick Start
//!
//! ```rust
//! use api::prelude::*;
//!
//! pub struct MyPlugin;
//!
//! impl Plugin for MyPlugin {
//!     fn metadata(&self) -> PluginMetadata {
//!         PluginMetadata {
//!             id: "my-plugin".into(),
//!             name: "My Plugin".into(),
//!             version: "1.0.0".into(),
//!             description: "A plugin".into(),
//!             author: "You".into(),
//!             dependencies: vec![],
//!         }
//!     }
//! }
//! ```

// Core modules
pub mod plugin;
pub mod http;
pub mod ffi_http;

// Re-export core types
pub use plugin::{Plugin, PluginMetadata};
pub use http::{HttpRequest, HttpResponse, MultipartField, json_response, error_response};
pub use ffi_http::{Request as FfiRequest, Response as FfiResponse};

// Backward compatibility aliases
pub use http::HttpRequest as Request;
pub use http::HttpResponse as Response;

// Re-export dependencies for use in generated code
pub use serde::{Serialize, Deserialize};
pub use serde_json::{self, json, Value};
pub use base64;
pub use tokio;
pub use log;
pub use bytes::Bytes;

// Prelude for convenient imports
pub mod prelude {
    pub use crate::plugin::{Plugin, PluginMetadata};
    pub use crate::http::{HttpRequest, HttpResponse, MultipartField, json_response, error_response};
    pub use crate::ffi_http::{Request as FfiRequest, Response as FfiResponse};
    pub use serde::{Serialize, Deserialize};
    pub use serde_json::{json, Value};
}
