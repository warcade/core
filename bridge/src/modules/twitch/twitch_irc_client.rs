use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use twitch_irc::login::StaticLoginCredentials;
use twitch_irc::message::{PrivmsgMessage, ServerMessage};
use twitch_irc::{ClientConfig, SecureTCPTransport, TwitchIRCClient};

use super::twitch_auth::TwitchAuth;
use super::twitch_config::TwitchConfigManager;

/// Represents a chat message from Twitch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub channel: String,
    pub username: String,
    pub user_id: String,
    pub message: String,
    pub timestamp: i64,
    pub badges: Vec<String>,
    pub is_moderator: bool,
    pub is_subscriber: bool,
    pub is_vip: bool,
    pub color: Option<String>,
    pub emotes: Vec<EmoteInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmoteInfo {
    pub id: String,
    pub name: String,
    pub positions: Vec<(usize, usize)>,
}

/// Twitch event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TwitchEvent {
    ChatMessage(ChatMessage),
    Connected { channels: Vec<String> },
    Disconnected { reason: String },
    UserJoined { channel: String, username: String },
    UserLeft { channel: String, username: String },
    ChannelJoined { channel: String },
    ChannelParted { channel: String },
    Notice { channel: String, message: String },
    Error { message: String },
}

/// Twitch IRC client manager
pub struct TwitchIRCManager {
    config_manager: Arc<TwitchConfigManager>,
    auth: Arc<TwitchAuth>,
    client: Arc<RwLock<Option<TwitchIRCClient<SecureTCPTransport, StaticLoginCredentials>>>>,
    event_sender: broadcast::Sender<TwitchEvent>,
    is_running: Arc<RwLock<bool>>,
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
        };

        (manager, event_receiver)
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
            username: msg.sender.login,
            user_id: msg.sender.id,
            message: msg.message_text,
            timestamp: chrono::Utc::now().timestamp(),
            badges,
            is_moderator,
            is_subscriber,
            is_vip,
            color: msg.name_color.map(|c| c.to_string()),
            emotes,
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
            message: "Hello, world!".to_string(),
            timestamp: 1234567890,
            badges: vec!["moderator/1".to_string()],
            is_moderator: true,
            is_subscriber: false,
            is_vip: false,
            color: Some("#FF0000".to_string()),
            emotes: vec![],
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
            message: "test".to_string(),
            timestamp: 1234567890,
            badges: vec![],
            is_moderator: false,
            is_subscriber: false,
            is_vip: false,
            color: None,
            emotes: vec![],
        });

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"type\":\"chat_message\""));
    }
}
