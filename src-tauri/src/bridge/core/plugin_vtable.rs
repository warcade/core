/// VTable for dynamic plugin FFI
///
/// This struct contains function pointers that are passed from the main binary
/// to dynamic plugins, allowing plugins to call back into the main binary.

use std::os::raw::c_char;

/// Function pointer types for the VTable
pub type RouterNewFn = extern "C" fn() -> *const ();
pub type RouterAddRouteFn = extern "C" fn(*mut (), *const u8, usize, *const u8, usize, *const u8, usize) -> i32;
pub type RegisterRouterFn = extern "C" fn(*const (), *const u8, usize, *const ());
pub type MigrateFn = extern "C" fn(*const (), *const *const u8, usize) -> i32;
pub type GetDatabaseFn = extern "C" fn(*const ()) -> *const ();
pub type EmitEventFn = extern "C" fn(*const (), *const u8, usize, *const u8, usize);

/// VTable struct that contains all function pointers
///
/// This is passed to the plugin during initialization, allowing it to call
/// back into the main binary without needing to resolve symbols.
#[repr(C)]
pub struct PluginVTable {
    pub router_new: RouterNewFn,
    pub router_add_route: RouterAddRouteFn,
    pub register_router: RegisterRouterFn,
    pub migrate: MigrateFn,
    pub get_database: GetDatabaseFn,
    pub emit_event: EmitEventFn,
}

/// Context struct that combines the PluginContext pointer with the VTable
#[repr(C)]
pub struct PluginFFIContext {
    pub ctx: *const (),
    pub vtable: *const PluginVTable,
}

impl PluginVTable {
    /// Create a new VTable with all the function pointers
    pub fn new() -> Self {
        Self {
            router_new: crate::bridge::core::plugin_exports::webarcade_router_new,
            router_add_route: crate::bridge::core::plugin_exports::webarcade_router_add_route,
            register_router: crate::bridge::core::plugin_exports::webarcade_register_router,
            migrate: crate::bridge::core::plugin_exports::webarcade_migrate,
            get_database: crate::bridge::core::plugin_exports::webarcade_get_database,
            emit_event: crate::bridge::core::plugin_exports::webarcade_emit_event,
        }
    }
}
