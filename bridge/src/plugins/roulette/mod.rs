use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

mod database;
mod events;
mod game;

pub use database::*;
pub use events::*;
pub use game::*;

pub struct RoulettePlugin;

#[async_trait]
impl Plugin for RoulettePlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "roulette".to_string(),
            name: "Roulette Game".to_string(),
            version: "1.0.0".to_string(),
            description: "European roulette betting game".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec!["currency".to_string()],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[Roulette] Initializing plugin...");

        // Database migrations
        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS roulette_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel TEXT NOT NULL,
                status TEXT NOT NULL,
                winning_number INTEGER,
                created_at INTEGER NOT NULL,
                spun_at INTEGER,
                ended_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS roulette_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                amount INTEGER NOT NULL,
                bet_type TEXT NOT NULL,
                bet_value TEXT NOT NULL,
                won BOOLEAN,
                payout INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (game_id) REFERENCES roulette_games(id)
            );

            CREATE INDEX IF NOT EXISTS idx_roulette_games_channel ON roulette_games(channel);
            CREATE INDEX IF NOT EXISTS idx_roulette_games_status ON roulette_games(status);
            CREATE INDEX IF NOT EXISTS idx_roulette_bets_game ON roulette_bets(game_id);
            "#,
        ])?;

        // Register services
        ctx.provide_service("start_game", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let game_id = database::start_game(&conn, &channel)?;
            Ok(serde_json::json!({ "game_id": game_id }))
        }).await;

        ctx.provide_service("place_bet", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let username: String = serde_json::from_value(input["username"].clone())?;
            let amount: i64 = serde_json::from_value(input["amount"].clone())?;
            let bet_type: String = serde_json::from_value(input["bet_type"].clone())?;
            let bet_value: String = serde_json::from_value(input["bet_value"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            database::place_bet(&conn, &channel, &user_id, &username, amount, &bet_type, &bet_value)?;
            Ok(serde_json::json!({ "success": true }))
        }).await;

        ctx.provide_service("spin_wheel", |input| async move {
            let channel: String = serde_json::from_value(input["channel"].clone())?;
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let winning_number = database::spin_wheel(&conn, &channel)?;
            Ok(serde_json::json!({ "winning_number": winning_number }))
        }).await;

        log::info!("[Roulette] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[Roulette] Starting plugin...");

        // Subscribe to Twitch chat commands
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("twitch.chat_message").await;

            while let Ok(event) = events.recv().await {
                if let (Ok(channel), Ok(username), Ok(user_id), Ok(message)) = (
                    serde_json::from_value::<String>(event.payload["channel"].clone()),
                    serde_json::from_value::<String>(event.payload["username"].clone()),
                    serde_json::from_value::<String>(event.payload["user_id"].clone()),
                    serde_json::from_value::<String>(event.payload["message"].clone()),
                ) {
                    let parts: Vec<&str> = message.split_whitespace().collect();

                    match parts.get(0) {
                        Some(&"!bet") | Some(&"!b") => {
                            if parts.len() >= 3 {
                                if let Ok(amount) = parts[1].parse::<i64>() {
                                    let bet_type = parts[2];
                                    let bet_value = if bet_type.chars().all(|c| c.is_numeric()) {
                                        bet_type.to_string()
                                    } else {
                                        bet_type.to_lowercase()
                                    };

                                    // Check if user has enough currency
                                    let balance_result = ctx_clone.call_service("currency", "get_balance", serde_json::json!({
                                        "user_id": user_id
                                    })).await;

                                    if let Ok(result) = balance_result {
                                        if let Some(balance) = result["balance"].as_i64() {
                                            if balance >= amount {
                                                // Place bet
                                                let _ = ctx_clone.call_service("roulette", "place_bet", serde_json::json!({
                                                    "channel": channel,
                                                    "user_id": user_id,
                                                    "username": username,
                                                    "amount": amount,
                                                    "bet_type": if bet_value.chars().all(|c| c.is_numeric()) { "number" } else { &bet_value },
                                                    "bet_value": bet_value
                                                })).await;

                                                // Deduct currency
                                                let _ = ctx_clone.call_service("currency", "deduct_currency", serde_json::json!({
                                                    "user_id": user_id,
                                                    "amount": amount,
                                                    "reason": "Roulette bet"
                                                })).await;

                                                ctx_clone.emit("roulette.bet_placed", &BetPlacedEvent {
                                                    channel,
                                                    username,
                                                    amount,
                                                    bet_type: bet_value,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                }
            }
        });

        log::info!("[Roulette] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[Roulette] Stopping plugin...");
        Ok(())
    }
}
