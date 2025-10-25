use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use twitch_irc::login::StaticLoginCredentials;
use twitch_irc::message::{PrivmsgMessage, ServerMessage};
use twitch_irc::{ClientConfig, SecureTCPTransport, TwitchIRCClient};
use chrono::Datelike;

use super::twitch_auth::TwitchAuth;
use super::twitch_config::TwitchConfigManager;

/// Represents a chat message from Twitch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub channel: String,
    pub username: String,
    pub user_id: String,
    pub display_name: Option<String>,
    pub profile_image_url: Option<String>,
    pub message: String,
    pub timestamp: i64,
    pub badges: Vec<String>,
    pub is_moderator: bool,
    pub is_subscriber: bool,
    pub is_vip: bool,
    pub color: Option<String>,
    pub emotes: Vec<EmoteInfo>,
    pub location_flag: Option<String>,
    pub is_birthday: bool,
    pub level: Option<i64>,
    pub current_xp: Option<i64>,
    pub xp_for_next_level: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmoteInfo {
    pub id: String,
    pub name: String,
    pub positions: Vec<(usize, usize)>,
}

/// Level up event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LevelUpEvent {
    pub username: String,
    pub channel: String,
    pub old_level: i64,
    pub new_level: i64,
    pub total_xp: i64,
    pub xp_needed: i64,
}

/// Wheel spin option
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WheelOption {
    pub text: String,
    pub color: String,
}

/// Wheel spin event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WheelSpinEvent {
    pub channel: String,
    pub winner: String,
    pub options: Vec<WheelOption>,
    pub triggered_by: Option<String>,
}

/// Effect trigger event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectTriggerEvent {
    pub channel: String,
    pub triggered_by: String,
}

/// Follow event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FollowEvent {
    pub user_id: String,
    pub user_login: String,
    pub user_name: String,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub followed_at: String,
}

/// Subscription event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubscriptionEvent {
    pub user_id: String,
    pub user_login: String,
    pub user_name: String,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub tier: String,
    pub is_gift: bool,
}

/// Resubscription event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResubscriptionEvent {
    pub user_id: String,
    pub user_login: String,
    pub user_name: String,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub tier: String,
    pub message: Option<String>,
    pub cumulative_months: i32,
    pub streak_months: Option<i32>,
    pub duration_months: i32,
}

/// Gift subscription event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GiftSubscriptionEvent {
    pub user_id: Option<String>,
    pub user_login: Option<String>,
    pub user_name: Option<String>,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub total: i32,
    pub tier: String,
    pub cumulative_total: Option<i32>,
    pub is_anonymous: bool,
}

/// Raid event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RaidEvent {
    pub from_broadcaster_user_id: String,
    pub from_broadcaster_user_login: String,
    pub from_broadcaster_user_name: String,
    pub to_broadcaster_user_id: String,
    pub to_broadcaster_user_login: String,
    pub to_broadcaster_user_name: String,
    pub viewers: i32,
}

/// Cheer/Bits event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheerEvent {
    pub user_id: Option<String>,
    pub user_login: Option<String>,
    pub user_name: Option<String>,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub is_anonymous: bool,
    pub message: String,
    pub bits: i32,
}

/// Channel Points Redemption event data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChannelPointsRedemptionEvent {
    pub id: String,
    pub user_id: String,
    pub user_login: String,
    pub user_name: String,
    pub broadcaster_user_id: String,
    pub broadcaster_user_login: String,
    pub broadcaster_user_name: String,
    pub user_input: Option<String>,
    pub status: String,
    pub reward: RewardInfo,
    pub redeemed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewardInfo {
    pub id: String,
    pub title: String,
    pub cost: i32,
    pub prompt: Option<String>,
}

/// Twitch event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TwitchEvent {
    ChatMessage(ChatMessage),
    LevelUp(LevelUpEvent),
    WheelSpin(WheelSpinEvent),
    EffectTrigger(EffectTriggerEvent),
    Follow(FollowEvent),
    Subscription(SubscriptionEvent),
    Resubscription(ResubscriptionEvent),
    GiftSubscription(GiftSubscriptionEvent),
    Raid(RaidEvent),
    Cheer(CheerEvent),
    ChannelPointsRedemption(ChannelPointsRedemptionEvent),
    Connected { channels: Vec<String> },
    Disconnected { reason: String },
    UserJoined { channel: String, username: String },
    UserLeft { channel: String, username: String },
    ChannelJoined { channel: String },
    ChannelParted { channel: String },
    Notice { channel: String, message: String },
    Error { message: String },
}

/// Bot user info for emitting own messages
#[derive(Debug, Clone)]
pub struct BotUserInfo {
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub profile_image_url: String,
}

/// Twitch IRC client manager
pub struct TwitchIRCManager {
    config_manager: Arc<TwitchConfigManager>,
    auth: Arc<TwitchAuth>,
    client: Arc<RwLock<Option<TwitchIRCClient<SecureTCPTransport, StaticLoginCredentials>>>>,
    event_sender: broadcast::Sender<TwitchEvent>,
    is_running: Arc<RwLock<bool>>,
    bot_user_info: Arc<RwLock<Option<BotUserInfo>>>,
}

impl TwitchIRCManager {
    /// Create a new Twitch IRC manager
    pub fn new(
        config_manager: Arc<TwitchConfigManager>,
        auth: Arc<TwitchAuth>,
    ) -> (Self, broadcast::Receiver<TwitchEvent>) {
        let (event_sender, event_receiver) = broadcast::channel(1000);

        let manager = Self {
            config_manager,
            auth,
            client: Arc::new(RwLock::new(None)),
            event_sender,
            is_running: Arc::new(RwLock::new(false)),
            bot_user_info: Arc::new(RwLock::new(None)),
        };

        (manager, event_receiver)
    }

    /// Set bot user info for emitting own messages
    pub async fn set_bot_user_info(&self, info: BotUserInfo) {
        let mut bot_info = self.bot_user_info.write().await;
        *bot_info = Some(info);
    }

    /// Start the IRC client and connect to Twitch
    pub async fn start(&self) -> Result<()> {
        // Check if already running
        {
            let is_running = self.is_running.read().await;
            if *is_running {
                return Ok(());
            }
        }

        let config = self.config_manager.load()?;

        // Get valid access token
        let access_token = self
            .auth
            .get_valid_token()
            .await
            .context("Failed to get valid access token")?;

        // Create login credentials
        let credentials = StaticLoginCredentials::new(
            config.bot_username.clone(),
            Some(access_token),
        );

        // Create client config
        let client_config = ClientConfig::new_simple(credentials);

        // Create client
        let (mut incoming_messages, client) =
            TwitchIRCClient::<SecureTCPTransport, StaticLoginCredentials>::new(client_config);

        // Store client
        {
            let mut client_guard = self.client.write().await;
            *client_guard = Some(client.clone());
        }

        // Join configured channels
        for channel in &config.channels {
            client
                .join(channel.clone())
                .context(format!("Failed to join channel: {}", channel))?;

            log::info!("Joined Twitch channel: {}", channel);

            let _ = self.event_sender.send(TwitchEvent::ChannelJoined {
                channel: channel.clone(),
            });
        }

        // Set running state
        {
            let mut is_running = self.is_running.write().await;
            *is_running = true;
        }

        // Send connected event
        let _ = self.event_sender.send(TwitchEvent::Connected {
            channels: config.channels.clone(),
        });

        log::info!("Twitch IRC client started successfully");

        // Spawn message handler
        let event_sender = self.event_sender.clone();
        let is_running = self.is_running.clone();

        tokio::spawn(async move {
            while let Some(message) = incoming_messages.recv().await {
                if let Err(e) = Self::handle_message(message, &event_sender).await {
                    log::error!("Error handling Twitch message: {}", e);
                }
            }

            // Connection closed
            let mut running = is_running.write().await;
            *running = false;

            let _ = event_sender.send(TwitchEvent::Disconnected {
                reason: "Connection closed".to_string(),
            });

            log::warn!("Twitch IRC connection closed");
        });

        Ok(())
    }

    /// Stop the IRC client
    pub async fn stop(&self) -> Result<()> {
        let mut client_guard = self.client.write().await;

        if let Some(client) = client_guard.take() {
            // Part all channels gracefully (optional)
            // The client will disconnect when dropped
            drop(client);

            let mut is_running = self.is_running.write().await;
            *is_running = false;

            let _ = self.event_sender.send(TwitchEvent::Disconnected {
                reason: "Stopped by user".to_string(),
            });

            log::info!("Twitch IRC client stopped");
        }

        Ok(())
    }

    /// Send a chat message to a channel
    pub async fn send_message(&self, channel: &str, message: &str) -> Result<()> {
        let client_guard = self.client.read().await;

        if let Some(client) = client_guard.as_ref() {
            client
                .say(channel.to_string(), message.to_string())
                .await
                .context("Failed to send message")?;

            log::debug!("Sent message to {}: {}", channel, message);

            // Emit chat message event for the bot's own message
            if let Some(bot_info) = self.bot_user_info.read().await.as_ref() {
                let chat_message = ChatMessage {
                    channel: channel.to_string(),
                    username: bot_info.username.clone(),
                    user_id: bot_info.user_id.clone(),
                    display_name: Some(bot_info.display_name.clone()),
                    profile_image_url: Some(bot_info.profile_image_url.clone()),
                    message: message.to_string(),
                    timestamp: chrono::Utc::now().timestamp(),
                    badges: vec!["broadcaster/1".to_string()], // Bot is usually broadcaster
                    is_moderator: false,
                    is_subscriber: false,
                    is_vip: false,
                    color: Some("#9146FF".to_string()), // Default purple
                    emotes: vec![],
                    location_flag: None,
                    is_birthday: false,
                    level: None,
                    current_xp: None,
                    xp_for_next_level: None,
                };

                let _ = self.event_sender.send(TwitchEvent::ChatMessage(chat_message));
            }

            Ok(())
        } else {
            anyhow::bail!("IRC client not connected")
        }
    }

    /// Join a channel
    pub async fn join_channel(&self, channel: &str) -> Result<()> {
        let client_guard = self.client.read().await;

        if let Some(client) = client_guard.as_ref() {
            client
                .join(channel.to_string())
                .context("Failed to join channel")?;

            let _ = self.event_sender.send(TwitchEvent::ChannelJoined {
                channel: channel.to_string(),
            });

            log::info!("Joined channel: {}", channel);
            Ok(())
        } else {
            anyhow::bail!("IRC client not connected")
        }
    }

    /// Part (leave) a channel
    pub async fn part_channel(&self, channel: &str) -> Result<()> {
        let client_guard = self.client.read().await;

        if let Some(client) = client_guard.as_ref() {
            client.part(channel.to_string());

            let _ = self.event_sender.send(TwitchEvent::ChannelParted {
                channel: channel.to_string(),
            });

            log::info!("Parted channel: {}", channel);
            Ok(())
        } else {
            anyhow::bail!("IRC client not connected")
        }
    }

    /// Check if client is running
    pub async fn is_running(&self) -> bool {
        *self.is_running.read().await
    }

    /// Get event sender for subscribing to events
    pub fn get_event_sender(&self) -> broadcast::Sender<TwitchEvent> {
        self.event_sender.clone()
    }

    /// Handle incoming IRC message
    async fn handle_message(
        message: ServerMessage,
        event_sender: &broadcast::Sender<TwitchEvent>,
    ) -> Result<()> {
        match message {
            ServerMessage::Privmsg(msg) => {
                let chat_message = Self::parse_privmsg(msg);
                let _ = event_sender.send(TwitchEvent::ChatMessage(chat_message));
            }
            ServerMessage::Join(join_msg) => {
                let _ = event_sender.send(TwitchEvent::UserJoined {
                    channel: join_msg.channel_login,
                    username: join_msg.user_login,
                });
            }
            ServerMessage::Part(part_msg) => {
                let _ = event_sender.send(TwitchEvent::UserLeft {
                    channel: part_msg.channel_login,
                    username: part_msg.user_login,
                });
            }
            ServerMessage::Notice(notice_msg) => {
                let _ = event_sender.send(TwitchEvent::Notice {
                    channel: notice_msg.channel_login.unwrap_or_default(),
                    message: notice_msg.message_text,
                });
            }
            _ => {
                // Ignore other message types for now
            }
        }

        Ok(())
    }

    /// Parse PRIVMSG into ChatMessage
    fn parse_privmsg(msg: PrivmsgMessage) -> ChatMessage {
        // Extract badges
        let badges: Vec<String> = msg
            .badges
            .iter()
            .map(|badge| format!("{}/{}", badge.name, badge.version))
            .collect();

        // Check roles
        let is_moderator = msg.badges.iter().any(|b| b.name == "moderator");
        let is_subscriber = msg.badges.iter().any(|b| b.name == "subscriber");
        let is_vip = msg.badges.iter().any(|b| b.name == "vip");

        // Parse emotes
        let emotes: Vec<EmoteInfo> = msg
            .emotes
            .iter()
            .map(|emote| EmoteInfo {
                id: emote.id.clone(),
                name: String::new(), // Name not provided in raw emote data
                positions: vec![(emote.char_range.start, emote.char_range.end)],
            })
            .collect();

        ChatMessage {
            channel: msg.channel_login,
            username: msg.sender.login.clone(),
            user_id: msg.sender.id.clone(),
            display_name: Some(msg.sender.name.clone()),
            profile_image_url: None, // Will be populated by caching layer
            message: msg.message_text,
            timestamp: chrono::Utc::now().timestamp(),
            badges,
            is_moderator,
            is_subscriber,
            is_vip,
            color: msg.name_color.map(|c| c.to_string()),
            emotes,
            location_flag: None, // Will be populated by message enrichment
            is_birthday: false,  // Will be populated by message enrichment
            level: None,         // Will be populated by message enrichment
            current_xp: None,    // Will be populated by message enrichment
            xp_for_next_level: None, // Will be populated by message enrichment
        }
    }

    /// Convert location name to flag image URL
    /// Returns a URL to a flag image from flagcdn.com
    pub fn get_location_flag(location: &str) -> Option<String> {
        let location_lower = location.to_lowercase().trim().to_string();

        // Helper to create flag URL from two-letter code
        let make_flag_url = |code: &str| -> String {
            format!("https://flagcdn.com/16x12/{}.png", code.to_lowercase())
        };

        // Common country mappings to ISO 3166-1 alpha-2 codes
        let code = match location_lower.as_str() {
            // Short codes
            "us" | "usa" => "us",
            "ca" => "ca",
            "uk" | "gb" => "gb",
            "au" => "au",
            "de" => "de",
            "fr" => "fr",
            "es" => "es",
            "it" => "it",
            "jp" => "jp",
            "cn" => "cn",
            "kr" => "kr",
            "mx" => "mx",
            "br" => "br",
            "ar" => "ar",
            "in" => "in",
            "ru" => "ru",
            "pl" => "pl",
            "nl" => "nl",
            "se" => "se",
            "no" => "no",
            "dk" => "dk",
            "fi" => "fi",
            "pt" => "pt",
            "gr" => "gr",
            "tr" => "tr",
            "ie" => "ie",
            "nz" => "nz",
            "sg" => "sg",
            "ph" => "ph",
            "th" => "th",
            "vn" => "vn",
            "id" => "id",
            "my" => "my",
            "za" => "za",
            "eg" => "eg",
            "il" => "il",
            "sa" => "sa",
            "ae" => "ae",
            "ch" => "ch",
            "at" => "at",
            "be" => "be",
            "cz" => "cz",
            "ro" => "ro",
            "hu" => "hu",
            "ua" => "ua",
            "cl" => "cl",
            "co" => "co",
            "pe" => "pe",
            "ve" => "ve",
            // Full names and partial matches
            s if s.contains("usa") || s.contains("united states") || s.contains("america") => "us",
            s if s.contains("canada") => "ca",
            s if s.contains("uk") || s.contains("united kingdom") || s.contains("england") || s.contains("britain") => "gb",
            s if s.contains("australia") => "au",
            s if s.contains("germany") => "de",
            s if s.contains("france") => "fr",
            s if s.contains("spain") => "es",
            s if s.contains("italy") => "it",
            s if s.contains("japan") => "jp",
            s if s.contains("china") => "cn",
            s if s.contains("korea") || s.contains("south korea") => "kr",
            s if s.contains("mexico") => "mx",
            s if s.contains("brazil") => "br",
            s if s.contains("argentina") => "ar",
            s if s.contains("india") => "in",
            s if s.contains("russia") => "ru",
            s if s.contains("poland") => "pl",
            s if s.contains("netherlands") || s.contains("holland") => "nl",
            s if s.contains("sweden") => "se",
            s if s.contains("norway") => "no",
            s if s.contains("denmark") => "dk",
            s if s.contains("finland") => "fi",
            s if s.contains("portugal") => "pt",
            s if s.contains("greece") => "gr",
            s if s.contains("turkey") => "tr",
            s if s.contains("ireland") => "ie",
            s if s.contains("new zealand") => "nz",
            s if s.contains("singapore") => "sg",
            s if s.contains("philippines") => "ph",
            s if s.contains("thailand") => "th",
            s if s.contains("vietnam") => "vn",
            s if s.contains("indonesia") => "id",
            s if s.contains("malaysia") => "my",
            s if s.contains("south africa") => "za",
            s if s.contains("egypt") => "eg",
            s if s.contains("israel") => "il",
            s if s.contains("saudi arabia") => "sa",
            s if s.contains("uae") || s.contains("emirates") => "ae",
            s if s.contains("switzerland") => "ch",
            s if s.contains("austria") => "at",
            s if s.contains("belgium") => "be",
            s if s.contains("czech") => "cz",
            s if s.contains("romania") => "ro",
            s if s.contains("hungary") => "hu",
            s if s.contains("ukraine") => "ua",
            s if s.contains("chile") => "cl",
            s if s.contains("colombia") => "co",
            s if s.contains("peru") => "pe",
            s if s.contains("venezuela") => "ve",
            _ => return None, // No match
        };

        Some(make_flag_url(code))
    }

    /// Check if today is the user's birthday
    pub fn is_birthday_today(birthday: &str) -> bool {
        let now = chrono::Utc::now();
        let today_month_day = format!("{:02}-{:02}", now.month(), now.day());

        // Birthday format is YYYY-MM-DD, extract MM-DD
        if let Some(month_day) = birthday.get(5..10) {
            month_day == today_month_day
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chat_message_serialization() {
        let msg = ChatMessage {
            channel: "test_channel".to_string(),
            username: "test_user".to_string(),
            user_id: "12345".to_string(),
            display_name: Some("TestUser".to_string()),
            profile_image_url: Some("https://example.com/avatar.png".to_string()),
            message: "Hello, world!".to_string(),
            timestamp: 1234567890,
            badges: vec!["moderator/1".to_string()],
            is_moderator: true,
            is_subscriber: false,
            is_vip: false,
            color: Some("#FF0000".to_string()),
            emotes: vec![],
            location_flag: Some("🇺🇸".to_string()),
            is_birthday: false,
            level: Some(5),
            current_xp: Some(450),
            xp_for_next_level: Some(100),
        };

        let json = serde_json::to_string(&msg).unwrap();
        let deserialized: ChatMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(msg.username, deserialized.username);
        assert_eq!(msg.message, deserialized.message);
    }

    #[test]
    fn test_twitch_event_serialization() {
        let event = TwitchEvent::ChatMessage(ChatMessage {
            channel: "test".to_string(),
            username: "user".to_string(),
            user_id: "123".to_string(),
            display_name: None,
            profile_image_url: None,
            message: "test".to_string(),
            timestamp: 1234567890,
            badges: vec![],
            is_moderator: false,
            is_subscriber: false,
            is_vip: false,
            color: None,
            emotes: vec![],
            location_flag: None,
            is_birthday: false,
            level: None,
            current_xp: None,
            xp_for_next_level: None,
        });

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"chat_message\""));
    }
}
