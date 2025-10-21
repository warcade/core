// Command modules
pub mod database;
pub mod household;
pub mod todos;
pub mod tts_command;
pub mod dice;

use crate::modules::twitch::CommandSystem;
use database::Database;

/// Register all commands from this module
pub async fn register_all_commands(command_system: &CommandSystem) {
    log::info!("📦 Registering custom commands...");

    // Initialize database
    let db = match Database::new() {
        Ok(db) => db,
        Err(e) => {
            log::error!("Failed to initialize database: {}", e);
            return;
        }
    };

    // Register household task commands
    household::register(command_system, db.clone()).await;

    // Register todo commands
    todos::register(command_system, db.clone()).await;

    // Register TTS command
    tts_command::register(command_system, db.clone()).await;

    // Register dice commands
    dice::register(command_system).await;

    log::info!("✅ All custom commands registered");
}
