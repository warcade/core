use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

mod database;
mod events;

pub use database::*;
pub use events::*;

pub struct CurrencyPlugin;

#[async_trait]
impl Plugin for CurrencyPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "currency".to_string(),
            name: "Currency System".to_string(),
            version: "1.0.0".to_string(),
            description: "User points and currency management".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[Currency] Initializing plugin...");

        // Database migrations
        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS currency_accounts (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                balance INTEGER NOT NULL DEFAULT 0,
                lifetime_earned INTEGER NOT NULL DEFAULT 0,
                lifetime_spent INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS currency_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                transaction_type TEXT NOT NULL,
                reason TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_currency_transactions_user ON currency_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_currency_transactions_created ON currency_transactions(created_at);
            "#,
        ])?;

        // Register services
        ctx.provide_service("get_balance", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let balance = database::get_balance(&conn, &user_id)?;
            Ok(serde_json::json!({ "balance": balance }))
        }).await;

        ctx.provide_service("add_currency", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let username: String = serde_json::from_value(input["username"].clone())?;
            let amount: i64 = serde_json::from_value(input["amount"].clone())?;
            let reason: Option<String> = serde_json::from_value(input["reason"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            database::add_currency(&conn, &user_id, &username, amount, reason.as_deref())?;
            Ok(serde_json::json!({ "success": true }))
        }).await;

        ctx.provide_service("deduct_currency", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let amount: i64 = serde_json::from_value(input["amount"].clone())?;
            let reason: Option<String> = serde_json::from_value(input["reason"].clone()).ok();

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            database::deduct_currency(&conn, &user_id, amount, reason.as_deref())?;
            Ok(serde_json::json!({ "success": true }))
        }).await;

        ctx.provide_service("transfer_currency", |input| async move {
            let from_user: String = serde_json::from_value(input["from_user"].clone())?;
            let to_user: String = serde_json::from_value(input["to_user"].clone())?;
            let to_username: String = serde_json::from_value(input["to_username"].clone())?;
            let amount: i64 = serde_json::from_value(input["amount"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            database::transfer_currency(&conn, &from_user, &to_user, &to_username, amount)?;
            Ok(serde_json::json!({ "success": true }))
        }).await;

        log::info!("[Currency] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[Currency] Starting plugin...");

        // Subscribe to events that award currency
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("twitch.follow").await;

            while let Ok(event) = events.recv().await {
                // Award currency for follows
                if let Ok(user_id) = serde_json::from_value::<String>(event.payload["user_id"].clone()) {
                    if let Ok(username) = serde_json::from_value::<String>(event.payload["username"].clone()) {
                        let _ = ctx_clone.call_service("currency", "add_currency", serde_json::json!({
                            "user_id": user_id,
                            "username": username,
                            "amount": 100,
                            "reason": "Follow reward"
                        })).await;

                        ctx_clone.emit("currency.earned", &CurrencyEarnedEvent {
                            user_id,
                            username,
                            amount: 100,
                            reason: "Follow reward".to_string(),
                        });
                    }
                }
            }
        });

        log::info!("[Currency] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[Currency] Stopping plugin...");
        Ok(())
    }
}
