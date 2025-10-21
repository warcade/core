use crate::modules::twitch::{CommandSystem, Command, CommandContext, PermissionLevel, TwitchIRCManager, TwitchAPI};
use std::sync::Arc;
use super::database::Database;

/// Household tasks that can be tracked
const TASKS: &[(&str, &str, &str)] = &[
    ("shower", "🚿", "Shower taken"),
    ("gym", "💪", "Gym session completed"),
    ("poop", "💩", "Bathroom break"),
    ("pee", "🚽", "Quick bathroom visit"),
    ("washedhands", "🧼", "Hands washed"),
    ("cook", "🍳", "Meal cooked"),
    ("dishes", "🍽️", "Dishes washed"),
    ("emptybin", "🗑️", "Bin emptied"),
    ("brushteeth", "🦷", "Teeth brushed"),
    ("washclothes", "👕", "Laundry done"),
    ("tv", "📺", "TV watched"),
    ("piano", "🎹", "Piano practiced"),
    ("water", "💧", "Water consumed"),
];

pub async fn register(command_system: &CommandSystem, db: Database) {
    // Register each task command
    for (task_name, emoji, description) in TASKS {
        let task = task_name.to_string();
        let emoji = emoji.to_string();
        let desc = description.to_string();
        let db_clone = db.clone();

        let command = Command {
            name: task.clone(),
            aliases: vec![],
            description: format!("{} {}", emoji, desc),
            usage: format!("!{}", task),
            permission: PermissionLevel::Everyone,
            cooldown_seconds: 3,
            enabled: true,
            handler: Arc::new(move |ctx, irc, _api| {
                let task = task.clone();
                let emoji = emoji.clone();
                let irc = irc.clone();
                let channel = ctx.channel.clone();
                let db = db_clone.clone();
                let username = ctx.message.username.clone();
                let is_subscriber = ctx.message.is_subscriber;
                let is_moderator = ctx.message.is_moderator;
                let is_broadcaster = ctx.message.badges.iter().any(|b| b.starts_with("broadcaster"));

                tokio::spawn(async move {
                    // Subscribers can add, mods can subtract, everyone can view
                    let has_add = ctx.args.first().map(|s| s.as_str()) == Some("+") ||
                                  ctx.args.first().map(|s| s.as_str()) == Some("add");
                    let has_sub = ctx.args.first().map(|s| s.as_str()) == Some("-") ||
                                  ctx.args.first().map(|s| s.as_str()) == Some("sub");

                    if has_add {
                        // Subscribers can add
                        if !is_subscriber && !is_moderator && !is_broadcaster {
                            let _ = irc.send_message(&channel,
                                &format!("@{} Only subscribers can add to counters! Subscribe to help track tasks.", username)
                            ).await;
                            return;
                        }

                        match db.increment(&channel, &task) {
                            Ok(count) => {
                                let _ = irc.send_message(&channel,
                                    &format!("{} {} +1 by @{}! Total: {}", emoji, task, username, count)
                                ).await;
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    } else if has_sub {
                        // Mods can subtract
                        if !is_moderator && !is_broadcaster {
                            let _ = irc.send_message(&channel,
                                &format!("@{} Only moderators can subtract from counters!", username)
                            ).await;
                            return;
                        }

                        match db.decrement(&channel, &task) {
                            Ok(count) => {
                                let _ = irc.send_message(&channel,
                                    &format!("{} {} -1 by @{}. Total: {}", emoji, task, username, count)
                                ).await;
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    } else {
                        // Everyone can view
                        match db.get_count(&channel, &task) {
                            Ok(count) => {
                                let _ = irc.send_message(&channel,
                                    &format!("{} {}: {} times", emoji, task, count)
                                ).await;
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    }
                });

                Ok(None)
            }),
        };

        command_system.register_command(command).await;
    }

    // Register !tasks command to view all
    let db_clone = db.clone();
    let command = Command {
        name: "tasks".to_string(),
        aliases: vec!["household".to_string(), "stats".to_string()],
        description: "View all household task counters".to_string(),
        usage: "!tasks".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 10,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let db = db_clone.clone();

            tokio::spawn(async move {
                match db.get_all_counts(&channel) {
                    Ok(counts) => {
                        if counts.is_empty() {
                            let _ = irc.send_message(&channel, "No tasks tracked yet! Use commands like: !shower +, !gym +, !poop +").await;
                        } else {
                            let summary: Vec<String> = counts.iter()
                                .take(5) // Show top 5
                                .map(|(task, count)| {
                                    let emoji = TASKS.iter()
                                        .find(|(t, _, _)| t == task)
                                        .map(|(_, e, _)| *e)
                                        .unwrap_or("✅");
                                    format!("{}{}: {}", emoji, task, count)
                                })
                                .collect();

                            let _ = irc.send_message(&channel, &format!("📊 Tasks: {}", summary.join(" | "))).await;
                        }
                    }
                    Err(e) => {
                        log::error!("Database error: {}", e);
                        let _ = irc.send_message(&channel, "Database error!").await;
                    }
                }
            });

            Ok(None)
        }),
    };

    command_system.register_command(command).await;

    log::info!("✅ Registered {} household task commands", TASKS.len());
}
