use crate::commands::database::Database;
use crate::modules::twitch::{CommandSystem, Command, PermissionLevel, TwitchIRCManager};
use crate::modules::twitch::twitch_irc_client::{TwitchEvent, WheelOption, WheelSpinEvent};
use log::error;
use std::sync::Arc;

/// Register wheel commands
pub async fn register(command_system: &CommandSystem, database: Arc<Database>) {
    let spin_command = Command {
        name: "spin".to_string(),
        aliases: vec!["wheel".to_string()],
        description: "Spin the wheel to pick a random option".to_string(),
        usage: "!spin".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 10,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let db = database.clone();
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();

            Ok(Some(tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async move {
                    handle_spin_command(&channel, &username, db, irc).await
                })
            })))
        }),
    };

    command_system.register_command(spin_command).await;
}

/// Handle the !spin command
async fn handle_spin_command(
    channel: &str,
    username: &str,
    database: Arc<Database>,
    irc: Arc<TwitchIRCManager>,
) -> String {
    log::info!("🎡 Spin command triggered by {} in channel {}", username, channel);

    // Check spin availability (daily spin + tokens)
    let (coins, spin_tokens, daily_available) = match database.get_user_currency(channel, username) {
        Ok(currency) => {
            log::info!("!spin: channel='{}' username='{}' coins={} spin_tokens={} daily_available={}",
                channel, username, currency.0, currency.1, currency.2);
            currency
        },
        Err(e) => {
            error!("Failed to get user currency for {} in {}: {}", username, channel, e);
            return "❌ Failed to check spin availability".to_string();
        }
    };

    let has_daily_spin = daily_available;
    let has_tokens = spin_tokens > 0;

    if !has_daily_spin && !has_tokens {
        return format!(
            "@{} You don't have any spins available! You have {} spin tokens. Daily spin resets in {} hours. Earn more tokens by participating in the stream!",
            username,
            spin_tokens,
            get_hours_until_daily_reset(channel, username, &database)
        );
    }

    // Get wheel options from database
    let options_raw = match database.get_wheel_options(channel) {
        Ok(opts) => {
            log::info!("Found {} wheel options for channel {}", opts.len(), channel);
            opts
        },
        Err(e) => {
            error!("Failed to get wheel options: {}", e);
            return "❌ Failed to load wheel options".to_string();
        }
    };

    // Filter to only enabled options
    let enabled_options: Vec<_> = options_raw
        .into_iter()
        .filter(|opt| opt.enabled == 1)
        .collect();

    log::info!("Found {} enabled wheel options", enabled_options.len());

    if enabled_options.is_empty() {
        log::warn!("No enabled wheel options for channel {}", channel);
        return "❌ No wheel options available. Add some in the Wheel viewport first!".to_string();
    }

    // Use weight-based selection
    let winner = {
        log::info!("Using weight-based wheel selection");

        let mut weighted_options = Vec::new();
        for option in &enabled_options {
            for _ in 0..option.weight {
                weighted_options.push(option);
            }
        }

        if weighted_options.is_empty() {
            log::error!("No weighted options available!");
            return "❌ Wheel configuration error: no weights set".to_string();
        }

        let winner_index = fastrand::usize(0..weighted_options.len());
        weighted_options[winner_index]
    };

    log::info!("🎯 Wheel winner: {} (weight: {})",
        winner.option_text,
        winner.weight
    );

    // Convert to WheelOption format for event
    let wheel_options: Vec<WheelOption> = enabled_options
        .iter()
        .map(|opt| WheelOption {
            text: opt.option_text.clone(),
            color: opt.color.clone(),
        })
        .collect();

    // Use a spin (prefer token over daily spin to preserve daily)
    let used_token = if has_tokens {
        match database.remove_spin_tokens(channel, username, 1) {
            Ok(Some(remaining)) => {
                log::info!("Used spin token for {}. {} tokens remaining", username, remaining);
                true
            }
            _ => {
                error!("Failed to remove spin token");
                return "❌ Failed to use spin token".to_string();
            }
        }
    } else if has_daily_spin {
        match database.use_daily_spin(channel, username) {
            Ok(_) => {
                log::info!("Used daily spin for {}", username);
                false
            }
            Err(e) => {
                error!("Failed to use daily spin: {}", e);
                return "❌ Failed to use daily spin".to_string();
            }
        }
    } else {
        return format!("@{} No spins available!", username);
    };

    // Process rewards based on what they won (silently)
    process_spin_reward(channel, username, &winner.option_text, &database);

    // Record the spin in database
    if let Err(e) = database.record_wheel_spin(channel, &winner.option_text, Some(username)) {
        error!("Failed to record wheel spin: {}", e);
    } else {
        log::info!("✅ Recorded wheel spin in database");
    }

    // Broadcast the wheel spin event via WebSocket
    let wheel_event = TwitchEvent::WheelSpin(WheelSpinEvent {
        channel: channel.to_string(),
        winner: winner.option_text.clone(),
        options: wheel_options,
        triggered_by: Some(username.to_string()),
    });

    let event_sender = irc.get_event_sender();
    if let Err(e) = event_sender.send(wheel_event) {
        error!("❌ Failed to broadcast wheel spin event: {}", e);
    } else {
        log::info!("✅ Broadcasted wheel spin event via WebSocket");
    }

    // Return a chat message (the overlay will show the animation)
    format!("🎡 Spinning the wheel for @{}...", username)
}

/// Calculate hours until daily spin resets
fn get_hours_until_daily_reset(channel: &str, username: &str, database: &Database) -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    if let Ok(conn) = database.get_user_currency(channel, username) {
        // This is simplified - we'd need to track last_daily_spin properly
        24 // Default to 24 hours
    } else {
        0
    }
}

/// Process rewards from wheel spin (silently awards coins/tokens)
fn process_spin_reward(channel: &str, username: &str, result: &str, database: &Database) {
    // Check if the result contains coin/token rewards
    let result_lower = result.to_lowercase();

    // Parse for level up rewards (e.g., "Level Up", "+1 Level", "Instant Level Up")
    if result_lower.contains("level") && (result_lower.contains("up") || result_lower.contains("+")) {
        // Get user's current level and XP
        match database.get_user_level(channel, username) {
            Ok(Some((current_level, current_xp, _, _))) => {
                // Calculate XP needed to reach next level
                let xp_for_next = crate::commands::database::Database::xp_for_level(current_level + 1);

                // Award enough XP to level up
                match database.add_user_xp(channel, username, xp_for_next, 0) {
                    Ok(Some((old_level, new_level, _, _))) => {
                        log::info!("⬆️ Leveled up {} from wheel spin: {} -> {}", username, old_level, new_level);

                        // Award level up rewards
                        use crate::commands::rewards::{RewardSystem, RewardEvent};
                        if let Ok(config) = RewardSystem::process_event(database, channel, username, RewardEvent::LevelUp(new_level)) {
                            let reward_msg = RewardSystem::format_rewards(&config);
                            log::info!("💰 Level up rewards for {}: {}", username, reward_msg);
                        }
                    }
                    Ok(None) => {
                        log::warn!("Failed to level up {} from wheel spin (on cooldown or error)", username);
                    }
                    Err(e) => {
                        log::error!("Error leveling up {} from wheel spin: {}", username, e);
                    }
                }
            }
            Ok(None) => {
                log::warn!("User {} not found for level up reward", username);
            }
            Err(e) => {
                log::error!("Error getting level for {}: {}", username, e);
            }
        }
    }

    // Parse for coin rewards (e.g., "100 coins", "+50 coins")
    if result_lower.contains("coin") {
        if let Some(amount) = extract_number_from_text(result) {
            if let Ok(Some(new_balance)) = database.add_coins(channel, username, amount) {
                log::info!("💰 Awarded {} coins to {} from wheel spin. New balance: {}", amount, username, new_balance);
            }
        }
    }

    // Parse for spin token rewards (e.g., "1 spin token", "+2 spins")
    if result_lower.contains("spin") && (result_lower.contains("token") || result_lower.contains("extra")) {
        if let Some(amount) = extract_number_from_text(result) {
            if let Ok(Some(new_balance)) = database.add_spin_tokens(channel, username, amount) {
                log::info!("🎫 Awarded {} spin token(s) to {} from wheel spin. Total: {}", amount, username, new_balance);
            }
        }
    }
}

/// Extract first number from text
fn extract_number_from_text(text: &str) -> Option<i64> {
    text.split_whitespace()
        .find_map(|word| {
            // Remove common separators and try to parse
            word.chars()
                .filter(|c| c.is_numeric())
                .collect::<String>()
                .parse::<i64>()
                .ok()
        })
}
