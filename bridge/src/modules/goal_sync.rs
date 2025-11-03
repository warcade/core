use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use log::{info, error, debug};
use crate::commands::database::Database;
use crate::modules::twitch::TwitchManager;
use crate::modules::handlers::broadcast_goals_for_channel;

/// Auto-sync interval in minutes
const SYNC_INTERVAL_MINUTES: u64 = 5;

/// Minimum time between syncs for the same goal (in seconds)
/// This prevents excessive API calls if multiple sync attempts occur
const MIN_SYNC_INTERVAL_SECONDS: i64 = 120;

/// Starts a background task that periodically syncs follower and subscriber goals with Twitch
pub fn start_goal_sync_task(
    database: Arc<Database>,
    twitch_manager: Arc<TwitchManager>,
) {
    tokio::spawn(async move {
        info!("🎯 Goal auto-sync task started (syncing every {} minutes)", SYNC_INTERVAL_MINUTES);

        let mut interval = time::interval(Duration::from_secs(SYNC_INTERVAL_MINUTES * 60));

        // Skip the first tick (runs immediately)
        interval.tick().await;

        loop {
            interval.tick().await;

            debug!("Running periodic goal sync...");

            // Sync goals for all configured channels
            let config_manager = twitch_manager.get_config_manager();
            if let Ok(config) = config_manager.load() {
                for channel in &config.channels {
                    if let Err(e) = sync_goals_for_channel(
                        channel,
                        &database,
                        &twitch_manager
                    ).await {
                        error!("Failed to sync goals for channel {}: {}", channel, e);
                    }
                }
            }
        }
    });
}

/// Syncs all follower and subscriber goals for a specific channel
async fn sync_goals_for_channel(
    channel: &str,
    database: &Database,
    twitch_manager: &TwitchManager,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get all goals for this channel
    let goals = database.get_goals(channel)?;

    let mut synced_count = 0;
    let now = chrono::Utc::now().timestamp();

    for goal in goals {
        // Only sync follower and subscriber goals
        match goal.goal_type.as_str() {
            "follower" | "subscriber" => {
                // Rate limiting: skip if goal was updated recently
                let time_since_update = now - goal.updated_at;
                if time_since_update < MIN_SYNC_INTERVAL_SECONDS {
                    debug!("Skipping {} goal '{}' for {} (updated {} seconds ago)",
                        goal.goal_type, goal.title, channel, time_since_update);
                    continue;
                }

                match sync_single_goal(goal.id, &goal.goal_type, channel, database, twitch_manager).await {
                    Ok(new_value) => {
                        debug!("Synced {} goal '{}' for {}: {} -> {}",
                            goal.goal_type, goal.title, channel, goal.current, new_value);
                        synced_count += 1;
                    }
                    Err(e) => {
                        error!("Failed to sync {} goal '{}' for {}: {}",
                            goal.goal_type, goal.title, channel, e);
                    }
                }
            }
            _ => {
                // Skip other goal types (manual, custom, etc.)
                continue;
            }
        }
    }

    if synced_count > 0 {
        info!("✅ Synced {} goal(s) for channel: {}", synced_count, channel);

        // Broadcast updated goals to all connected clients
        broadcast_goals_for_channel(channel);
    }

    Ok(())
}

/// Syncs a single goal with Twitch API
async fn sync_single_goal(
    goal_id: i64,
    goal_type: &str,
    channel: &str,
    database: &Database,
    twitch_manager: &TwitchManager,
) -> Result<i64, Box<dyn std::error::Error>> {
    // Fetch current count from Twitch
    let current_value = match goal_type {
        "subscriber" => {
            twitch_manager.get_subscriber_count(channel).await? as i64
        }
        "follower" => {
            twitch_manager.get_follower_count(channel).await? as i64
        }
        _ => {
            return Err("Unsupported goal type".into());
        }
    };

    // Update the goal progress in the database
    database.update_goal_progress(goal_id, current_value)?;

    Ok(current_value)
}

