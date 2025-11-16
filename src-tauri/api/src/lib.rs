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
pub mod time;
pub mod ffi_http;

// WebArcade API Suite - Complete toolkit for plugin development
pub mod json;
pub mod form;
pub mod encoding;
pub mod crypto;
pub mod validate;
pub mod text;
pub mod path;
pub mod fs;
pub mod env;
pub mod sys;
pub mod error;
pub mod collections;
pub mod fetch;
pub mod process;
pub mod cache;
pub mod state;
pub mod schedule;
pub mod archive;
pub mod regex_utils;
pub mod mime;
pub mod websocket;
pub mod csv;
pub mod ini;
pub mod template;
pub mod query;
pub mod test_suite;

// Core module - import everything you need with one line
pub mod core;

// Re-export commonly used types at the root
pub use plugin::{Plugin, PluginMetadata};
pub use context::Context;
pub use router::Router;
pub use http::{HttpResponse, HttpRequest, json_response, error_response};
pub use database::Database;
pub use events::Event;

// Re-export from dependencies (both as items and as modules for derive macros)
pub use async_trait::async_trait;
pub use anyhow::{Result, Error};
pub use serde::{Serialize, Deserialize};
pub use serde_json::{json, Value};

// Re-export as modules so derive macros can find them
pub use serde;
pub use serde_json;

// Re-export HTTP and async runtime dependencies
pub use hyper;
pub use http_body_util;
pub use tokio;
pub use log;

// Re-export time utilities
pub use chrono;

// Re-export common utilities
pub use regex;
pub use uuid;
pub use base64;
pub use rand;
