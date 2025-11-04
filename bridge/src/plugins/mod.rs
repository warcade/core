// All plugins are registered here

// Tier 1: Foundational plugins
pub mod currency;
pub mod notes;
pub mod goals;
pub mod todos;

// Tier 2: Game plugins
pub mod auction;
pub mod roulette;
pub mod levels;
pub mod wheel;
pub mod packs;

// Tier 3: Utility plugins
pub mod files;
pub mod system;
pub mod ticker;
pub mod text_commands;
pub mod user_profiles;
pub mod tts;
pub mod confessions;
pub mod household;

// Tier 4: Integration plugins
pub mod twitch;
pub mod hue;
pub mod withings;

// Plugin stubs (not yet implemented)
// pub mod watchtime;
// pub mod fun_commands;
// pub mod discord;
// pub mod alexa;
// pub mod obs;

use crate::core::plugin_manager::PluginManager;

/// Register all plugins with the plugin manager
/// Plugins are loaded in dependency order automatically
pub fn register_all_plugins(manager: &mut PluginManager) {
    log::info!("📦 Registering plugins...");

    // Tier 1: Foundational plugins (no dependencies)
    manager.register(currency::CurrencyPlugin);
    manager.register(notes::NotesPlugin);
    manager.register(goals::GoalsPlugin);
    manager.register(todos::TodosPlugin);

    // Tier 2: Game plugins (depend on currency)
    manager.register(auction::AuctionPlugin);
    manager.register(roulette::RoulettePlugin);
    manager.register(levels::LevelsPlugin);
    manager.register(wheel::WheelPlugin);
    manager.register(packs::PacksPlugin);

    // Tier 3: Utility plugins
    manager.register(files::FilesPlugin);
    manager.register(system::SystemPlugin);
    manager.register(ticker::TickerPlugin);
    manager.register(text_commands::TextCommandsPlugin);
    manager.register(user_profiles::UserProfilesPlugin);
    manager.register(tts::TtsPlugin);
    manager.register(confessions::ConfessionsPlugin);
    manager.register(household::HouseholdPlugin);

    // Tier 4: Integration plugins
    manager.register(twitch::TwitchPlugin);
    manager.register(hue::HuePlugin);
    manager.register(withings::WithingsPlugin);

    // TODO: Uncomment as you implement remaining plugins:
    // manager.register(watchtime::WatchtimePlugin);
    // manager.register(fun_commands::FunCommandsPlugin);
    // manager.register(discord::DiscordPlugin);
    // manager.register(alexa::AlexaPlugin);
    // manager.register(obs::ObsPlugin);

    log::info!("✅ Plugin registration complete (19 plugins)");
}
