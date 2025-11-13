/// VTable for dynamic plugin FFI
///
/// This struct contains function pointers passed from the main binary.

use std::os::raw::c_char;

/// Function pointer types for the VTable
pub type RouterNewFn = extern "C" fn() -> *const ();
pub type RouterAddRouteFn = extern "C" fn(*mut (), *const u8, usize, *const u8, usize, *const u8, usize) -> i32;
pub type RegisterRouterFn = extern "C" fn(*const (), *const u8, usize, *const ());
pub type MigrateFn = extern "C" fn(*const (), *const *const u8, usize) -> i32;
pub type GetDatabaseFn = extern "C" fn(*const ()) -> *const ();
pub type EmitEventFn = extern "C" fn(*const (), *const u8, usize, *const u8, usize);
pub type DbQueryFn = extern "C" fn(*const (), *const u8, usize, *const u8, usize) -> *const u8;
pub type DbExecuteFn = extern "C" fn(*const (), *const u8, usize, *const u8, usize) -> i32;

/// VTable struct that contains all function pointers
#[repr(C)]
pub struct PluginVTable {
    pub router_new: RouterNewFn,
    pub router_add_route: RouterAddRouteFn,
    pub register_router: RegisterRouterFn,
    pub migrate: MigrateFn,
    pub get_database: GetDatabaseFn,
    pub emit_event: EmitEventFn,
    pub db_query: DbQueryFn,
    pub db_execute: DbExecuteFn,
}

/// FFI context that combines the PluginContext pointer with the VTable
#[repr(C)]
pub struct PluginFFIContext {
    pub ctx: *const (),
    pub vtable: *const PluginVTable,
}

// Thread safety markers
unsafe impl Send for PluginVTable {}
unsafe impl Sync for PluginVTable {}
unsafe impl Send for PluginFFIContext {}
unsafe impl Sync for PluginFFIContext {}
