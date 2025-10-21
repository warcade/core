use crate::modules::twitch::{CommandSystem, Command, PermissionLevel};
use std::sync::Arc;
use rand::Rng;

pub async fn register(command_system: &CommandSystem) {
    // Register !dice command (defaults to 1-6, or specify range)
    let dice_command = Command {
        name: "dice".to_string(),
        aliases: vec![],
        description: "Roll a die (defaults to 1-6, or specify range)".to_string(),
        usage: "!dice [min] [max]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 2,
        enabled: true,
        handler: Arc::new(|ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                // Default to 1-6 if no arguments
                let (min, max) = if args.is_empty() {
                    (1, 6)
                } else if args.len() < 2 {
                    let _ = irc.send_message(&channel,
                        &format!("@{} Usage: !dice [min] [max] (e.g., !dice 1 100) or just !dice for 1-6", username)
                    ).await;
                    return;
                } else {
                    // Parse min
                    let min = match args[0].parse::<i32>() {
                        Ok(n) => n,
                        Err(_) => {
                            let _ = irc.send_message(&channel,
                                &format!("@{} Invalid minimum value. Use numbers only.", username)
                            ).await;
                            return;
                        }
                    };

                    // Parse max
                    let max = match args[1].parse::<i32>() {
                        Ok(n) => n,
                        Err(_) => {
                            let _ = irc.send_message(&channel,
                                &format!("@{} Invalid maximum value. Use numbers only.", username)
                            ).await;
                            return;
                        }
                    };

                    if min >= max {
                        let _ = irc.send_message(&channel,
                            &format!("@{} Minimum must be less than maximum!", username)
                        ).await;
                        return;
                    }

                    if max - min > 1000000 {
                        let _ = irc.send_message(&channel,
                            &format!("@{} Range too large! Keep it under 1,000,000.", username)
                        ).await;
                        return;
                    }

                    (min, max)
                };

                // Generate random number
                let roll = rand::thread_rng().gen_range(min..=max);

                let _ = irc.send_message(&channel,
                    &format!("🎲 {} rolled a {}!", username, roll)
                ).await;
            });

            Ok(None)
        }),
    };

    command_system.register_command(dice_command).await;
    log::info!("✅ Registered dice command");
}
