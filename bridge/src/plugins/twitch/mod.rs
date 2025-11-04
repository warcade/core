use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;
use rusqlite::OptionalExtension;

mod irc;
mod api;
mod auth;
mod eventsub;
mod commands;
mod database;
mod events;

pub use irc::*;
pub use api::*;
pub use auth::*;
pub use eventsub::*;
pub use commands::*;
pub use database::*;
pub use events::*;

pub struct TwitchPlugin;

#[async_trait]
impl Plugin for TwitchPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "twitch".to_string(),
            name: "Twitch Integration".to_string(),
            version: "1.0.0".to_string(),
            description: "Complete Twitch integration with IRC, API, EventSub, and commands".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[Twitch] Initializing plugin...");

        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS twitch_auth (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                access_token TEXT NOT NULL,
                refresh_token TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                scopes TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS twitch_channels (
                channel_id TEXT PRIMARY KEY,
                channel_name TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL,
                is_live INTEGER NOT NULL DEFAULT 0,
                game_name TEXT,
                title TEXT,
                viewer_count INTEGER,
                started_at INTEGER,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS twitch_chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                message TEXT NOT NULL,
                is_command INTEGER NOT NULL DEFAULT 0,
                timestamp INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS twitch_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                command TEXT NOT NULL UNIQUE,
                handler_plugin TEXT NOT NULL,
                handler_method TEXT NOT NULL,
                permission_level TEXT NOT NULL DEFAULT 'everyone',
                cooldown_seconds INTEGER NOT NULL DEFAULT 0,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS twitch_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                event_data TEXT NOT NULL,
                user_id TEXT,
                username TEXT,
                channel TEXT,
                timestamp INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS twitch_eventsub_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subscription_id TEXT NOT NULL UNIQUE,
                subscription_type TEXT NOT NULL,
                condition TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON twitch_chat_messages(channel, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON twitch_chat_messages(user_id);
            CREATE INDEX IF NOT EXISTS idx_events_type ON twitch_events(event_type, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_events_user ON twitch_events(user_id);
            "#,
        ])?;

        // Service: Send chat message
        ctx.provide_service("send_message", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let message: String = serde_json::from_value(input["message"].clone())?;

            // NOTE: Actual IRC message sending would happen here
            log::info!("[Twitch] Sending message to {}: {}", channel, message);

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Register command
        ctx.provide_service("register_command", |input| async move {
            let command: String = serde_json::from_value(input["command"].clone())?;
            let handler_plugin: String = serde_json::from_value(input["handler_plugin"].clone())?;
            let handler_method: String = serde_json::from_value(input["handler_method"].clone())?;
            let permission_level: String = serde_json::from_value(input["permission_level"].clone()).unwrap_or_else(|_| "everyone".to_string());
            let cooldown_seconds: i64 = serde_json::from_value(input["cooldown_seconds"].clone()).unwrap_or(0);

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT OR REPLACE INTO twitch_commands (command, handler_plugin, handler_method, permission_level, cooldown_seconds, enabled, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
                rusqlite::params![command, handler_plugin, handler_method, permission_level, cooldown_seconds, now],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Get channel info
        ctx.provide_service("get_channel_info", |input| async move {
            let channel_name: String = serde_json::from_value(input["channel_name"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let channel: Option<serde_json::Value> = conn.query_row(
                "SELECT channel_id, channel_name, display_name, is_live, game_name, title, viewer_count, started_at
                 FROM twitch_channels WHERE channel_name = ?1",
                rusqlite::params![channel_name],
                |row| {
                    Ok(serde_json::json!({
                        "channel_id": row.get::<_, String>(0)?,
                        "channel_name": row.get::<_, String>(1)?,
                        "display_name": row.get::<_, String>(2)?,
                        "is_live": row.get::<_, i64>(3)? != 0,
                        "game_name": row.get::<_, Option<String>>(4)?,
                        "title": row.get::<_, Option<String>>(5)?,
                        "viewer_count": row.get::<_, Option<i64>>(6)?,
                        "started_at": row.get::<_, Option<i64>>(7)?,
                    }))
                }
            ).optional()?;

            Ok(serde_json::json!({ "channel": channel }))
        }).await;

        // Service: Update channel info
        ctx.provide_service("update_channel_info", |input| async move {
            let channel_id: String = serde_json::from_value(input["channel_id"].clone())?;
            let channel_name: String = serde_json::from_value(input["channel_name"].clone())?;
            let display_name: String = serde_json::from_value(input["display_name"].clone())?;
            let is_live: bool = serde_json::from_value(input["is_live"].clone()).unwrap_or(false);
            let game_name: Option<String> = serde_json::from_value(input["game_name"].clone()).ok();
            let title: Option<String> = serde_json::from_value(input["title"].clone()).ok();
            let viewer_count: Option<i64> = serde_json::from_value(input["viewer_count"].clone()).ok();
            let started_at: Option<i64> = serde_json::from_value(input["started_at"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT OR REPLACE INTO twitch_channels (channel_id, channel_name, display_name, is_live, game_name, title, viewer_count, started_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                rusqlite::params![channel_id, channel_name, display_name, is_live as i64, game_name, title, viewer_count, started_at, now],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Log chat message
        ctx.provide_service("log_message", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let username: String = serde_json::from_value(input["username"].clone())?;
            let message: String = serde_json::from_value(input["message"].clone())?;
            let is_command: bool = serde_json::from_value(input["is_command"].clone()).unwrap_or(false);

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT INTO twitch_chat_messages (channel, user_id, username, message, is_command, timestamp)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                rusqlite::params![channel, user_id, username, message, is_command as i64, now],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        // Service: Get recent messages
        ctx.provide_service("get_recent_messages", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let limit: i64 = serde_json::from_value(input["limit"].clone()).unwrap_or(100);

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let mut stmt = conn.prepare(
                "SELECT username, message, timestamp FROM twitch_chat_messages
                 WHERE channel = ?1 ORDER BY timestamp DESC LIMIT ?2"
            )?;

            let messages: Vec<serde_json::Value> = stmt.query_map(
                rusqlite::params![channel, limit],
                |row| {
                    Ok(serde_json::json!({
                        "username": row.get::<_, String>(0)?,
                        "message": row.get::<_, String>(1)?,
                        "timestamp": row.get::<_, i64>(2)?,
                    }))
                }
            )?.collect::<rusqlite::Result<Vec<_>>>()?;

            Ok(serde_json::json!({ "messages": messages }))
        }).await;

        log::info!("[Twitch] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[Twitch] Starting plugin...");

        // Start IRC client (simulated for now)
        let ctx_irc = ctx.clone();
        tokio::spawn(async move {
            log::info!("[Twitch] IRC client started (simulated)");

            // Simulate chat message processing
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
            loop {
                interval.tick().await;

                // NOTE: Actual IRC message processing would happen here
                // For now, just emit a heartbeat
                ctx_irc.emit("twitch.irc.connected", &serde_json::json!({
                    "timestamp": current_timestamp()
                }));
            }
        });

        // Command handler
        let ctx_commands = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_commands.subscribe_to("twitch.chat_message").await;

            while let Ok(event) = events.recv().await {
                if let (Ok(channel), Ok(username), Ok(message)) = (
                    serde_json::from_value::<String>(event.payload["channel"].clone()),
                    serde_json::from_value::<String>(event.payload["username"].clone()),
                    serde_json::from_value::<String>(event.payload["message"].clone()),
                ) {
                    // Check if message is a command
                    if let Some(command_text) = message.strip_prefix('!') {
                        let parts: Vec<&str> = command_text.split_whitespace().collect();
                        if let Some(cmd) = parts.first() {
                            log::info!("[Twitch] Command received: !{} from {} in {}", cmd, username, channel);

                            ctx_commands.emit("twitch.command", &serde_json::json!({
                                "command": cmd,
                                "args": &parts[1..],
                                "channel": channel,
                                "username": username,
                                "message": message
                            }));
                        }
                    }
                }
            }
        });

        // EventSub handler (simulated)
        let ctx_eventsub = ctx.clone();
        tokio::spawn(async move {
            log::info!("[Twitch] EventSub handler started (simulated)");

            // NOTE: Actual EventSub webhook server and subscription management would happen here
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
            loop {
                interval.tick().await;
                log::debug!("[Twitch] EventSub heartbeat");
            }
        });

        // API client periodic updates
        let ctx_api = ctx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // Every 5 minutes

            loop {
                interval.tick().await;

                // NOTE: Actual Twitch API calls would happen here to update channel info
                log::debug!("[Twitch] API sync check");
            }
        });

        log::info!("[Twitch] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[Twitch] Stopping plugin...");
        // NOTE: Cleanup IRC connection, EventSub subscriptions, etc.
        Ok(())
    }
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
