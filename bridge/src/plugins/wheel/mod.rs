use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

pub struct WheelPlugin;

#[async_trait]
impl Plugin for WheelPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "wheel".to_string(),
            name: "Wheel System".to_string(),
            version: "1.0.0".to_string(),
            description: "Spin wheel game with customizable options".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec!["currency".to_string()],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[Wheel] Initializing plugin...");

        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS wheel_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                option_text TEXT NOT NULL,
                color TEXT NOT NULL,
                weight INTEGER NOT NULL DEFAULT 1,
                enabled INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS wheel_spins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            "#,
        ])?;

        // Register services
        ctx.provide_service("add_option", |input| async move {
            let option_text: String = serde_json::from_value(input["option_text"].clone())?;
            let color: String = serde_json::from_value(input["color"].clone())?;
            let weight: i64 = serde_json::from_value(input["weight"].clone()).unwrap_or(1);

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            conn.execute(
                "INSERT INTO wheel_options (option_text, color, weight, enabled) VALUES (?1, ?2, ?3, 1)",
                rusqlite::params![option_text, color, weight],
            )?;

            Ok(serde_json::json!({ "id": conn.last_insert_rowid() }))
        }).await;

        ctx.provide_service("spin_wheel", |input| async move {
            let user_id: String = serde_json::from_value(input["user_id"].clone())?;
            let username: String = serde_json::from_value(input["username"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            // Get all enabled options with weights
            let mut stmt = conn.prepare(
                "SELECT option_text, weight FROM wheel_options WHERE enabled = 1"
            )?;

            let options: Vec<(String, i64)> = stmt.query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })?.collect::<rusqlite::Result<Vec<_>>>()?;

            if options.is_empty() {
                return Err(anyhow::anyhow!("No wheel options available"));
            }

            // Weighted random selection
            use rand::Rng;
            let total_weight: i64 = options.iter().map(|(_, w)| w).sum();
            let mut rng = rand::thread_rng();
            let mut roll = rng.gen_range(0..total_weight);

            let mut result = options[0].0.clone();
            for (option, weight) in options {
                if roll < weight {
                    result = option;
                    break;
                }
                roll -= weight;
            }

            // Record spin
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64;

            conn.execute(
                "INSERT INTO wheel_spins (user_id, username, result, created_at) VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![user_id, username, result, now],
            )?;

            Ok(serde_json::json!({ "result": result }))
        }).await;

        log::info!("[Wheel] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, _ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[Wheel] Starting plugin...");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[Wheel] Stopping plugin...");
        Ok(())
    }
}
