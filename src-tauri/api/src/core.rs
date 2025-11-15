//! Core module - import everything you need with one line
//!
//! The core module includes the most commonly used items for plugin development.
//!
//! # Usage
//!
//! ```rust
//! use api::core::*;
//!
//! // Now you have access to:
//! // - Plugin trait and metadata macros
//! // - Context for accessing WebArcade services
//! // - Database for SQL queries
//! // - HTTP types (Request, Response, StatusCode)
//! // - Router and routing macros
//! // - Serialization (Serialize, Deserialize, json!)
//! // - Error handling (Result, Error, anyhow!)
//! // - Logging (info!, error!, warn!, debug!)
//! // - Time utilities (time module)
//! ```
//!
//! # What's Included
//!
//! ## Core Types
//! - `Plugin` - Trait for implementing plugins
//! - `Context` - Access to WebArcade services (database, events, etc.)
//! - `Database` - SQL database operations
//! - `Router` - HTTP routing
//!
//! ## HTTP
//! - `HttpRequest` / `HttpResponse` - HTTP request/response types
//! - `StatusCode` - HTTP status codes
//! - `json_response()` - Create JSON responses
//! - `error_response()` - Create error responses
//!
//! ## Macros
//! - `plugin_metadata!()` - Define plugin metadata
//! - `route!()` - Register routes
//! - `json!()` - Create JSON values
//! - `info!()`, `error!()`, `warn!()`, `debug!()` - Logging
//!
//! ## Utilities
//! - `time` - Time utilities (timestamps, formatting)
//! - `Serialize`, `Deserialize` - Serde traits
//! - `Result`, `Error` - Error handling types
//!
//! # Alternative: Explicit Imports
//!
//! If you prefer explicit imports over the core module:
//!
//! ```rust
//! use api::plugin::Plugin;
//! use api::context::Context;
//! use api::database::Database;
//! use api::http::{HttpRequest, HttpResponse};
//! use api::time;
//! ```

// Core plugin types
pub use crate::plugin::{Plugin, PluginMetadata};
pub use crate::context::Context;
pub use crate::router::Router;
pub use crate::database::Database;
pub use crate::events::Event;

// HTTP types and helpers
pub use crate::http::{HttpResponse, HttpRequest, json_response, error_response, full_body};
pub use hyper::{StatusCode, Method};
pub use hyper::body::Bytes;

// Time utilities (as a module, not individual functions)
pub use crate::time;

// Macros
pub use crate::{plugin_metadata, route};

// External dependencies - Async traits
pub use async_trait::async_trait;

// External dependencies - Error handling
pub use anyhow::{Result, Error, anyhow};

// External dependencies - Serialization
pub use serde::{Serialize, Deserialize};
pub use serde_json::{json, Value};

// External dependencies - Logging
pub use log::{self, info, warn, error, debug, trace};

// External dependencies - Time utilities
pub use chrono;

// External dependencies - Common utilities
pub use regex;
pub use uuid;
pub use base64;
pub use rand;
