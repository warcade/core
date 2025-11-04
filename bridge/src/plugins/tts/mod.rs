use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;
use rusqlite::OptionalExtension;

mod database;
mod events;

pub use database::*;
pub use events::*;

pub struct TtsPlugin;

#[async_trait]
impl Plugin for TtsPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "tts".to_string(),
            name: "Text-to-Speech".to_string(),
            version: "1.0.0".to_string(),
            description: "Text-to-speech engine with multiple voices and queuing".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[TTS] Initializing plugin...");

        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS tts_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                voice TEXT NOT NULL DEFAULT 'default',
                priority INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                requested_by TEXT,
                created_at INTEGER NOT NULL,
                started_at INTEGER,
                completed_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS tts_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                voice TEXT NOT NULL,
                requested_by TEXT,
                duration_ms INTEGER,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tts_voices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voice_id TEXT NOT NULL UNIQUE,
                voice_name TEXT NOT NULL,
                language TEXT NOT NULL,
                engine TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tts_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tts_queue_status ON tts_queue(status, priority DESC, created_at);
            CREATE INDEX IF NOT EXISTS idx_tts_history_created_at ON tts_history(created_at DESC);
            "#,
        ])?;

        // Initialize default settings
        let conn = crate::core::database::get_database_path();
        let conn = rusqlite::Connection::open(&conn)?;
        let now = current_timestamp();

        let _ = conn.execute(
            "INSERT OR IGNORE INTO tts_settings (key, value, updated_at) VALUES ('enabled', 'true', ?1)",
            rusqlite::params![now],
        );

        let _ = conn.execute(
            "INSERT OR IGNORE INTO tts_settings (key, value, updated_at) VALUES ('default_voice', 'default', ?1)",
            rusqlite::params![now],
        );

        let _ = conn.execute(
            "INSERT OR IGNORE INTO tts_settings (key, value, updated_at) VALUES ('volume', '0.7', ?1)",
            rusqlite::params![now],
        );

        let _ = conn.execute(
            "INSERT OR IGNORE INTO tts_settings (key, value, updated_at) VALUES ('rate', '1.0', ?1)",
            rusqlite::params![now],
        );

        // Register default voices
        let _ = conn.execute(
            "INSERT OR IGNORE INTO tts_voices (voice_id, voice_name, language, engine, enabled, created_at)
             VALUES ('default', 'Default Voice', 'en-US', 'system', 1, ?1)",
            rusqlite::params![now],
        );

        drop(conn);

        // Service: Add to TTS queue
        ctx.provide_service("speak", |input| async move {
            let text: String = serde_json::from_value(input["text"].clone())?;
            let voice: String = serde_json::from_value(input["voice"].clone()).unwrap_or_else(|_| "default".to_string());
            let priority: i64 = serde_json::from_value(input["priority"].clone()).unwrap_or(0);
            let requested_by: Option<String> = serde_json::from_value(input["requested_by"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT INTO tts_queue (text, voice, priority, status, requested_by, created_at)
                 VALUES (?1, ?2, ?3, 'pending', ?4, ?5)",
                rusqlite::params![text, voice, priority, requested_by, now],
            )?;

            let id = conn.last_insert_rowid();
            Ok(serde_json::json!({ "id": id, "success": true }))
        }).await;

        // Service: Get next from queue
        ctx.provide_service("get_next_tts", |_input| async move {
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            // Get highest priority pending item
            let result: Option<serde_json::Value> = conn.query_row(
                "SELECT id, text, voice, requested_by FROM tts_queue
                 WHERE status = 'pending'
                 ORDER BY priority DESC, created_at ASC
                 LIMIT 1",
                [],
                |row| {
                    Ok(serde_json::json!({
                        "id": row.get::<_, i64>(0)?,
                        "text": row.get::<_, String>(1)?,
                        "voice": row.get::<_, String>(2)?,
                        "requested_by": row.get::<_, Option<String>>(3)?,
                    }))
                }
            ).optional()?;

            // Mark as processing
            if let Some(ref item) = result {
                if let Some(id) = item["id"].as_i64() {
                    let now = current_timestamp();
                    conn.execute(
                        "UPDATE tts_queue SET status = 'processing', started_at = ?1 WHERE id = ?2",
                        rusqlite::params![now, id],
                    )?;
                }
            }

            Ok(serde_json::json!({ "item": result }))
        }).await;

        // Service: Mark TTS complete
        ctx.provide_service("complete_tts", |input| async move {
            let id: i64 = serde_json::from_value(input["id"].clone())?;
            let duration_ms: Option<i64> = serde_json::from_value(input["duration_ms"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();

            // Get item details before updating
            let (text, voice, requested_by): (String, String, Option<String>) = conn.query_row(
                "SELECT text, voice, requested_by FROM tts_queue WHERE id = ?1",
                rusqlite::params![id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )?;

            // Mark as complete
            conn.execute(
                "UPDATE tts_queue SET status = 'completed', completed_at = ?1 WHERE id = ?2",
                rusqlite::params![now, id],
            )?;

            // Add to history
            conn.execute(
                "INSERT INTO tts_history (text, voice, requested_by, duration_ms, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                rusqlite::params![text, voice, requested_by, duration_ms, now],
            )?;

            // Clean up old queue items (completed > 1 hour ago)
            let one_hour_ago = now - 3600;
            conn.execute(
                "DELETE FROM tts_queue WHERE status = 'completed' AND completed_at < ?1",
                rusqlite::params![one_hour_ago],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Get queue status
        ctx.provide_service("get_queue_status", |_input| async move {
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let pending: i64 = conn.query_row(
                "SELECT COUNT(*) FROM tts_queue WHERE status = 'pending'",
                [],
                |row| row.get(0),
            )?;

            let processing: i64 = conn.query_row(
                "SELECT COUNT(*) FROM tts_queue WHERE status = 'processing'",
                [],
                |row| row.get(0),
            )?;

            Ok(serde_json::json!({
                "pending": pending,
                "processing": processing,
                "total": pending + processing
            }))
        }).await;

        // Service: Get available voices
        ctx.provide_service("get_voices", |_input| async move {
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let mut stmt = conn.prepare(
                "SELECT voice_id, voice_name, language, engine FROM tts_voices WHERE enabled = 1"
            )?;

            let voices: Vec<serde_json::Value> = stmt.query_map([], |row| {
                Ok(serde_json::json!({
                    "voice_id": row.get::<_, String>(0)?,
                    "voice_name": row.get::<_, String>(1)?,
                    "language": row.get::<_, String>(2)?,
                    "engine": row.get::<_, String>(3)?,
                }))
            })?.collect::<rusqlite::Result<Vec<_>>>()?;

            Ok(serde_json::json!({ "voices": voices }))
        }).await;

        // Service: Update TTS settings
        ctx.provide_service("update_setting", |input| async move {
            let key: String = serde_json::from_value(input["key"].clone())?;
            let value: String = serde_json::from_value(input["value"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT OR REPLACE INTO tts_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![key, value, now],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Get TTS settings
        ctx.provide_service("get_settings", |_input| async move {
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let mut stmt = conn.prepare("SELECT key, value FROM tts_settings")?;
            let settings: Vec<(String, String)> = stmt.query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?.collect::<rusqlite::Result<Vec<_>>>()?;

            let mut settings_map = serde_json::Map::new();
            for (key, value) in settings {
                settings_map.insert(key, serde_json::Value::String(value));
            }

            Ok(serde_json::json!({ "settings": settings_map }))
        }).await;

        log::info!("[TTS] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[TTS] Starting plugin...");

        // Subscribe to TTS request events
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("tts.request").await;

            while let Ok(event) = events.recv().await {
                if let Ok(text) = serde_json::from_value::<String>(event.payload["text"].clone()) {
                    let voice = serde_json::from_value::<String>(event.payload["voice"].clone()).unwrap_or_else(|_| "default".to_string());
                    let priority = serde_json::from_value::<i64>(event.payload["priority"].clone()).unwrap_or(0);
                    let requested_by = serde_json::from_value::<String>(event.payload["requested_by"].clone()).ok();

                    // Add to queue
                    if let Ok(result) = ctx_clone.call_service("tts", "speak", serde_json::json!({
                        "text": text,
                        "voice": voice,
                        "priority": priority,
                        "requested_by": requested_by
                    })).await {
                        if let Some(id) = result["id"].as_i64() {
                            // Emit queued event
                            ctx_clone.emit("tts.queued", &serde_json::json!({
                                "id": id,
                                "text": text,
                                "voice": voice
                            }));
                        }
                    }
                }
            }
        });

        // Background worker to process TTS queue
        let ctx_worker = ctx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(500));

            loop {
                interval.tick().await;

                // Get next item from queue
                if let Ok(result) = ctx_worker.call_service("tts", "get_next_tts", serde_json::json!({})).await {
                    if let Some(item) = result["item"].as_object() {
                        if let (Some(id), Some(text), Some(voice)) = (
                            item["id"].as_i64(),
                            item["text"].as_str(),
                            item["voice"].as_str(),
                        ) {
                            // Emit processing event
                            ctx_worker.emit("tts.processing", &serde_json::json!({
                                "id": id,
                                "text": text,
                                "voice": voice
                            }));

                            // NOTE: Actual TTS synthesis would happen here
                            // For now, we just simulate it with a delay
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

                            // Mark as complete
                            let _ = ctx_worker.call_service("tts", "complete_tts", serde_json::json!({
                                "id": id,
                                "duration_ms": 100
                            })).await;

                            // Emit completed event
                            ctx_worker.emit("tts.completed", &serde_json::json!({
                                "id": id,
                                "text": text,
                                "voice": voice
                            }));
                        }
                    }
                }
            }
        });

        log::info!("[TTS] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[TTS] Stopping plugin...");
        Ok(())
    }
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
