use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;
use rusqlite::OptionalExtension;

pub struct TextCommandsPlugin;

#[async_trait]
impl Plugin for TextCommandsPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "text_commands".to_string(),
            name: "Text Commands".to_string(),
            version: "1.0.0".to_string(),
            description: "Custom text commands for Twitch chat".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[TextCommands] Initializing plugin...");

        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS text_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                command TEXT NOT NULL,
                response TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(channel, command)
            );

            CREATE INDEX IF NOT EXISTS idx_text_commands_channel ON text_commands(channel);
            "#,
        ])?;

        // Register services
        ctx.provide_service("create_command", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let command: String = serde_json::from_value(input["command"].clone())?;
            let response: String = serde_json::from_value(input["response"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let now = current_timestamp();
            conn.execute(
                "INSERT OR REPLACE INTO text_commands (channel, command, response, enabled, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 1, ?4, ?4)",
                rusqlite::params![channel, command, response, now],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        ctx.provide_service("get_command", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let command: String = serde_json::from_value(input["command"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let response: Option<String> = conn.query_row(
                "SELECT response FROM text_commands WHERE channel = ?1 AND command = ?2 AND enabled = 1",
                rusqlite::params![channel, command],
                |row| row.get(0),
            ).optional()?;

            Ok(serde_json::json!({ "response": response }))
        }).await;

        ctx.provide_service("delete_command", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let command: String = serde_json::from_value(input["command"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            conn.execute(
                "DELETE FROM text_commands WHERE channel = ?1 AND command = ?2",
                rusqlite::params![channel, command],
            )?;

            Ok(serde_json::json!({ "success": true }))
        }).await;

        log::info!("[TextCommands] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[TextCommands] Starting plugin...");

        // Subscribe to chat messages to handle text commands
        tokio::spawn(async move {
            let mut events = ctx.subscribe_to("twitch.chat_message").await;

            while let Ok(event) = events.recv().await {
                if let (Ok(channel), Ok(message)) = (
                    serde_json::from_value::<String>(event.payload["channel"].clone()),
                    serde_json::from_value::<String>(event.payload["message"].clone()),
                ) {
                    if let Some(command) = message.strip_prefix('!') {
                        let cmd = command.split_whitespace().next().unwrap_or("");

                        // Try to get command response
                        if let Ok(result) = ctx.call_service("text_commands", "get_command", serde_json::json!({
                            "channel": channel,
                            "command": cmd
                        })).await {
                            if let Some(response) = result["response"].as_str() {
                                // Emit event to send message
                                ctx.emit("text_commands.executed", &serde_json::json!({
                                    "channel": channel,
                                    "command": cmd,
                                    "response": response
                                }));
                            }
                        }
                    }
                }
            }
        });

        log::info!("[TextCommands] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[TextCommands] Stopping plugin...");
        Ok(())
    }
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
