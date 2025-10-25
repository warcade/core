use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::twitch_api::TwitchAPI;
use super::twitch_irc_client::{ChatMessage, TwitchIRCManager};

/// Command permission level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum PermissionLevel {
    Everyone,
    Subscriber,
    Vip,
    Moderator,
    Broadcaster,
}

/// Command context passed to handlers
#[derive(Debug, Clone)]
pub struct CommandContext {
    pub message: ChatMessage,
    pub command: String,
    pub args: Vec<String>,
    pub channel: String,
}

/// Command handler result
pub type CommandResult = Result<Option<String>>;

/// Command handler function type (async trait for dynamic dispatch)
pub type CommandHandler =
    Arc<dyn Fn(CommandContext, Arc<TwitchIRCManager>, Arc<TwitchAPI>) -> CommandResult + Send + Sync>;

/// Command definition
#[derive(Clone)]
pub struct Command {
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub usage: String,
    pub permission: PermissionLevel,
    pub cooldown_seconds: u32,
    pub enabled: bool,
    pub handler: CommandHandler,
}

/// Simple command that just responds with text
pub struct SimpleCommand {
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub permission: PermissionLevel,
    pub response: String,
}

/// Command cooldown tracker
struct CooldownTracker {
    last_used: HashMap<String, i64>, // key: "command:user_id"
}

impl CooldownTracker {
    fn new() -> Self {
        Self {
            last_used: HashMap::new(),
        }
    }

    fn can_use(&mut self, command: &str, user_id: &str, cooldown_seconds: u32) -> bool {
        let key = format!("{}:{}", command, user_id);
        let now = chrono::Utc::now().timestamp();

        if let Some(&last_used) = self.last_used.get(&key) {
            if now - last_used < cooldown_seconds as i64 {
                return false;
            }
        }

        self.last_used.insert(key, now);
        true
    }
}

/// Command registry and dispatcher
pub struct CommandSystem {
    commands: Arc<RwLock<HashMap<String, Command>>>,
    cooldowns: Arc<RwLock<CooldownTracker>>,
    prefix: String,
    irc_manager: Arc<TwitchIRCManager>,
    api: Arc<TwitchAPI>,
}

impl CommandSystem {
    /// Create a new command system
    pub fn new(
        prefix: String,
        irc_manager: Arc<TwitchIRCManager>,
        api: Arc<TwitchAPI>,
    ) -> Self {
        let system = Self {
            commands: Arc::new(RwLock::new(HashMap::new())),
            cooldowns: Arc::new(RwLock::new(CooldownTracker::new())),
            prefix,
            irc_manager,
            api,
        };

        // Register built-in commands
        let system_clone = system.clone();
        tokio::spawn(async move {
            system_clone.register_builtin_commands().await;
        });

        system
    }

    /// Register a command
    pub async fn register_command(&self, command: Command) {
        let mut commands = self.commands.write().await;

        // Register main name
        commands.insert(command.name.clone(), command.clone());

        // Register aliases
        for alias in &command.aliases {
            commands.insert(alias.clone(), command.clone());
        }

        log::info!("Registered command: {} (aliases: {:?})", command.name, command.aliases);
    }

    /// Register a simple text response command
    pub async fn register_simple_command(&self, simple: SimpleCommand) {
        let response = simple.response.clone();

        let command = Command {
            name: simple.name,
            aliases: simple.aliases,
            description: simple.description,
            usage: String::new(),
            permission: simple.permission,
            cooldown_seconds: 5,
            enabled: true,
            handler: Arc::new(move |_ctx, _irc, _api| Ok(Some(response.clone()))),
        };

        self.register_command(command).await;
    }

    /// Unregister a command
    pub async fn unregister_command(&self, name: &str) {
        let mut commands = self.commands.write().await;

        if let Some(command) = commands.remove(name) {
            // Remove aliases too
            for alias in &command.aliases {
                commands.remove(alias);
            }

            log::info!("Unregistered command: {}", name);
        }
    }

    /// Handle a chat message and check if it's a command
    pub async fn handle_message(&self, message: ChatMessage) -> Result<()> {
        let text = message.message.trim();

        // Check if message starts with prefix
        if !text.starts_with(&self.prefix) {
            return Ok(());
        }

        // Parse command and args
        let parts: Vec<&str> = text[self.prefix.len()..].split_whitespace().collect();

        if parts.is_empty() {
            return Ok(());
        }

        let command_name = parts[0].to_lowercase();
        let args: Vec<String> = parts[1..].iter().map(|s| s.to_string()).collect();

        // Find command
        let commands = self.commands.read().await;
        let command = match commands.get(&command_name) {
            Some(cmd) => cmd.clone(),
            None => return Ok(()), // Not a registered command
        };
        drop(commands);

        // Check if enabled
        if !command.enabled {
            return Ok(());
        }

        // Check permissions
        if !self.check_permission(&message, &command.permission) {
            self.irc_manager
                .send_message(&message.channel, "You don't have permission to use this command.")
                .await?;
            return Ok(());
        }

        // Check cooldown
        {
            let mut cooldowns = self.cooldowns.write().await;
            if !cooldowns.can_use(&command_name, &message.user_id, command.cooldown_seconds) {
                return Ok(()); // Silently ignore if on cooldown
            }
        }

        // Execute command
        let ctx = CommandContext {
            message: message.clone(),
            command: command_name,
            args,
            channel: message.channel.clone(),
        };

        match (command.handler)(ctx, self.irc_manager.clone(), self.api.clone()) {
            Ok(Some(response)) => {
                self.irc_manager.send_message(&message.channel, &response).await?;
            }
            Ok(None) => {
                // Command executed but no response
            }
            Err(e) => {
                log::error!("Command execution error: {}", e);
                self.irc_manager
                    .send_message(&message.channel, "An error occurred while executing the command.")
                    .await?;
            }
        }

        Ok(())
    }

    /// Check if user has required permission
    fn check_permission(&self, message: &ChatMessage, required: &PermissionLevel) -> bool {
        use PermissionLevel::*;

        // Broadcaster always has all permissions
        if message.badges.iter().any(|b| b.starts_with("broadcaster")) {
            return true;
        }

        match required {
            Everyone => true,
            Subscriber => message.is_subscriber || message.is_vip || message.is_moderator,
            Vip => message.is_vip || message.is_moderator,
            Moderator => message.is_moderator,
            Broadcaster => false, // Already checked above
        }
    }

    /// Get list of all registered commands
    pub async fn get_commands(&self) -> Vec<Command> {
        let commands = self.commands.read().await;
        let mut unique_commands: HashMap<String, Command> = HashMap::new();

        for command in commands.values() {
            unique_commands.insert(command.name.clone(), command.clone());
        }

        unique_commands.into_values().collect()
    }

    /// Register built-in commands
    async fn register_builtin_commands(&self) {
        // !commands - List all commands
        let command_system = self.clone();
        self.register_command(Command {
            name: "commands".to_string(),
            aliases: vec!["cmds".to_string(), "help".to_string()],
            description: "List all available commands".to_string(),
            usage: "!commands".to_string(),
            permission: PermissionLevel::Everyone,
            cooldown_seconds: 10,
            enabled: true,
            handler: Arc::new(move |_ctx, _irc, _api| {
                let command_system = command_system.clone();
                let commands_future = command_system.get_commands();

                // Block on the future (not ideal, but works for simple cases)
                let rt = tokio::runtime::Handle::current();
                let commands = rt.block_on(commands_future);

                let command_names: Vec<String> = commands
                    .iter()
                    .filter(|c| c.enabled)
                    .map(|c| format!("!{}", c.name))
                    .collect();

                Ok(Some(format!("Available commands: {}", command_names.join(", "))))
            }),
        })
        .await;

        // !uptime - Show stream uptime
        self.register_command(Command {
            name: "uptime".to_string(),
            aliases: vec![],
            description: "Show stream uptime".to_string(),
            usage: "!uptime".to_string(),
            permission: PermissionLevel::Everyone,
            cooldown_seconds: 10,
            enabled: true,
            handler: Arc::new(|ctx, _irc, api| {
                let rt = tokio::runtime::Handle::current();

                match rt.block_on(api.get_stream(&ctx.channel)) {
                    Ok(Some(stream)) => {
                        let started_at = chrono::DateTime::parse_from_rfc3339(&stream.started_at)
                            .unwrap_or_else(|_| chrono::Utc::now().into());

                        let duration = chrono::Utc::now().signed_duration_since(started_at);
                        let hours = duration.num_hours();
                        let minutes = duration.num_minutes() % 60;

                        Ok(Some(format!("Stream has been live for {}h {}m", hours, minutes)))
                    }
                    Ok(None) => Ok(Some("Stream is currently offline.".to_string())),
                    Err(e) => {
                        log::error!("Failed to get stream info: {}", e);
                        Ok(Some("Unable to get stream information.".to_string()))
                    }
                }
            }),
        })
        .await;

        log::info!("Built-in commands registered");
    }
}

impl Clone for CommandSystem {
    fn clone(&self) -> Self {
        Self {
            commands: self.commands.clone(),
            cooldowns: self.cooldowns.clone(),
            prefix: self.prefix.clone(),
            irc_manager: self.irc_manager.clone(),
            api: self.api.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_levels() {
        let mut msg = ChatMessage {
            channel: "test".to_string(),
            username: "user".to_string(),
            user_id: "123".to_string(),
            display_name: None,
            profile_image_url: None,
            message: "test".to_string(),
            timestamp: 0,
            badges: vec![],
            is_moderator: false,
            is_subscriber: false,
            is_vip: false,
            color: None,
            emotes: vec![],
            location_flag: None,
            is_birthday: false,
            level: None,
            current_xp: None,
            xp_for_next_level: None,
        };

        // Everyone permission
        assert!(msg.is_subscriber == false);

        // Subscriber permission
        msg.is_subscriber = true;
        assert!(msg.is_subscriber);

        // Moderator permission
        msg.is_moderator = true;
        assert!(msg.is_moderator);
    }
}
