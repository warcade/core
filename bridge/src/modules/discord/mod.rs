// Discord integration modules
pub mod discord_bot;
pub mod discord_manager;
pub mod discord_commands;
pub mod builtin_commands;
// Note: music_player disabled - requires songbird dependency with CMake/Visual Studio Build Tools
// pub mod music_player;

// Re-export commonly used types
pub use discord_bot::DiscordBot;
pub use discord_manager::DiscordManager;
pub use discord_commands::{
    DiscordCommand, DiscordCommandContext, DiscordCommandHandler,
    DiscordCommandResult, DiscordCommandSystem, DiscordPermissionLevel, DiscordUser,
};
pub use builtin_commands::{register_builtin_commands, init_uptime, load_custom_commands, reload_custom_commands};
// pub use music_player::{MusicPlayer, NowPlaying};
