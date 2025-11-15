//! Plugin context - provides access to core WebArcade services

use anyhow::Result;
use crate::router::Router;
use crate::database::Database;
use crate::vtable::{PluginFFIContext, PluginVTable};
use std::sync::OnceLock;

static GLOBAL_CONTEXT: OnceLock<Context> = OnceLock::new();

/// Plugin context - provides access to core services
///
/// This struct is passed to your plugin during initialization and provides
/// access to database, routing, events, and other WebArcade services.
#[derive(Clone)]
pub struct Context {
    /// Internal pointer to the actual context in the main binary
    _internal: *const (),
    /// VTable containing function pointers to call back into the main binary
    vtable: *const PluginVTable,
}

// Ensure Context can be shared across threads
unsafe impl Send for Context {}
unsafe impl Sync for Context {}

impl Context {
    /// Create a new context from an FFI context pointer
    #[doc(hidden)]
    pub fn from_ffi(ffi_ctx: *const ()) -> Self {
        unsafe {
            let ffi = &*(ffi_ctx as *const PluginFFIContext);
            let ctx = Self {
                _internal: ffi.ctx,
                vtable: ffi.vtable,
            };
            // Store in global context for handler access
            let _ = GLOBAL_CONTEXT.set(ctx.clone());
            ctx
        }
    }

    /// Get the global context (available after init)
    pub fn global() -> &'static Context {
        GLOBAL_CONTEXT.get().expect("Context not initialized - make sure Plugin::init was called")
    }

    /// Get the VTable
    fn vtable(&self) -> &PluginVTable {
        unsafe { &*self.vtable }
    }

    /// Register a router for this plugin
    ///
    /// All routes registered on this router will be prefixed with `/plugin_name/`
    ///
    /// # Example
    /// ```
    /// # use webarcade_api::prelude::*;
    /// # async fn example(ctx: &Context) -> Result<()> {
    /// let mut router = Router::new();
    /// // Add routes to router...
    /// ctx.register_router("my_plugin", router).await;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn register_router(&self, plugin_id: &str, router: Router) {
        let vtable = unsafe { self.vtable() };
        unsafe {
            (vtable.register_router)(self._internal, plugin_id.as_ptr(), plugin_id.len(), router._internal);
        }
    }

    /// Run database migrations
    ///
    /// # Example
    /// ```
    /// # use webarcade_api::prelude::*;
    /// # fn example(ctx: &Context) -> Result<()> {
    /// ctx.migrate(&[
    ///     r"CREATE TABLE IF NOT EXISTS my_table (
    ///         id INTEGER PRIMARY KEY,
    ///         name TEXT NOT NULL
    ///     )"
    /// ])?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn migrate(&self, migrations: &[&str]) -> Result<()> {
        let vtable = unsafe { self.vtable() };
        let result = unsafe {
            (vtable.migrate)(
                self._internal,
                migrations.as_ptr() as *const *const u8,
                migrations.len(),
            )
        };
        if result == 0 {
            Ok(())
        } else {
            Err(anyhow::anyhow!("Migration failed"))
        }
    }

    /// Get database connection
    pub fn db(&self) -> Database {
        let vtable = unsafe { self.vtable() };
        let db_ptr = unsafe { (vtable.get_database)(self._internal) };
        Database::new_with_vtable(db_ptr, self.vtable)
    }

    /// Emit an event
    ///
    /// # Example
    /// ```
    /// # use webarcade_api::prelude::*;
    /// # async fn example(ctx: &Context) {
    /// ctx.emit("my_plugin:event", serde_json::json!({
    ///     "data": "value"
    /// })).await;
    /// # }
    /// ```
    pub async fn emit(&self, event_name: &str, data: serde_json::Value) {
        let vtable = unsafe { self.vtable() };
        let data_str = serde_json::to_string(&data).unwrap();
        unsafe {
            (vtable.emit_event)(
                self._internal,
                event_name.as_ptr(),
                event_name.len(),
                data_str.as_ptr(),
                data_str.len(),
            );
        }
    }
}
