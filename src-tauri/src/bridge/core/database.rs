// Database utilities for the plugin system
// Each plugin gets its own connection and manages its own schema

use anyhow::Result;
use std::path::PathBuf;

/// Get the path to the main database file
pub fn get_database_path() -> PathBuf {
    // Place the database in the same directory as the binary
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return exe_dir.join("database.db");
        }
    }

    // Fallback to current directory if we can't determine the executable path
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("database.db")
}

/// Ensure the database directory exists
pub fn ensure_database_dir() -> Result<()> {
    let db_path = get_database_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(())
}
