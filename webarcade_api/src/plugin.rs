//! Plugin trait and metadata definitions

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use std::sync::Arc;
use crate::context::Context;

/// Plugin metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub dependencies: Vec<String>,
}

/// Plugin lifecycle trait - all plugins must implement this
#[async_trait]
pub trait Plugin: Send + Sync {
    /// Get plugin metadata
    fn metadata(&self) -> PluginMetadata;

    /// Initialize plugin (run migrations, register services, set up routes)
    /// Called once during server startup, before start()
    async fn init(&self, ctx: &Context) -> Result<()> {
        Ok(())
    }

    /// Start plugin (begin background tasks, subscribe to events, connect to external services)
    /// Called after all plugins have been initialized
    async fn start(&self, ctx: Arc<Context>) -> Result<()> {
        Ok(())
    }

    /// Stop plugin (cleanup, disconnect)
    /// Called during server shutdown
    async fn stop(&self) -> Result<()> {
        Ok(())
    }

    /// Health check (optional)
    async fn health_check(&self) -> Result<()> {
        Ok(())
    }
}
