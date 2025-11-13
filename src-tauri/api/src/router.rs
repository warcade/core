//! Router for handling HTTP requests

use crate::vtable::PluginVTable;

/// Plugin router
///
/// Register routes for your plugin using the `route!` macro
pub struct Router {
    #[doc(hidden)]
    pub _internal: *const (),
    #[doc(hidden)]
    vtable: *const PluginVTable,
}

unsafe impl Send for Router {}
unsafe impl Sync for Router {}

impl Router {
    /// Create a new router
    ///
    /// Note: This requires a VTable to be available. It should only be called
    /// from within plugin init/start functions where the context is available.
    pub fn new() -> Self {
        // Get the vtable from thread-local storage set by the plugin entry point
        let vtable = PLUGIN_VTABLE.with(|v| {
            v.get().expect("Router::new() called without VTable")
        });

        unsafe {
            let ptr = ((*vtable).router_new)();
            log::info!("[Router::new] Created router with pointer: {:?}, vtable: {:?}", ptr, vtable);
            Self {
                _internal: ptr,
                vtable,
            }
        }
    }

    /// Add a route to this router
    ///
    /// This is called by the `route!` macro
    pub fn add_route(&mut self, method: &str, path: &str, handler_name: &str) {
        log::info!("[Router::add_route] method='{}', path='{}', handler='{}', router_ptr={:?}",
                   method, path, handler_name, self._internal);
        unsafe {
            let vtable = &*self.vtable;
            let result = (vtable.router_add_route)(
                self._internal as *mut (),
                method.as_ptr(),
                method.len(),
                path.as_ptr(),
                path.len(),
                handler_name.as_ptr(),
                handler_name.len(),
            );
            if result != 0 {
                log::error!("Failed to add route: {} {}", method, path);
            }
        }
    }
}

impl Default for Router {
    fn default() -> Self {
        Self::new()
    }
}

// Thread-local storage for the VTable
thread_local! {
    static PLUGIN_VTABLE: std::cell::Cell<Option<*const PluginVTable>> = std::cell::Cell::new(None);
}

/// Set the plugin VTable for the current thread
///
/// This should be called by the plugin entry point before any plugin code runs
#[doc(hidden)]
pub fn set_vtable(vtable: *const PluginVTable) {
    PLUGIN_VTABLE.with(|v| v.set(Some(vtable)));
}
