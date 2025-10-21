use crate::modules::twitch::{CommandSystem, Command, CommandContext, PermissionLevel, TwitchIRCManager, TwitchAPI};
use std::sync::Arc;
use super::database::Database;

pub async fn register(command_system: &CommandSystem, db: Database) {
    let command = Command {
        name: "todo".to_string(),
        aliases: vec!["todos".to_string(), "tasks".to_string()],
        description: "Manage your personal todo list".to_string(),
        usage: "!todo [add <task> | list | done <id> | remove <id> | @user]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 2,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let db = db.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                // Parse subcommand
                let subcommand = args.first().map(|s| s.as_str());

                match subcommand {
                    // !todo add <task>
                    Some("add") if args.len() > 1 => {
                        let task = args[1..].join(" ");

                        if task.len() > 200 {
                            let _ = irc.send_message(&channel,
                                &format!("@{} Task too long! Keep it under 200 characters.", username)
                            ).await;
                            return;
                        }

                        match db.add_todo(&channel, &username, &task) {
                            Ok(id) => {
                                let _ = irc.send_message(&channel,
                                    &format!("✅ @{} Added todo #{}: {}", username, id, task)
                                ).await;
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    }

                    // !todo done <id> or !todo complete <id>
                    Some("done") | Some("complete") if args.len() > 1 => {
                        let id_str = &args[1];
                        match id_str.parse::<i64>() {
                            Ok(id) => {
                                match db.complete_todo(&channel, &username, id) {
                                    Ok(true) => {
                                        let _ = irc.send_message(&channel,
                                            &format!("🎉 @{} Completed todo #{}!", username, id)
                                        ).await;
                                    }
                                    Ok(false) => {
                                        let _ = irc.send_message(&channel,
                                            &format!("@{} Todo #{} not found or already completed.", username, id)
                                        ).await;
                                    }
                                    Err(e) => {
                                        log::error!("Database error: {}", e);
                                        let _ = irc.send_message(&channel, "Database error!").await;
                                    }
                                }
                            }
                            Err(_) => {
                                let _ = irc.send_message(&channel,
                                    &format!("@{} Invalid ID. Usage: !todo done <id>", username)
                                ).await;
                            }
                        }
                    }

                    // !todo remove <id> or !todo delete <id>
                    Some("remove") | Some("delete") | Some("rm") if args.len() > 1 => {
                        let id_str = &args[1];
                        match id_str.parse::<i64>() {
                            Ok(id) => {
                                match db.remove_todo(&channel, &username, id) {
                                    Ok(true) => {
                                        let _ = irc.send_message(&channel,
                                            &format!("🗑️ @{} Removed todo #{}.", username, id)
                                        ).await;
                                    }
                                    Ok(false) => {
                                        let _ = irc.send_message(&channel,
                                            &format!("@{} Todo #{} not found.", username, id)
                                        ).await;
                                    }
                                    Err(e) => {
                                        log::error!("Database error: {}", e);
                                        let _ = irc.send_message(&channel, "Database error!").await;
                                    }
                                }
                            }
                            Err(_) => {
                                let _ = irc.send_message(&channel,
                                    &format!("@{} Invalid ID. Usage: !todo remove <id>", username)
                                ).await;
                            }
                        }
                    }

                    // !todo @username - view someone else's todos
                    Some(target) if target.starts_with('@') => {
                        let target_user = target.trim_start_matches('@');

                        match db.get_user_todos(&channel, target_user) {
                            Ok(todos) => {
                                if todos.is_empty() {
                                    let _ = irc.send_message(&channel,
                                        &format!("📝 @{} has no active todos!", target_user)
                                    ).await;
                                } else {
                                    let todo_list: Vec<String> = todos.iter()
                                        .take(3) // Show max 3 todos
                                        .map(|(id, task)| format!("#{}: {}", id, task))
                                        .collect();

                                    let count = todos.len();
                                    let suffix = if count > 3 { format!(" (+{} more)", count - 3) } else { String::new() };

                                    let _ = irc.send_message(&channel,
                                        &format!("📝 @{}'s todos: {}{}", target_user, todo_list.join(" | "), suffix)
                                    ).await;
                                }
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    }

                    // !todo or !todo list - view own todos
                    None | Some("list") | Some("show") => {
                        match db.get_user_todos(&channel, &username) {
                            Ok(todos) => {
                                if todos.is_empty() {
                                    let _ = irc.send_message(&channel,
                                        &format!("📝 @{} You have no active todos! Use: !todo add <task>", username)
                                    ).await;
                                } else {
                                    let todo_list: Vec<String> = todos.iter()
                                        .take(3) // Show max 3 todos
                                        .map(|(id, task)| format!("#{}: {}", id, task))
                                        .collect();

                                    let count = todos.len();
                                    let suffix = if count > 3 { format!(" (+{} more)", count - 3) } else { String::new() };

                                    let _ = irc.send_message(&channel,
                                        &format!("📝 @{}'s todos: {}{}", username, todo_list.join(" | "), suffix)
                                    ).await;
                                }
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    }

                    // Invalid usage
                    _ => {
                        let _ = irc.send_message(&channel,
                            &format!("@{} Usage: !todo [add <task> | list | done <id> | remove <id> | @user]", username)
                        ).await;
                    }
                }
            });

            Ok(None)
        }),
    };

    command_system.register_command(command).await;
    log::info!("✅ Registered todo command");
}
