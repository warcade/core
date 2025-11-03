use crate::modules::twitch::{CommandSystem, Command, PermissionLevel};
use std::sync::Arc;
use super::database::Database;

/// Available StreamElements TTS voices
const VOICES: &[(&str, &str)] = &[
    // English voices
    ("Brian", "English (UK) - Male"),
    ("Amy", "English (UK) - Female"),
    ("Emma", "English (UK) - Female"),
    ("Geraint", "English (Welsh) - Male"),
    ("Russell", "English (Australian) - Male"),
    ("Nicole", "English (Australian) - Female"),
    ("Joey", "English (US) - Male"),
    ("Justin", "English (US) - Male (Child)"),
    ("Matthew", "English (US) - Male"),
    ("Ivy", "English (US) - Female (Child)"),
    ("Joanna", "English (US) - Female"),
    ("Kendra", "English (US) - Female"),
    ("Kimberly", "English (US) - Female"),
    ("Salli", "English (US) - Female"),
    ("Raveena", "English (Indian) - Female"),

    // Other languages
    ("Cristiano", "Portuguese (European) - Male"),
    ("Ines", "Portuguese (European) - Female"),
    ("Vitoria", "Portuguese (Brazilian) - Female"),
    ("Ricardo", "Portuguese (Brazilian) - Male"),
    ("Mizuki", "Japanese - Female"),
    ("Takumi", "Japanese - Male"),
    ("Seoyeon", "Korean - Female"),
    ("Liv", "Norwegian - Female"),
    ("Lotte", "Dutch - Female"),
    ("Ruben", "Dutch - Male"),
    ("Jacek", "Polish - Male"),
    ("Jan", "Polish - Male"),
    ("Ewa", "Polish - Female"),
    ("Maja", "Polish - Female"),
    ("Filiz", "Turkish - Female"),
    ("Astrid", "Swedish - Female"),
    ("Maxim", "Russian - Male"),
    ("Tatyana", "Russian - Female"),
    ("Carmen", "Romanian - Female"),
    ("Gwyneth", "Welsh - Female"),
    ("Mads", "Danish - Male"),
    ("Naja", "Danish - Female"),
    ("Hans", "German - Male"),
    ("Marlene", "German - Female"),
    ("Vicki", "German - Female"),
    ("Karl", "Icelandic - Male"),
    ("Dora", "Icelandic - Female"),
    ("Giorgio", "Italian - Male"),
    ("Carla", "Italian - Female"),
    ("Bianca", "Italian - Female"),
    ("Celine", "French - Female"),
    ("Lea", "French - Female"),
    ("Mathieu", "French - Male"),
    ("Chantal", "French (Canadian) - Female"),
    ("Penelope", "Spanish (US) - Female"),
    ("Miguel", "Spanish (US) - Male"),
    ("Enrique", "Spanish (European) - Male"),
    ("Conchita", "Spanish (European) - Female"),
    ("Lucia", "Spanish (European) - Female"),
];

/// Get voice name by partial match (case insensitive)
fn find_voice(query: &str) -> Option<&'static str> {
    let query_lower = query.to_lowercase();

    // Exact match first
    if let Some((name, _)) = VOICES.iter().find(|(name, _)| name.to_lowercase() == query_lower) {
        return Some(name);
    }

    // Partial match
    VOICES.iter()
        .find(|(name, desc)| {
            name.to_lowercase().contains(&query_lower) ||
            desc.to_lowercase().contains(&query_lower)
        })
        .map(|(name, _)| *name)
}

pub async fn register(command_system: &CommandSystem, db: Database) {
    // !voice command - set TTS voice
    let voice_command = Command {
        name: "voice".to_string(),
        aliases: vec!["ttsvoice".to_string()],
        description: "Set your TTS voice preference (required for TTS to read your messages)".to_string(),
        usage: "!voice <voice_name> or !voice to see current".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 3,
        enabled: true,
        handler: Arc::new(move |ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let db = db.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                if args.is_empty() {
                    // Show current voice
                    match (db.get_tts_voice(&channel, &username), db.has_custom_voice(&channel, &username)) {
                        (Ok(voice), Ok(has_custom)) => {
                            let status = if has_custom {
                                format!("Your TTS voice is set to: {}", voice)
                            } else {
                                format!("You haven't set a TTS voice yet (using default: {}). Set one to enable TTS!", voice)
                            };
                            let _ = irc.send_message(&channel,
                                &format!("@{} {}. Use !voice <name> to change it or !voices to see all options.", username, status)
                            ).await;
                        }
                        _ => {
                            log::error!("Database error");
                            let _ = irc.send_message(&channel, "Database error!").await;
                        }
                    }
                    return;
                }

                let voice_query = args.join(" ");

                // Find matching voice
                match find_voice(&voice_query) {
                    Some(voice_name) => {
                        match db.set_tts_voice(&channel, &username, voice_name) {
                            Ok(_) => {
                                let voice_desc = VOICES.iter()
                                    .find(|(name, _)| name == &voice_name)
                                    .map(|(_, desc)| *desc)
                                    .unwrap_or("Unknown");

                                let _ = irc.send_message(&channel,
                                    &format!("✅ @{} Your TTS voice is now set to: {} ({})", username, voice_name, voice_desc)
                                ).await;
                            }
                            Err(e) => {
                                log::error!("Database error: {}", e);
                                let _ = irc.send_message(&channel, "Database error!").await;
                            }
                        }
                    }
                    None => {
                        let _ = irc.send_message(&channel,
                            &format!("@{} Voice '{}' not found. Use !voices to see all available voices.", username, voice_query)
                        ).await;
                    }
                }
            });

            Ok(None)
        }),
    };

    // !voices command - list available voices
    let voices_command = Command {
        name: "voices".to_string(),
        aliases: vec!["ttsvoices".to_string()],
        description: "List available TTS voices".to_string(),
        usage: "!voices [language]".to_string(),
        permission: PermissionLevel::Everyone,
        cooldown_seconds: 5,
        enabled: true,
        handler: Arc::new(|ctx, irc, _api| {
            let irc = irc.clone();
            let channel = ctx.channel.clone();
            let username = ctx.message.username.clone();
            let args = ctx.args.clone();

            tokio::spawn(async move {
                let filter = args.first().map(|s| s.to_lowercase());

                let filtered_voices: Vec<(&str, &str)> = VOICES.iter()
                    .filter(|(name, desc)| {
                        if let Some(ref f) = filter {
                            desc.to_lowercase().contains(f) || name.to_lowercase().contains(f)
                        } else {
                            true
                        }
                    })
                    .take(20)
                    .map(|(n, d)| (*n, *d))
                    .collect();

                if filtered_voices.is_empty() {
                    let _ = irc.send_message(&channel,
                        &format!("@{} No voices found matching '{}'", username, filter.unwrap_or_default())
                    ).await;
                } else {
                    // Build message with just voice names to fit in Twitch's 500 char limit
                    let voice_names: Vec<&str> = filtered_voices.iter().map(|(name, _)| *name).collect();

                    // Split into chunks that fit Twitch's message limit (500 chars)
                    let mut current_msg = String::from("🔊 TTS Voices: ");
                    let mut messages = Vec::new();

                    for (i, name) in voice_names.iter().enumerate() {
                        let separator = if i > 0 { ", " } else { "" };
                        let addition = format!("{}{}", separator, name);

                        // Check if adding this voice would exceed ~450 chars (safe limit)
                        if current_msg.len() + addition.len() > 450 {
                            messages.push(current_msg.clone());
                            current_msg = format!("🔊 TTS Voices (cont.): {}", name);
                        } else {
                            current_msg.push_str(&addition);
                        }
                    }

                    if !current_msg.is_empty() {
                        messages.push(current_msg);
                    }

                    // Send all message chunks
                    for msg in messages {
                        let _ = irc.send_message(&channel, &msg).await;
                        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await; // Small delay between messages
                    }

                    // Send usage tip
                    let _ = irc.send_message(&channel,
                        &format!("@{} Use !voice <name> to set your voice. Filter: !voices english/french/male/female", username)
                    ).await;
                }
            });

            Ok(None)
        }),
    };

    command_system.register_command(voice_command).await;
    command_system.register_command(voices_command).await;
    log::info!("✅ Registered voice commands");
}
