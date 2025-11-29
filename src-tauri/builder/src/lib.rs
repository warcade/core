//! WebArcade Plugin Builder
//!
//! This crate provides build functionality for WebArcade plugins.
//! It handles:
//! - Rust backend compilation (generating FFI wrappers)
//! - Frontend bundling (via the bundler script)
//! - Package creation and installation

mod plugin_builder;

pub use plugin_builder::{
    BuildLog, BuildProgress, BuildResult, LogCallback, PluginBuilder,
    build_plugin, build_plugin_with_callback
};
