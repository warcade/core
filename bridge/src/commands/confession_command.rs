use crate::modules::twitch::{CommandSystem, Command, CommandContext, PermissionLevel};
use std::sync::Arc;
use super::database::Database;

pub async fn register(command_system: &CommandSystem, db: Database) {
    // !confession command - submit an anonymous confession (whisper only)
    let db_clone = db.clone();
    let command = Command {
        name: "confession".to_string(),
        aliases: vec!["confess".to_string()],
        description: "Submit an anonymous confession (whisper only)".to_string(),
        usage: "!confession <your confession message>".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 30, // 30 second cooldown to prevent spam
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let db = db_clone.clone();

            // Get the confession message
            let confession_text = ctx.args.join(" ");

            // Check if message is empty
            if confession_text.trim().is_empty() {
                let error_msg = format!("@{} Please provide a confession message! Usage: !confession <message>", username);
                let irc_clone = irc.clone();
                let channel_clone = channel.clone();
                tokio::spawn(async move {
                    let _ = irc_clone.send_message(&channel_clone, &error_msg).await;
                });
                return Ok(None);
            }

            // Check message length (max 500 characters)
            if confession_text.len() > 500 {
                let error_msg = format!("@{} Your confession is too long! Please keep it under 500 characters.", username);
                let irc_clone = irc.clone();
                let channel_clone = channel.clone();
                tokio::spawn(async move {
                    let _ = irc_clone.send_message(&channel_clone, &error_msg).await;
                });
                return Ok(None);
            }

            tokio::spawn(async move {
                // Store the confession in the database
                match db.add_confession(&channel, &username, &confession_text) {
                    Ok(_) => {
                        let success_msg = format!("@{} Your confession has been submitted anonymously! 🤫", username);
                        let _ = irc.send_message(&channel, &success_msg).await;
                        log::info!("📝 New confession from {} in {}", username, channel);
                    }
                    Err(e) => {
                        log::error!("Failed to save confession: {}", e);
                        let error_msg = format!("@{} Failed to save your confession. Please try again later.", username);
                        let _ = irc.send_message(&channel, &error_msg).await;
                    }
                }
            });

            Ok(None)
        }),
    };

    command_system.register_command(command).await;

    log::info!("✅ Registered confession command");
}
