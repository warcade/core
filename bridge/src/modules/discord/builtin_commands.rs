use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use super::discord_commands::*;
use crate::commands::database::{Database, DiscordCustomCommand};

/// Register all built-in Discord commands
pub async fn register_builtin_commands(command_system: &DiscordCommandSystem) {
    // Ping command - check bot latency
    command_system
        .register(
            DiscordCommand::new("ping", Arc::new(ping_command))
                .description("Check bot latency")
                .usage("!ping")
                .cooldown(5),
        )
        .await;

    // Help command - show available commands
    command_system
        .register(
            DiscordCommand::new("help", Arc::new(help_command))
                .aliases(vec!["commands".to_string(), "?".to_string()])
                .description("Show available commands or get help for a specific command")
                .usage("!help [command]")
                .cooldown(3),
        )
        .await;

    // Uptime command - show bot uptime
    command_system
        .register(
            DiscordCommand::new("uptime", Arc::new(uptime_command))
                .description("Show how long the bot has been running")
                .usage("!uptime")
                .cooldown(5),
        )
        .await;

    // Song request command
    command_system
        .register(
            DiscordCommand::new("sr", Arc::new(song_request_command))
                .aliases(vec!["songrequest".to_string(), "song".to_string()])
                .description("Request a song to be played")
                .usage("!sr <song name>")
                .cooldown(30),
        )
        .await;

    // Queue command - show current song queue
    command_system
        .register(
            DiscordCommand::new("queue", Arc::new(queue_command))
                .aliases(vec!["q".to_string(), "songs".to_string()])
                .description("Show the current song request queue")
                .usage("!queue")
                .cooldown(10),
        )
        .await;

    // Voice commands disabled - requires songbird dependency
    /*
    // Play command - start playing songs from queue
    command_system
        .register(
            DiscordCommand::new("play", Arc::new(play_command))
                .aliases(vec!["start".to_string()])
                .description("Start playing songs from the queue")
                .usage("!play")
                .cooldown(5),
        )
        .await;

    // Skip command - skip current song
    command_system
        .register(
            DiscordCommand::new("skip", Arc::new(skip_command))
                .aliases(vec!["next".to_string()])
                .description("Skip the current song")
                .usage("!skip")
                .cooldown(5),
        )
        .await;

    // Pause command - pause playback
    command_system
        .register(
            DiscordCommand::new("pause", Arc::new(pause_command))
                .description("Pause the current song")
                .usage("!pause")
                .cooldown(5),
        )
        .await;

    // Resume command - resume playback
    command_system
        .register(
            DiscordCommand::new("resume", Arc::new(resume_command))
                .aliases(vec!["unpause".to_string()])
                .description("Resume playback")
                .usage("!resume")
                .cooldown(5),
        )
        .await;

    // Now playing command - show current song
    command_system
        .register(
            DiscordCommand::new("now", Arc::new(now_playing_command))
                .aliases(vec!["np".to_string(), "current".to_string()])
                .description("Show the currently playing song")
                .usage("!now")
                .cooldown(5),
        )
        .await;

    // Stop command - stop playback and leave voice channel
    command_system
        .register(
            DiscordCommand::new("stop", Arc::new(stop_command))
                .aliases(vec!["leave".to_string(), "disconnect".to_string()])
                .description("Stop playback and leave voice channel")
                .usage("!stop")
                .cooldown(5),
        )
        .await;
    */
}

// Command handlers

fn ping_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    Ok(Some("🏓 Pong!".to_string()))
}

fn help_command(ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    if ctx.args.is_empty() {
        // Show all commands
        let help_text = r#"
**📋 Available Commands:**

**General:**
• `!ping` - Check bot latency
• `!help [command]` - Show this help message
• `!uptime` - Show bot uptime

**Song Requests:**
• `!sr <song>` - Request a song
• `!queue` - Show song request queue

**For more info on a command, use:** `!help <command>`
"#;
        Ok(Some(help_text.to_string()))
    } else {
        // Show help for specific command
        let cmd_name = &ctx.args[0].to_lowercase();
        let help_text = match cmd_name.as_str() {
            "ping" => "**!ping** - Check if the bot is responsive and see latency.",
            "help" | "commands" => "**!help [command]** - Show all commands or get detailed help for a specific command.",
            "uptime" => "**!uptime** - Show how long the bot has been running since last restart.",
            "sr" | "songrequest" | "song" => {
                "**!sr <song name>** - Request a song to be added to the queue.\n\
                Example: `!sr Darude Sandstorm`\n\
                Cooldown: 30 seconds"
            }
            "queue" | "q" | "songs" => "**!queue** - Display the current song request queue with pending songs.",
            _ => "❓ Command not found. Use `!help` to see all available commands.",
        };

        Ok(Some(help_text.to_string()))
    }
}

// Global start time for uptime tracking
static START_TIME: std::sync::OnceLock<u64> = std::sync::OnceLock::new();

pub fn init_uptime() {
    START_TIME.get_or_init(|| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    });
}

fn uptime_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    let start_time = START_TIME.get().copied().unwrap_or_else(|| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    });

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let uptime_seconds = now - start_time;
    let days = uptime_seconds / 86400;
    let hours = (uptime_seconds % 86400) / 3600;
    let minutes = (uptime_seconds % 3600) / 60;
    let seconds = uptime_seconds % 60;

    let uptime_str = if days > 0 {
        format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
    } else if hours > 0 {
        format!("{}h {}m {}s", hours, minutes, seconds)
    } else if minutes > 0 {
        format!("{}m {}s", minutes, seconds)
    } else {
        format!("{}s", seconds)
    };

    Ok(Some(format!("⏰ Bot has been running for: **{}**", uptime_str)))
}

fn song_request_command(ctx: DiscordCommandContext, db: Arc<Database>) -> DiscordCommandResult {
    if ctx.args.is_empty() {
        return Ok(Some(
            "❌ Please provide a song name! Usage: `!sr <song name>`".to_string(),
        ));
    }

    let song_query = ctx.args.join(" ");

    // Check queue size
    match db.get_pending_song_requests_count() {
        Ok(count) => {
            // TODO: Get max queue size from config
            let max_queue_size = 50;
            if count >= max_queue_size {
                return Ok(Some(
                    "⚠️ Song queue is full! Please wait for some songs to play.".to_string(),
                ));
            }
        }
        Err(e) => {
            log::error!("Failed to check queue size: {}", e);
            return Err(e.into());
        }
    }

    // Add song request
    match db.add_song_request(&song_query, &ctx.user.id, &ctx.user.username) {
        Ok(_) => Ok(Some(format!("✅ Added **{}** to the queue!", song_query))),
        Err(e) => {
            log::error!("Failed to add song request: {}", e);
            Ok(Some(
                "❌ Failed to add song to queue. Please try again.".to_string(),
            ))
        }
    }
}

fn queue_command(_ctx: DiscordCommandContext, db: Arc<Database>) -> DiscordCommandResult {
    match db.get_pending_song_requests() {
        Ok(requests) => {
            if requests.is_empty() {
                return Ok(Some("📭 The song queue is empty!".to_string()));
            }

            let mut response = String::from("**🎵 Song Request Queue:**\n\n");

            for (index, request) in requests.iter().enumerate().take(10) {
                response.push_str(&format!(
                    "**{}**. {} - *requested by {}*\n",
                    index + 1,
                    request.song_query,
                    request.requester_name
                ));
            }

            if requests.len() > 10 {
                response.push_str(&format!("\n*...and {} more*", requests.len() - 10));
            }

            response.push_str(&format!("\n\n*Total songs in queue: {}*", requests.len()));

            Ok(Some(response))
        }
        Err(e) => {
            log::error!("Failed to get song queue: {}", e);
            Ok(Some("❌ Failed to retrieve song queue.".to_string()))
        }
    }
}

/// Load and register custom commands from database
pub async fn load_custom_commands(command_system: &DiscordCommandSystem, database: Arc<Database>) {
    match database.get_enabled_discord_custom_commands() {
        Ok(commands) => {
            log::info!("Loading {} custom Discord commands from database", commands.len());

            for cmd in commands {
                let cmd_name = cmd.name.clone();
                let response = cmd.response.clone();

                // Create handler for custom command
                let handler: DiscordCommandHandler = Arc::new(move |_ctx, _db| {
                    Ok(Some(response.clone()))
                });

                // Parse permission level
                let permission = match cmd.permission.as_str() {
                    "Admin" => DiscordPermissionLevel::Admin,
                    "Owner" => DiscordPermissionLevel::Owner,
                    role if role.starts_with("Role:") => {
                        DiscordPermissionLevel::HasRole(role.replace("Role:", ""))
                    }
                    _ => DiscordPermissionLevel::Everyone,
                };

                // Build command
                let discord_cmd = DiscordCommand::new(&cmd.name, handler)
                    .aliases(cmd.aliases)
                    .description(cmd.description)
                    .cooldown(cmd.cooldown as u32)
                    .permission(permission)
                    .enabled(cmd.enabled);

                // Register command
                command_system.register(discord_cmd).await;
                log::debug!("Registered custom command: {}", cmd_name);
            }

            log::info!("Custom Discord commands loaded successfully");
        }
        Err(e) => {
            log::error!("Failed to load custom Discord commands: {}", e);
        }
    }
}

/// Reload custom commands (unregister old, register new)
pub async fn reload_custom_commands(command_system: &DiscordCommandSystem, database: Arc<Database>) {
    // For now, we can't easily unregister individual commands
    // In a production system, you'd want to track which commands are custom
    // and selectively unregister/re-register them

    // As a workaround, just load new commands (they'll override if same name)
    load_custom_commands(command_system, database).await;
}

// Voice commands disabled - requires songbird dependency
/*
// === MUSIC PLAYBACK COMMANDS ===

fn play_command(ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::{get_music_player, get_songbird};

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let songbird = match get_songbird() {
        Some(s) => s,
        None => return Ok(Some("❌ Voice system not initialized".to_string())),
    };

    // Get user's voice channel from context
    // Note: We would need to fetch this from Discord API
    // For now, return error asking user to join voice first
    let guild_id = match ctx.guild_id {
        Some(id) => match id.parse::<u64>() {
            Ok(gid) => serenity::all::GuildId::new(gid),
            Err(_) => return Ok(Some("❌ Invalid guild ID".to_string())),
        },
        None => return Ok(Some("❌ This command only works in servers".to_string())),
    };

    let channel_id = match ctx.channel_id.parse::<u64>() {
        Ok(cid) => serenity::all::ChannelId::new(cid),
        Err(_) => return Ok(Some("❌ Invalid channel ID".to_string())),
    };

    // Use tokio runtime to run async code
    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        // Join voice channel
        player.join_channel(songbird.clone(), guild_id, channel_id).await?;

        // Start playing
        player.play_next(songbird.clone()).await
    }) {
        Ok(Some(title)) => Ok(Some(format!("🎵 Now playing: **{}**", title))),
        Ok(None) => Ok(Some("📭 The queue is empty! Add some songs with !sr".to_string())),
        Err(e) => {
            log::error!("Failed to play: {}", e);
            Ok(Some(format!("❌ Failed to play: {}", e)))
        }
    }
}

fn skip_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::{get_music_player, get_songbird};

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let songbird = match get_songbird() {
        Some(s) => s,
        None => return Ok(Some("❌ Voice system not initialized".to_string())),
    };

    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        player.skip(songbird.clone()).await
    }) {
        Ok(()) => Ok(Some("⏭️ Skipped to next song".to_string())),
        Err(e) => {
            log::error!("Failed to skip: {}", e);
            Ok(Some(format!("❌ {}", e)))
        }
    }
}

fn pause_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::{get_music_player, get_songbird};

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let songbird = match get_songbird() {
        Some(s) => s,
        None => return Ok(Some("❌ Voice system not initialized".to_string())),
    };

    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        player.pause(songbird.clone()).await
    }) {
        Ok(()) => Ok(Some("⏸️ Paused playback".to_string())),
        Err(e) => {
            log::error!("Failed to pause: {}", e);
            Ok(Some(format!("❌ {}", e)))
        }
    }
}

fn resume_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::{get_music_player, get_songbird};

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let songbird = match get_songbird() {
        Some(s) => s,
        None => return Ok(Some("❌ Voice system not initialized".to_string())),
    };

    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        player.resume(songbird.clone()).await
    }) {
        Ok(()) => Ok(Some("▶️ Resumed playback".to_string())),
        Err(e) => {
            log::error!("Failed to resume: {}", e);
            Ok(Some(format!("❌ {}", e)))
        }
    }
}

fn now_playing_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::get_music_player;

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        player.get_now_playing().await
    }) {
        Some(np) => {
            let title = np.title.unwrap_or(np.song_request.song_query.clone());
            let elapsed = chrono::Utc::now().timestamp() - np.started_at;

            let time_str = if let Some(duration) = np.duration {
                format!("[{}/{}]", format_time(elapsed as u64), format_time(duration))
            } else {
                format!("[{}]", format_time(elapsed as u64))
            };

            Ok(Some(format!(
                "🎵 **Now Playing:**\n{}\n{}\nRequested by: {}",
                title,
                time_str,
                np.song_request.requester_name
            )))
        }
        None => Ok(Some("🔇 Nothing is currently playing".to_string())),
    }
}

fn stop_command(_ctx: DiscordCommandContext, _db: Arc<Database>) -> DiscordCommandResult {
    use crate::modules::handlers::{get_music_player, get_songbird};

    let player = match get_music_player() {
        Some(p) => p,
        None => return Ok(Some("❌ Music player not initialized".to_string())),
    };

    let songbird = match get_songbird() {
        Some(s) => s,
        None => return Ok(Some("❌ Voice system not initialized".to_string())),
    };

    let handle = tokio::runtime::Handle::current();
    match handle.block_on(async {
        player.leave_channel(songbird.clone()).await
    }) {
        Ok(()) => Ok(Some("👋 Stopped playback and left voice channel".to_string())),
        Err(e) => {
            log::error!("Failed to stop: {}", e);
            Ok(Some(format!("❌ {}", e)))
        }
    }
}

// Helper function to format time in MM:SS format
fn format_time(seconds: u64) -> String {
    let mins = seconds / 60;
    let secs = seconds % 60;
    format!("{}:{:02}", mins, secs)
}
*/
