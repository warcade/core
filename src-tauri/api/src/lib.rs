//! # WebArcade Plugin API
//!
//! This crate provides the official API for creating WebArcade plugins.
//!
//! ## Quick Start
//!
//! ```rust
//! use webarcade_api::prelude::*;
//!
//! pub struct MyPlugin;
//!
//! impl Plugin for MyPlugin {
//!     plugin_metadata!("my-plugin", "My Plugin", "1.0.0", "Description");
//!
//!     async fn init(&self, ctx: &Context) -> Result<()> {
//!         // Initialize your plugin
//!         Ok(())
//!     }
//! }
//! ```

// Core modules
pub mod plugin;
pub mod context;
pub mod router;
pub mod http;
pub mod database;
pub mod events;
pub mod macros;
pub mod vtable;

// Prelude for easy imports
pub mod prelude;

// Re-export commonly used types at the root
pub use plugin::{Plugin, PluginMetadata};
pub use context::Context;
pub use router::Router;
pub use http::{HttpResponse, HttpRequest, json_response, error_response};
pub use database::Database;
pub use events::Event;

// Re-export from dependencies
pub use async_trait::async_trait;
pub use anyhow::{Result, Error};
pub use serde::{Serialize, Deserialize};
pub use serde_json::{json, Value};
pub use serde_json;

// Re-export HTTP and async runtime dependencies
pub use hyper;
pub use http_body_util;
pub use tokio;
pub use log;
