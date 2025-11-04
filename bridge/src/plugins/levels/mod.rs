use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

mod database;
mod events;

pub use database::*;
pub use events::*;

pub struct LevelsPlugin;

#[async_trait]
impl Plugin for LevelsPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "levels".to_string(),
            name: "Levels System".to_string(),
            version: "1.0.0".to_string(),
            description: "User XP and leveling system".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[Levels] Initializing plugin...");

        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS user_levels (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                total_xp INTEGER NOT NULL DEFAULT 0,
                level INTEGER NOT NULL DEFAULT 1,
                last_xp_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS xp_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                reason TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels(level DESC);
            CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
            "#,
        ])?;

        // Register services
        ctx.provide_service("add_xp", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let username: String = serde_json::from_value(input["username"].clone())?;
            let amount: i64 = serde_json::from_value(input["amount"].clone())?;
            let reason: Option<String> = serde_json::from_value(input["reason"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let (old_level, new_level) = database::add_xp(&conn, &user_id, &username, amount, reason.as_deref())?;
            Ok(serde_json::json!({
                "old_level": old_level,
                "new_level": new_level,
                "leveled_up": new_level > old_level
            }))
        }).await;

        ctx.provide_service("get_level", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let user_level = database::get_user_level(&conn, &user_id)?;
            Ok(serde_json::to_value(user_level)?)
        }).await;

        ctx.provide_service("get_leaderboard", |input| async move {
            let limit: usize = serde_json::from_value(input["limit"].clone()).unwrap_or(10);

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let leaderboard = database::get_leaderboard(&conn, limit)?;
            Ok(serde_json::to_value(leaderboard)?)
        }).await;

        log::info!("[Levels] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[Levels] Starting plugin...");

        // Subscribe to events that grant XP
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("twitch.chat_message").await;

            while let Ok(event) = events.recv().await {
                if let (Ok(user_id), Ok(username)) = (
                    serde_json::from_value::<String>(event.payload["user_id"].clone()),
                    serde_json::from_value::<String>(event.payload["username"].clone()),
                ) {
                    // Award 1 XP per message (with cooldown handled elsewhere)
                    let _ = ctx_clone.call_service("levels", "add_xp", serde_json::json!({
                        "user_id": user_id,
                        "username": username,
                        "amount": 1,
                        "reason": "Chat message"
                    })).await;
                }
            }
        });

        log::info!("[Levels] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[Levels] Stopping plugin...");
        Ok(())
    }
}
