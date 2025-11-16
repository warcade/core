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

// FFI HTTP types for runtime (DLL) plugins
pub use crate::ffi_http::{
    Request as FFIRequest,
    Response as FFIResponse,
    json_response as ffi_json_response,
    error_response as ffi_error_response,
    success_response as ffi_success_response,
    free_string,
};
pub use crate::ffi_handler;

// Time utilities (as a module, not individual functions)
pub use crate::time;

// Macros
pub use crate::{plugin_metadata, route};

// External dependencies - Async traits
pub use async_trait::async_trait;

// External dependencies - Error handling (keep anyhow for backward compatibility)
pub use anyhow::{Result as AnyhowResult, Error as AnyhowError, anyhow};

// External dependencies - Serialization
pub use serde::{Serialize, Deserialize};
pub use serde_json::{json, Value};

// External dependencies - Logging
pub use log::{self, info, warn, error, debug, trace};

// External dependencies - Time utilities
pub use chrono;

// External dependencies - Common utilities (backward compatibility)
pub use regex;
pub use uuid;
pub use base64;
pub use rand;

// ============================================================================
// WebArcade API Suite - FFI-Safe Utilities
// ============================================================================

// JSON utilities
pub use crate::json::{Json, JsonBuilder};

// Form data parsing
pub use crate::form::{MultipartForm, MultipartField as FormField, UrlEncodedForm};

// Encoding utilities
pub use crate::encoding::{Base64, Hex, UrlEncoding, HtmlEncoding, BinaryData};

// Cryptographic utilities
pub use crate::crypto::{Hashing, Random, Uuid, Token, XorCipher};

// Validation utilities
pub use crate::validate::{
    ValidationResult, Email, Url, StringValidation, NumberValidation,
    Password, FileValidation
};

// Text manipulation
pub use crate::text::{Text, StringDistance};

// Path utilities
pub use crate::path::{Path, PathBuilder};

// File system operations
pub use crate::fs::{Fs, FileInfo, FileReader, FileWriter};

// Environment variables
pub use crate::env::{Env, EnvConfig};

// System information
pub use crate::sys::{Sys, SystemInfo, Process, Timing, Stopwatch, RateLimiter};

// Error handling (WebArcade native)
pub use crate::error::{
    Error as WaError,
    Result as WaResult,
    ErrorCode,
    ResultExt,
    OptionExt
};

// Collections and data structures
pub use crate::collections::{LruCache, RingBuffer, Counter, BatchProcessor, VecUtils};

// HTTP client
pub use crate::fetch::{Fetch, FetchRequest, FetchResponse, HttpMethod, UrlParts};

// Process execution
pub use crate::process::{Command, CommandOutput, Shell, Exec};

// Caching
pub use crate::cache::{TtlCache, Memo, Store};

// State management
pub use crate::state::{State, PluginState, Counter as AtomicCounter, Observable};

// Scheduling
pub use crate::schedule::{
    Scheduler, ScheduledTask, Interval,
    Debouncer, Throttler, Retry
};

// Archive/compression
pub use crate::archive::{ArchiveBuilder, ZipReader, ArchiveEntry, Compress};

// Regex utilities
pub use crate::regex_utils::{Regex as Re, Match as ReMatch, Capture as ReCapture, Patterns};

// MIME types
pub use crate::mime::{Mime, MimeType};

// WebSocket client
pub use crate::websocket::{
    WebSocket, WsClient, WsClientBuilder, WsMessage, WsEvent, WsState,
    WsConfig, CloseFrame, WsHandler
};

// CSV parsing (pure Rust)
pub use crate::csv::{Csv, CsvBuilder, CsvOptions};

// INI/Config parsing (pure Rust)
pub use crate::ini::{Ini, IniBuilder};

// Template engine (pure Rust)
pub use crate::template::{Template, TemplateBuilder};

// Query string utilities (pure Rust)
pub use crate::query::{QueryString, QueryBuilder};

// API Test Suite
pub use crate::test_suite::{ApiTestSuite, TestResult, TestSummary};
