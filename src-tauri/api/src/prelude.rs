//! Prelude module - import everything you need with one line
//!
//! ```rust
//! use webarcade_api::prelude::*;
//! ```

pub use crate::plugin::{Plugin, PluginMetadata};
pub use crate::context::Context;
pub use crate::router::Router;
pub use crate::http::{HttpResponse, HttpRequest, json_response, error_response, full_body};
pub use crate::database::Database;
pub use crate::events::Event;

// Re-export macros
pub use crate::{plugin_metadata, route};

// Common external dependencies
pub use async_trait::async_trait;
pub use anyhow::{Result, Error, anyhow};
pub use serde::{Serialize, Deserialize};
pub use serde_json::{json, Value};
pub use log::{info, warn, error, debug};

// HTTP types
pub use hyper::{StatusCode, Method};
pub use hyper::body::Bytes;
