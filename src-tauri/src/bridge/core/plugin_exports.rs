// Export functions that dynamic plugins will call
// These are the implementations that webarcade_api::Context calls

use crate::core::plugin_context::PluginContext;
use crate::core::plugin_router::PluginRouter;
use std::ffi::CStr;
use std::os::raw::c_char;
use hyper::Method;
use std::collections::HashMap;
use std::sync::{Mutex, Arc};
use once_cell::sync::Lazy;
use libloading::Library;

// Global registry to track plugin_id -> Library mapping
pub static PLUGIN_LIBRARIES: Lazy<Mutex<HashMap<String, Arc<Library>>>> = Lazy::new(|| Mutex::new(HashMap::new()));

/// Register a plugin library for handler lookups
pub fn register_plugin_library(plugin_id: String, library: Arc<Library>) {
    let mut libs = PLUGIN_LIBRARIES.lock().unwrap();
    libs.insert(plugin_id, library);
}

/// Create a new router
#[no_mangle]
pub extern "C" fn webarcade_router_new() -> *const () {
    let router = Box::new(PluginRouter::new());
    Box::into_raw(router) as *const ()
}

/// Add a route to a router
///
/// This takes the router pointer, HTTP method, path, and a handler function name.
/// The handler function name is used to look up the actual handler in the DLL later.
#[no_mangle]
pub extern "C" fn webarcade_router_add_route(
    router: *mut (),
    method: *const u8,
    method_len: usize,
    path: *const u8,
    path_len: usize,
    handler_name: *const u8,
    handler_name_len: usize,
) -> i32 {
    unsafe {
        // Reconstruct strings
        let method_bytes = std::slice::from_raw_parts(method, method_len);
        log::info!("[FFI] method pointer: {:?}, len: {}, bytes: {:?}", method, method_len, method_bytes);
        let method_str = match std::str::from_utf8(method_bytes) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in method: {}", e);
                return -1;
            }
        };

        let path_bytes = std::slice::from_raw_parts(path, path_len);
        log::info!("[FFI] path pointer: {:?}, len: {}, bytes: {:?}", path, path_len, path_bytes);
        let path_str = match std::str::from_utf8(path_bytes) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in path: {}", e);
                return -1;
            }
        };

        let handler_name_bytes = std::slice::from_raw_parts(handler_name, handler_name_len);
        let handler_name_str = match std::str::from_utf8(handler_name_bytes) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in handler_name: {}", e);
                return -1;
            }
        };

        // Parse HTTP method
        let http_method = match method_str {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            _ => {
                log::error!("[FFI] Unknown HTTP method: {}", method_str);
                return -1;
            }
        };

        // Get mutable reference to router
        let router_ref = &mut *(router as *mut PluginRouter);

        // Store route metadata
        // The actual handler will be looked up from the DLL when the route is called
        log::info!("[FFI] Adding route: {} {} -> {}", method_str, path_str, handler_name_str);

        // Create a handler that will look up and call the function from the DLL
        let handler_name_owned = handler_name_str.to_string();

        let handler = move |path_arg: String, query: String, req: hyper::Request<hyper::body::Incoming>| {
            let handler_name = handler_name_owned.clone();

            Box::pin(async move {
                use http_body_util::Full;
                use hyper::body::Bytes;
                use http_body_util::combinators::BoxBody;

                log::info!("[FFI] Route handler called: {}", handler_name);

                // TODO: This runtime route registration via FFI is being phased out
                // Routes should be registered by reading the routes.json manifest file instead
                let json_response = serde_json::json!({
                    "error": "Runtime FFI route registration is deprecated. Routes should be loaded from manifest."
                }).to_string();

                hyper::Response::builder()
                    .status(200)
                    .header("Content-Type", "application/json")
                    .body(BoxBody::new(Full::new(Bytes::from(json_response))))
                    .unwrap()
            }) as std::pin::Pin<Box<dyn std::future::Future<Output = hyper::Response<http_body_util::combinators::BoxBody<hyper::body::Bytes, std::convert::Infallible>>> + Send>>
        };

        router_ref.route(http_method, path_str, handler);

        0
    }
}

/// Register a router for a plugin
#[no_mangle]
pub extern "C" fn webarcade_register_router(
    ctx: *const (),
    plugin_id: *const u8,
    plugin_id_len: usize,
    router: *const ()
) {
    unsafe {
        let ctx_ref = &*(ctx as *const PluginContext);
        let plugin_id_bytes = std::slice::from_raw_parts(plugin_id, plugin_id_len);
        let plugin_id_str = match std::str::from_utf8(plugin_id_bytes) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in plugin_id: {}", e);
                return;
            }
        };

        let router_box = Box::from_raw(router as *mut PluginRouter);
        let router_owned = *router_box;

        let ctx_clone = ctx_ref.clone();
        let plugin_id_owned = plugin_id_str.to_string();
        tokio::spawn(async move {
            ctx_clone.register_router(&plugin_id_owned, router_owned).await;
            log::info!("[FFI] Registered router for plugin: {}", plugin_id_owned);
        });
    }
}

/// Run database migrations
#[no_mangle]
pub extern "C" fn webarcade_migrate(
    ctx: *const (),
    migrations: *const *const u8,
    count: usize
) -> i32 {
    unsafe {
        let ctx = &*(ctx as *const PluginContext);
        let migrations_slice = std::slice::from_raw_parts(migrations, count);

        let mut migration_strings = Vec::new();
        for &migration_ptr in migrations_slice {
            let c_str = CStr::from_ptr(migration_ptr as *const c_char);
            migration_strings.push(c_str.to_string_lossy().into_owned());
        }

        let migration_refs: Vec<&str> = migration_strings.iter().map(|s| s.as_str()).collect();

        match ctx.migrate(&migration_refs) {
            Ok(_) => 0,
            Err(e) => {
                log::error!("[FFI] Migration failed: {}", e);
                -1
            }
        }
    }
}

/// Get database handle (returns null for now)
#[no_mangle]
pub extern "C" fn webarcade_get_database(_ctx: *const ()) -> *const () {
    std::ptr::null()
}

/// Execute a database query
#[no_mangle]
pub extern "C" fn webarcade_db_query(
    _db: *const (),
    _sql: *const u8,
    _sql_len: usize,
    _params: *const u8,
    _params_len: usize
) -> *const u8 {
    // TODO: Implement database query
    std::ptr::null()
}

/// Execute a database command (INSERT/UPDATE/DELETE)
#[no_mangle]
pub extern "C" fn webarcade_db_execute(
    _db: *const (),
    _sql: *const u8,
    _sql_len: usize,
    _params: *const u8,
    _params_len: usize
) -> i32 {
    // TODO: Implement database execute
    -1
}

/// Get the last inserted row ID
#[no_mangle]
pub extern "C" fn webarcade_db_last_insert_rowid(_db: *const ()) -> i64 {
    // TODO: Implement last_insert_rowid
    -1
}

/// Emit an event
#[no_mangle]
pub extern "C" fn webarcade_emit_event(
    ctx: *const (),
    event_name: *const u8,
    event_name_len: usize,
    data: *const u8,
    data_len: usize
) {
    unsafe {
        let ctx = &*(ctx as *const PluginContext);
        let event_name_slice = std::slice::from_raw_parts(event_name, event_name_len);
        let event_name_str = match std::str::from_utf8(event_name_slice) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in event_name: {}", e);
                return;
            }
        };
        let data_slice = std::slice::from_raw_parts(data, data_len);
        let data_str = match std::str::from_utf8(data_slice) {
            Ok(s) => s,
            Err(e) => {
                log::error!("[FFI] Invalid UTF-8 in event data: {}", e);
                return;
            }
        };

        let json_data: serde_json::Value = match serde_json::from_str(data_str) {
            Ok(v) => v,
            Err(e) => {
                log::error!("[FFI] Invalid JSON in event data: {}", e);
                return;
            }
        };

        ctx.emit(event_name_str, &json_data);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exports_exist() {
        let _ = webarcade_router_new as extern "C" fn() -> *const ();
        let _ = webarcade_router_add_route as extern "C" fn(*mut (), *const u8, usize, *const u8, usize, *const u8, usize) -> i32;
        let _ = webarcade_register_router as extern "C" fn(*const (), *const u8, usize, *const ());
        let _ = webarcade_migrate as extern "C" fn(*const (), *const *const u8, usize) -> i32;
        let _ = webarcade_get_database as extern "C" fn(*const ()) -> *const ();
        let _ = webarcade_emit_event as extern "C" fn(*const (), *const u8, usize, *const u8, usize);
    }
}
