//! Database access

use anyhow::Result;
use serde::de::DeserializeOwned;
use crate::vtable::PluginVTable;

/// Database connection
pub struct Database {
    #[doc(hidden)]
    pub _internal: *const (),
    #[doc(hidden)]
    pub vtable: *const PluginVTable,
}

unsafe impl Send for Database {}
unsafe impl Sync for Database {}

impl Database {
    #[doc(hidden)]
    pub fn new_with_vtable(internal: *const (), vtable: *const PluginVTable) -> Self {
        Self { _internal: internal, vtable }
    }

    #[doc(hidden)]
    pub fn new(internal: *const ()) -> Self {
        Self { _internal: internal, vtable: std::ptr::null() }
    }

    /// Execute a query and return results
    pub fn query<T: DeserializeOwned>(&self, sql: &str, params: &serde_json::Value) -> Result<Vec<T>> {
        unsafe {
            let vtable = &*self.vtable;
            let params_str = serde_json::to_string(params)?;
            let result_ptr = (vtable.db_query)(
                self._internal,
                sql.as_ptr(),
                sql.len(),
                params_str.as_ptr(),
                params_str.len(),
            );

            if result_ptr.is_null() {
                return Err(anyhow::anyhow!("Query failed"));
            }

            let result_cstr = std::ffi::CStr::from_ptr(result_ptr as *const i8);
            let result_str = result_cstr.to_str()?;
            let rows: Vec<T> = serde_json::from_str(result_str)?;
            Ok(rows)
        }
    }

    /// Execute a write query (INSERT, UPDATE, DELETE)
    pub fn execute(&self, sql: &str, params: &serde_json::Value) -> Result<usize> {
        unsafe {
            let vtable = &*self.vtable;
            let params_str = serde_json::to_string(params)?;
            let result = (vtable.db_execute)(
                self._internal,
                sql.as_ptr(),
                sql.len(),
                params_str.as_ptr(),
                params_str.len(),
            );

            if result < 0 {
                return Err(anyhow::anyhow!("Execute failed"));
            }

            Ok(result as usize)
        }
    }
}
