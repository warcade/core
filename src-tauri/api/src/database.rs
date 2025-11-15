//! Database access module
//!
//! Provides a clean interface for SQLite database operations.
//!
//! # Examples
//!
//! ```rust
//! use webarcade_api::database::Database;
//! use serde_json::json;
//!
//! async fn example(db: &Database) -> Result<()> {
//!     // Query with positional parameters
//!     let notes: Vec<Note> = db.query(
//!         "SELECT * FROM notes WHERE id = ?",
//!         &json!([123])
//!     )?;
//!
//!     // Execute INSERT/UPDATE/DELETE
//!     db.execute(
//!         "INSERT INTO notes (title, content) VALUES (?1, ?2)",
//!         &json!(["Title", "Content"])
//!     )?;
//!
//!     // Get last inserted ID
//!     let id = db.last_insert_rowid();
//!
//!     Ok(())
//! }
//! ```

use anyhow::Result;
use serde::de::DeserializeOwned;
use crate::vtable::PluginVTable;

/// Database connection with SQLite backend
///
/// Parameters are passed as JSON arrays for positional binding:
/// - `json!([value1, value2])` binds to `?1, ?2`
/// - Empty array `json!([])` for queries with no parameters
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

    /// Execute a SELECT query and return results
    ///
    /// # Arguments
    /// * `sql` - SQL query string with `?` or `?N` placeholders
    /// * `params` - JSON array of parameter values: `&json!([val1, val2])`
    ///
    /// # Examples
    /// ```rust
    /// // Query all notes
    /// let notes: Vec<Note> = db.query("SELECT * FROM notes", &json!([]))?;
    ///
    /// // Query with parameters
    /// let note: Vec<Note> = db.query(
    ///     "SELECT * FROM notes WHERE id = ?",
    ///     &json!([note_id])
    /// )?;
    /// ```
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

    /// Execute an INSERT, UPDATE, or DELETE query
    ///
    /// # Arguments
    /// * `sql` - SQL query string with `?` or `?N` placeholders
    /// * `params` - JSON array of parameter values: `&json!([val1, val2])`
    ///
    /// # Returns
    /// Number of affected rows
    ///
    /// # Examples
    /// ```rust
    /// // Insert a new note
    /// db.execute(
    ///     "INSERT INTO notes (title, content) VALUES (?1, ?2)",
    ///     &json!(["My Note", "Content here"])
    /// )?;
    ///
    /// // Update existing note
    /// db.execute(
    ///     "UPDATE notes SET title = ? WHERE id = ?",
    ///     &json!(["New Title", 123])
    /// )?;
    ///
    /// // Delete a note
    /// db.execute("DELETE FROM notes WHERE id = ?", &json!([123]))?;
    /// ```
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

    /// Get the row ID of the last successful INSERT
    ///
    /// # Examples
    /// ```rust
    /// db.execute(
    ///     "INSERT INTO notes (title) VALUES (?)",
    ///     &json!(["My Note"])
    /// )?;
    ///
    /// let note_id = db.last_insert_rowid();
    /// println!("Created note with ID: {}", note_id);
    /// ```
    pub fn last_insert_rowid(&self) -> i64 {
        unsafe {
            let vtable = &*self.vtable;
            (vtable.db_last_insert_rowid)(self._internal)
        }
    }
}
