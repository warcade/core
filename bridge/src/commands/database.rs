use rusqlite::{Connection, Result};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

/// Thread-safe database connection pool
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    /// Create or open the database
    pub fn new() -> Result<Self> {
        let mut db_path = PathBuf::from("data");
        std::fs::create_dir_all(&db_path).ok();
        db_path.push("counters.db");

        let conn = Connection::open(db_path)?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS counters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                task TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0,
                last_updated INTEGER NOT NULL,
                UNIQUE(channel, task)
            )",
            [],
        )?;

        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_channel_task ON counters(channel, task)",
            [],
        )?;

        // Create todos table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS todos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                task TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                completed_at INTEGER
            )",
            [],
        )?;

        // Create index for todos
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(channel, username, completed)",
            [],
        )?;

        // Create TTS settings table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tts_settings (
                channel TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 0
            )",
            [],
        )?;

        // Migrate existing tts_settings table to add mode column
        // Check if mode column exists, if not add it
        let mode_exists: Result<i64, _> = conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('tts_settings') WHERE name='mode'",
            [],
            |row| row.get(0)
        );

        if let Ok(0) = mode_exists {
            conn.execute(
                "ALTER TABLE tts_settings ADD COLUMN mode TEXT NOT NULL DEFAULT 'broadcaster'",
                [],
            )?;
            log::info!("✅ Migrated tts_settings table to add mode column");
        }

        // Create TTS users whitelist table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tts_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                username TEXT NOT NULL,
                UNIQUE(channel, username)
            )",
            [],
        )?;

        // Create index for TTS users
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tts_users ON tts_users(channel, username)",
            [],
        )?;

        log::info!("✅ Database initialized: data/counters.db");

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Get counter value
    pub fn get_count(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
        )?;

        let count = stmt.query_row([channel, task], |row| row.get(0))
            .unwrap_or(0);

        Ok(count)
    }

    /// Increment counter
    pub fn increment(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO counters (channel, task, count, last_updated) VALUES (?1, ?2, 1, ?3)
             ON CONFLICT(channel, task) DO UPDATE SET count = count + 1, last_updated = ?3",
            [channel, task, &timestamp.to_string()],
        )?;

        // Get the new count
        let mut stmt = conn.prepare(
            "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
        )?;

        let count: i64 = stmt.query_row([channel, task], |row| row.get(0))?;

        Ok(count)
    }

    /// Decrement counter
    pub fn decrement(&self, channel: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        // First check if counter exists
        let current: i64 = {
            let mut stmt = conn.prepare(
                "SELECT count FROM counters WHERE channel = ?1 AND task = ?2"
            )?;
            stmt.query_row([channel, task], |row| row.get(0))
                .unwrap_or(0)
        };

        if current <= 0 {
            return Ok(0);
        }

        conn.execute(
            "UPDATE counters SET count = count - 1, last_updated = ?3
             WHERE channel = ?1 AND task = ?2",
            [channel, task, &timestamp.to_string()],
        )?;

        Ok(current - 1)
    }

    /// Get all counters for a channel
    pub fn get_all_counts(&self, channel: &str) -> Result<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT task, count FROM counters WHERE channel = ?1 AND count > 0 ORDER BY count DESC"
        )?;

        let rows = stmt.query_map([channel], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Reset a specific counter
    pub fn reset(&self, channel: &str, task: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO counters (channel, task, count, last_updated) VALUES (?1, ?2, 0, ?3)
             ON CONFLICT(channel, task) DO UPDATE SET count = 0, last_updated = ?3",
            [channel, task, &timestamp.to_string()],
        )?;

        Ok(())
    }

    // === TODO METHODS ===

    /// Add a todo for a user
    pub fn add_todo(&self, channel: &str, username: &str, task: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO todos (channel, username, task, created_at) VALUES (?1, ?2, ?3, ?4)",
            [channel, username, task, &timestamp.to_string()],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Get all todos for a user (incomplete only)
    pub fn get_user_todos(&self, channel: &str, username: &str) -> Result<Vec<(i64, String)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, task FROM todos WHERE channel = ?1 AND username = ?2 AND completed = 0 ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map([channel, username], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Mark todo as complete
    pub fn complete_todo(&self, channel: &str, username: &str, todo_id: i64) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let timestamp = chrono::Utc::now().timestamp();

        let rows_affected = conn.execute(
            "UPDATE todos SET completed = 1, completed_at = ?4 WHERE id = ?1 AND channel = ?2 AND username = ?3 AND completed = 0",
            [&todo_id.to_string(), channel, username, &timestamp.to_string()],
        )?;

        Ok(rows_affected > 0)
    }

    /// Remove a todo (delete)
    pub fn remove_todo(&self, channel: &str, username: &str, todo_id: i64) -> Result<bool> {
        let conn = self.conn.lock().unwrap();

        let rows_affected = conn.execute(
            "DELETE FROM todos WHERE id = ?1 AND channel = ?2 AND username = ?3",
            [&todo_id.to_string(), channel, username],
        )?;

        Ok(rows_affected > 0)
    }

    /// Get todo count for a user
    pub fn get_todo_count(&self, channel: &str, username: &str) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM todos WHERE channel = ?1 AND username = ?2 AND completed = 0"
        )?;

        let count: i64 = stmt.query_row([channel, username], |row| row.get(0))?;

        Ok(count as usize)
    }

    // === TTS METHODS ===

    /// Check if TTS is enabled for a channel
    pub fn is_tts_enabled(&self, channel: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT enabled FROM tts_settings WHERE channel = ?1"
        )?;

        let enabled: i64 = stmt.query_row([channel], |row| row.get(0))
            .unwrap_or(0);

        Ok(enabled == 1)
    }

    /// Set TTS state for a channel
    pub fn set_tts_enabled(&self, channel: &str, enabled: bool) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let enabled_val = if enabled { 1 } else { 0 };

        conn.execute(
            "INSERT INTO tts_settings (channel, enabled) VALUES (?1, ?2)
             ON CONFLICT(channel) DO UPDATE SET enabled = ?2",
            [channel, &enabled_val.to_string()],
        )?;

        Ok(())
    }

    /// Get TTS mode for a channel (broadcaster, whitelist, everyone)
    pub fn get_tts_mode(&self, channel: &str) -> Result<String> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT mode FROM tts_settings WHERE channel = ?1"
        )?;

        let mode: String = stmt.query_row([channel], |row| row.get(0))
            .unwrap_or_else(|_| "broadcaster".to_string());

        Ok(mode)
    }

    /// Set TTS mode for a channel
    pub fn set_tts_mode(&self, channel: &str, mode: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            "INSERT INTO tts_settings (channel, enabled, mode) VALUES (?1, 1, ?2)
             ON CONFLICT(channel) DO UPDATE SET mode = ?2",
            [channel, mode],
        )?;

        Ok(())
    }

    /// Add user to TTS whitelist
    pub fn add_tts_user(&self, channel: &str, username: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        conn.execute(
            "INSERT OR IGNORE INTO tts_users (channel, username) VALUES (?1, ?2)",
            [channel, &username_lower],
        )?;

        Ok(())
    }

    /// Remove user from TTS whitelist
    pub fn remove_tts_user(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();

        let rows_affected = conn.execute(
            "DELETE FROM tts_users WHERE channel = ?1 AND username = ?2",
            [channel, &username_lower],
        )?;

        Ok(rows_affected > 0)
    }

    /// Check if user is on TTS whitelist
    pub fn is_tts_user(&self, channel: &str, username: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let username_lower = username.to_lowercase();
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM tts_users WHERE channel = ?1 AND username = ?2"
        )?;

        let count: i64 = stmt.query_row([channel, &username_lower], |row| row.get(0))?;

        Ok(count > 0)
    }

    /// Get all TTS whitelisted users for a channel
    pub fn get_tts_users(&self, channel: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT username FROM tts_users WHERE channel = ?1 ORDER BY username ASC"
        )?;

        let rows = stmt.query_map([channel], |row| row.get(0))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    /// Check if user has TTS privileges based on mode and whitelist
    pub fn has_tts_privilege(&self, channel: &str, username: &str, is_broadcaster: bool) -> Result<bool> {
        let mode = self.get_tts_mode(channel)?;

        match mode.as_str() {
            "broadcaster" => Ok(is_broadcaster),
            "whitelist" => {
                if is_broadcaster {
                    Ok(true)
                } else {
                    self.is_tts_user(channel, username)
                }
            }
            "everyone" => Ok(true),
            _ => Ok(false)
        }
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Self {
            conn: self.conn.clone(),
        }
    }
}
