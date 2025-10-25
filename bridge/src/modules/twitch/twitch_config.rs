use serde::{Deserialize, Serialize};
use anyhow::{Context, Result};
use crate::commands::database::Database;

/// Twitch bot configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwitchConfig {
    /// OAuth access token (encrypted when stored)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub access_token: Option<String>,

    /// OAuth refresh token (encrypted when stored)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,

    /// Client ID for Twitch application
    pub client_id: String,

    /// Client Secret for Twitch application (encrypted when stored)
    pub client_secret: String,

    /// Bot username
    pub bot_username: String,

    /// Channel to join (can be multiple, comma-separated)
    pub channels: Vec<String>,

    /// Token expiration timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_expires_at: Option<i64>,

    /// Encryption key (base64 encoded, stored separately or generated)
    #[serde(skip)]
    pub encryption_key: Option<String>,
}

impl Default for TwitchConfig {
    fn default() -> Self {
        Self {
            access_token: None,
            refresh_token: None,
            client_id: String::new(),
            client_secret: String::new(),
            bot_username: String::new(),
            channels: Vec::new(),
            token_expires_at: None,
            encryption_key: None,
        }
    }
}

/// Manages Twitch configuration persistence using Database
pub struct TwitchConfigManager {
    database: Database,
}

impl TwitchConfigManager {
    /// Create a new config manager
    pub fn new() -> Self {
        let database = Database::new().expect("Failed to initialize database");
        Self { database }
    }

    /// Load configuration from database
    pub fn load(&self) -> Result<TwitchConfig> {
        self.database
            .get_twitch_config()
            .map_err(|e| anyhow::anyhow!(e))
    }

    /// Save configuration to database
    pub fn save(&self, config: &TwitchConfig) -> Result<()> {
        self.database
            .save_twitch_config(config)
            .map_err(|e| anyhow::anyhow!(e))
    }

    /// Update OAuth tokens
    pub fn update_tokens(
        &self,
        access_token: String,
        refresh_token: String,
        expires_in: i64,
    ) -> Result<()> {
        self.database
            .update_twitch_tokens(access_token, refresh_token, expires_in)
            .map_err(|e| anyhow::anyhow!(e))
    }

    /// Check if token is expired or about to expire (within 5 minutes)
    pub fn is_token_expired(&self) -> Result<bool> {
        self.database
            .is_twitch_token_expired()
            .map_err(|e| anyhow::anyhow!(e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_save_load() {
        let manager = TwitchConfigManager::new();

        let mut config = TwitchConfig::default();
        config.client_id = "test_client_id".to_string();
        config.client_secret = "test_secret".to_string();
        config.bot_username = "test_bot".to_string();
        config.channels = vec!["channel1".to_string(), "channel2".to_string()];
        config.access_token = Some("test_token".to_string());
        config.refresh_token = Some("test_refresh".to_string());

        manager.save(&config).unwrap();

        let loaded = manager.load().unwrap();

        assert_eq!(config.client_id, loaded.client_id);
        assert_eq!(config.bot_username, loaded.bot_username);
        assert_eq!(config.channels, loaded.channels);
        assert_eq!(config.access_token, loaded.access_token);
        assert_eq!(config.refresh_token, loaded.refresh_token);
    }
}
