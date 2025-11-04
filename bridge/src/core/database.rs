// Database utilities for the plugin system
// Each plugin gets its own connection and manages its own schema

use anyhow::Result;
use std::path::PathBuf;

/// Get the path to the main database file
pub fn get_database_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".webarcade").join("webarcade.db")
}

/// Ensure the database directory exists
pub fn ensure_database_dir() -> Result<()> {
    let db_path = get_database_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    Ok(())
}
