use anyhow::Result;
use serenity::{
    async_trait,
    client::{Client, Context, EventHandler},
    model::{channel::Message, gateway::Ready},
    prelude::*,
};
use std::sync::Arc;
use tokio::sync::RwLock;

use super::discord_commands::DiscordCommandSystem;

#[derive(Clone)]
pub struct DiscordBotConfig {
    pub bot_token: String,
    pub channel_id: Option<String>,  // None = listen to all channels
    pub command_prefix: String,
    pub max_queue_size: i64,
}

pub struct DiscordBot {
    config: Arc<RwLock<Option<DiscordBotConfig>>>,
    command_system: Arc<DiscordCommandSystem>,
}

struct Handler {
    config: Arc<RwLock<Option<DiscordBotConfig>>>,
    command_system: Arc<DiscordCommandSystem>,
}

#[async_trait]
impl EventHandler for Handler {
    async fn message(&self, ctx: Context, msg: Message) {
        let config_guard = self.config.read().await;
        let config = match config_guard.as_ref() {
            Some(c) => c,
            None => return,
        };

        // Check if message is in the configured channel (if channel restriction is set)
        if let Some(ref channel_id) = config.channel_id {
            if msg.channel_id.to_string() != *channel_id {
                return;
            }
        }
        drop(config_guard);

        // Process message through command system
        if let Err(e) = self.command_system.process_message(&ctx, &msg).await {
            log::error!("Failed to process Discord command: {}", e);
        }
    }

    async fn ready(&self, _: Context, ready: Ready) {
        log::info!("🎵 Discord bot is ready! Logged in as {}", ready.user.name);
    }
}

impl DiscordBot {
    pub fn new(command_system: Arc<DiscordCommandSystem>) -> Self {
        Self {
            config: Arc::new(RwLock::new(None)),
            command_system,
        }
    }

    pub async fn set_config(&self, config: DiscordBotConfig) {
        let mut config_guard = self.config.write().await;
        *config_guard = Some(config);
    }

    pub fn get_command_system(&self) -> Arc<DiscordCommandSystem> {
        self.command_system.clone()
    }

    pub async fn start(&self) -> Result<Client> {
        let config_guard = self.config.read().await;
        let config = config_guard
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("Discord bot config not set"))?;

        let token = config.bot_token.clone();
        drop(config_guard);

        let intents = GatewayIntents::GUILD_MESSAGES
            | GatewayIntents::MESSAGE_CONTENT
            | GatewayIntents::GUILDS;

        let handler = Handler {
            config: self.config.clone(),
            command_system: self.command_system.clone(),
        };

        let client = Client::builder(&token, intents)
            .event_handler(handler)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create Discord client: {}", e))?;

        Ok(client)
    }
}
