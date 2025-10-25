use anyhow::Result;
use serenity::all::{Message, Context};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::commands::database::Database;

/// Discord user context
#[derive(Debug, Clone)]
pub struct DiscordUser {
    pub id: String,
    pub username: String,
    pub is_bot: bool,
    pub roles: Vec<String>,
}

/// Discord command context - passed to command handlers
#[derive(Debug, Clone)]
pub struct DiscordCommandContext {
    pub command: String,
    pub args: Vec<String>,
    pub channel_id: String,
    pub guild_id: Option<String>,
    pub user: DiscordUser,
}

/// Permission levels for commands
#[derive(Debug, Clone, PartialEq)]
pub enum DiscordPermissionLevel {
    Everyone,
    HasRole(String),
    Admin,
    Owner,
}

/// Command handler result - returns optional response message
pub type DiscordCommandResult = Result<Option<String>>;

/// Command handler function type
pub type DiscordCommandHandler = Arc<
    dyn Fn(DiscordCommandContext, Arc<Database>) -> DiscordCommandResult + Send + Sync,
>;

/// Discord command definition
#[derive(Clone)]
pub struct DiscordCommand {
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub usage: String,
    pub permission: DiscordPermissionLevel,
    pub cooldown_seconds: u32,
    pub enabled: bool,
    pub handler: DiscordCommandHandler,
}

impl DiscordCommand {
    /// Create a new command builder
    pub fn new<S: Into<String>>(name: S, handler: DiscordCommandHandler) -> Self {
        Self {
            name: name.into(),
            aliases: Vec::new(),
            description: String::new(),
            usage: String::new(),
            permission: DiscordPermissionLevel::Everyone,
            cooldown_seconds: 0,
            enabled: true,
            handler,
        }
    }

    /// Add aliases to the command
    pub fn aliases(mut self, aliases: Vec<String>) -> Self {
        self.aliases = aliases;
        self
    }

    /// Set command description
    pub fn description<S: Into<String>>(mut self, desc: S) -> Self {
        self.description = desc.into();
        self
    }

    /// Set command usage
    pub fn usage<S: Into<String>>(mut self, usage: S) -> Self {
        self.usage = usage.into();
        self
    }

    /// Set permission level
    pub fn permission(mut self, perm: DiscordPermissionLevel) -> Self {
        self.permission = perm;
        self
    }

    /// Set cooldown in seconds
    pub fn cooldown(mut self, seconds: u32) -> Self {
        self.cooldown_seconds = seconds;
        self
    }

    /// Set enabled state
    pub fn enabled(mut self, enabled: bool) -> Self {
        self.enabled = enabled;
        self
    }
}

/// Cooldown tracker for commands
#[derive(Default)]
struct CooldownTracker {
    /// Map of user_id -> (command_name -> last_used_timestamp)
    cooldowns: HashMap<String, HashMap<String, u64>>,
}

impl CooldownTracker {
    fn check_cooldown(&mut self, user_id: &str, command: &str, cooldown_seconds: u32) -> bool {
        if cooldown_seconds == 0 {
            return true;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let user_cooldowns = self.cooldowns.entry(user_id.to_string()).or_default();

        if let Some(&last_used) = user_cooldowns.get(command) {
            if now - last_used < cooldown_seconds as u64 {
                return false; // Still on cooldown
            }
        }

        user_cooldowns.insert(command.to_string(), now);
        true
    }

    fn get_remaining_cooldown(&self, user_id: &str, command: &str, cooldown_seconds: u32) -> u64 {
        if cooldown_seconds == 0 {
            return 0;
        }

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if let Some(user_cooldowns) = self.cooldowns.get(user_id) {
            if let Some(&last_used) = user_cooldowns.get(command) {
                let elapsed = now - last_used;
                if elapsed < cooldown_seconds as u64 {
                    return cooldown_seconds as u64 - elapsed;
                }
            }
        }

        0
    }
}

/// Discord command system - manages all commands and execution
pub struct DiscordCommandSystem {
    commands: Arc<RwLock<HashMap<String, DiscordCommand>>>,
    cooldowns: Arc<RwLock<CooldownTracker>>,
    prefix: String,
    database: Arc<Database>,
}

impl DiscordCommandSystem {
    /// Create a new Discord command system
    pub fn new(prefix: String, database: Arc<Database>) -> Self {
        let system = Self {
            commands: Arc::new(RwLock::new(HashMap::new())),
            cooldowns: Arc::new(RwLock::new(CooldownTracker::default())),
            prefix,
            database,
        };

        system
    }

    /// Register a command
    pub async fn register(&self, command: DiscordCommand) {
        let mut commands = self.commands.write().await;

        // Register main command name
        commands.insert(command.name.clone(), command.clone());

        // Register aliases
        for alias in &command.aliases {
            commands.insert(alias.clone(), command.clone());
        }
    }

    /// Unregister a command
    pub async fn unregister(&self, name: &str) {
        let mut commands = self.commands.write().await;

        if let Some(command) = commands.remove(name) {
            // Remove all aliases too
            for alias in &command.aliases {
                commands.remove(alias);
            }
        }
    }

    /// Get all registered commands
    pub async fn get_commands(&self) -> Vec<DiscordCommand> {
        let commands = self.commands.read().await;
        let mut unique_commands: Vec<DiscordCommand> = Vec::new();
        let mut seen_names: Vec<String> = Vec::new();

        for cmd in commands.values() {
            if !seen_names.contains(&cmd.name) {
                seen_names.push(cmd.name.clone());
                unique_commands.push(cmd.clone());
            }
        }

        unique_commands
    }

    /// Check if user has permission to run command
    fn check_permission(
        &self,
        user: &DiscordUser,
        permission: &DiscordPermissionLevel,
    ) -> bool {
        match permission {
            DiscordPermissionLevel::Everyone => true,
            DiscordPermissionLevel::HasRole(role_id) => user.roles.contains(role_id),
            DiscordPermissionLevel::Admin => {
                // Check if user has administrator role (simplified - in real impl check actual permissions)
                user.roles.iter().any(|r| r.contains("admin") || r.contains("moderator"))
            }
            DiscordPermissionLevel::Owner => {
                // TODO: Compare with bot owner ID from config
                false
            }
        }
    }

    /// Process a Discord message and execute command if found
    pub async fn process_message(&self, ctx: &Context, msg: &Message) -> Result<()> {
        // Ignore bot messages
        if msg.author.bot {
            return Ok(());
        }

        // Check if message starts with prefix
        if !msg.content.starts_with(&self.prefix) {
            return Ok(());
        }

        // Parse command and arguments
        let content = msg.content[self.prefix.len()..].trim();
        let parts: Vec<&str> = content.split_whitespace().collect();

        if parts.is_empty() {
            return Ok(());
        }

        let command_name = parts[0].to_lowercase();
        let args: Vec<String> = parts[1..].iter().map(|s| s.to_string()).collect();

        // Find command
        let commands = self.commands.read().await;
        let command = match commands.get(&command_name) {
            Some(cmd) => cmd.clone(),
            None => return Ok(()), // Command not found, silently ignore
        };
        drop(commands);

        // Check if command is enabled
        if !command.enabled {
            return Ok(());
        }

        // Build user context
        let user = DiscordUser {
            id: msg.author.id.to_string(),
            username: msg.author.name.clone(),
            is_bot: msg.author.bot,
            roles: Vec::new(), // TODO: Fetch actual roles from guild member
        };

        // Check permissions
        if !self.check_permission(&user, &command.permission) {
            msg.reply(&ctx.http, "❌ You don't have permission to use this command.")
                .await?;
            return Ok(());
        }

        // Check cooldown
        let mut cooldowns = self.cooldowns.write().await;
        if !cooldowns.check_cooldown(&user.id, &command_name, command.cooldown_seconds) {
            let remaining = cooldowns.get_remaining_cooldown(&user.id, &command_name, command.cooldown_seconds);
            msg.reply(
                &ctx.http,
                &format!("⏱️ This command is on cooldown. Try again in {} seconds.", remaining),
            )
            .await?;
            return Ok(());
        }
        drop(cooldowns);

        // Build command context
        let cmd_ctx = DiscordCommandContext {
            command: command_name.clone(),
            args,
            channel_id: msg.channel_id.to_string(),
            guild_id: msg.guild_id.map(|id| id.to_string()),
            user,
        };

        // Execute command handler
        log::info!("Executing Discord command: {}", command_name);

        match (command.handler)(cmd_ctx, self.database.clone()) {
            Ok(Some(response)) => {
                msg.reply(&ctx.http, &response).await?;
            }
            Ok(None) => {
                // Command executed but no response needed
            }
            Err(e) => {
                log::error!("Discord command '{}' failed: {}", command_name, e);
                msg.reply(&ctx.http, "❌ An error occurred while executing the command.")
                    .await?;
            }
        }

        Ok(())
    }

    /// Get command prefix
    pub fn get_prefix(&self) -> &str {
        &self.prefix
    }

    /// Set command prefix
    pub async fn set_prefix(&mut self, prefix: String) {
        self.prefix = prefix;
    }
}
