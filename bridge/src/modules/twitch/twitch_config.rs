use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};

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

/// Manages Twitch configuration persistence
pub struct TwitchConfigManager {
    config_path: PathBuf,
    key_path: PathBuf,
}

impl TwitchConfigManager {
    /// Create a new config manager
    pub fn new() -> Self {
        let config_dir = PathBuf::from("./config");
        Self {
            config_path: config_dir.join("twitch_config.toml"),
            key_path: config_dir.join(".twitch_key"),
        }
    }

    /// Ensure config directory exists
    fn ensure_config_dir(&self) -> Result<()> {
        if let Some(parent) = self.config_path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("Failed to create config directory: {:?}", parent))?;
        }
        Ok(())
    }

    /// Get or generate encryption key
    fn get_or_create_encryption_key(&self) -> Result<Vec<u8>> {
        if self.key_path.exists() {
            let key_str = fs::read_to_string(&self.key_path)
                .context("Failed to read encryption key")?;
            general_purpose::STANDARD
                .decode(key_str.trim())
                .context("Failed to decode encryption key")
        } else {
            // Generate new 256-bit key
            let key: [u8; 32] = rand::random();
            let key_str = general_purpose::STANDARD.encode(&key);

            self.ensure_config_dir()?;
            fs::write(&self.key_path, key_str)
                .context("Failed to write encryption key")?;

            Ok(key.to_vec())
        }
    }

    /// Encrypt sensitive data
    fn encrypt(&self, plaintext: &str) -> Result<String> {
        let key_bytes = self.get_or_create_encryption_key()?;
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        // Generate random nonce
        let nonce_bytes: [u8; 12] = rand::random();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;

        // Combine nonce + ciphertext and encode as base64
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);

        Ok(general_purpose::STANDARD.encode(&result))
    }

    /// Decrypt sensitive data
    fn decrypt(&self, ciphertext: &str) -> Result<String> {
        let key_bytes = self.get_or_create_encryption_key()?;
        let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);

        let encrypted_data = general_purpose::STANDARD
            .decode(ciphertext)
            .context("Failed to decode encrypted data")?;

        if encrypted_data.len() < 12 {
            anyhow::bail!("Invalid encrypted data: too short");
        }

        let (nonce_bytes, ciphertext_bytes) = encrypted_data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = cipher
            .decrypt(nonce, ciphertext_bytes)
            .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;

        String::from_utf8(plaintext).context("Invalid UTF-8 in decrypted data")
    }

    /// Load configuration from file
    pub fn load(&self) -> Result<TwitchConfig> {
        if !self.config_path.exists() {
            return Ok(TwitchConfig::default());
        }

        let content = fs::read_to_string(&self.config_path)
            .context("Failed to read config file")?;

        let mut config: TwitchConfig = toml::from_str(&content)
            .context("Failed to parse config file")?;

        // Decrypt sensitive fields
        if let Some(ref encrypted_token) = config.access_token {
            config.access_token = Some(self.decrypt(encrypted_token)?);
        }

        if let Some(ref encrypted_refresh) = config.refresh_token {
            config.refresh_token = Some(self.decrypt(encrypted_refresh)?);
        }

        if !config.client_secret.is_empty() && config.client_secret.starts_with("enc:") {
            let encrypted = config.client_secret.trim_start_matches("enc:");
            config.client_secret = self.decrypt(encrypted)?;
        }

        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, config: &TwitchConfig) -> Result<()> {
        self.ensure_config_dir()?;

        let mut config_to_save = config.clone();

        // Encrypt sensitive fields
        if let Some(ref token) = config.access_token {
            config_to_save.access_token = Some(self.encrypt(token)?);
        }

        if let Some(ref refresh) = config.refresh_token {
            config_to_save.refresh_token = Some(self.encrypt(refresh)?);
        }

        if !config.client_secret.is_empty() {
            let encrypted = self.encrypt(&config.client_secret)?;
            config_to_save.client_secret = format!("enc:{}", encrypted);
        }

        let toml_string = toml::to_string_pretty(&config_to_save)
            .context("Failed to serialize config")?;

        fs::write(&self.config_path, toml_string)
            .context("Failed to write config file")?;

        log::info!("Twitch config saved to {:?}", self.config_path);
        Ok(())
    }

    /// Update OAuth tokens
    pub fn update_tokens(
        &self,
        access_token: String,
        refresh_token: String,
        expires_in: i64,
    ) -> Result<()> {
        let mut config = self.load()?;

        config.access_token = Some(access_token);
        config.refresh_token = Some(refresh_token);
        config.token_expires_at = Some(
            chrono::Utc::now().timestamp() + expires_in
        );

        self.save(&config)
    }

    /// Check if token is expired or about to expire (within 5 minutes)
    pub fn is_token_expired(&self) -> Result<bool> {
        let config = self.load()?;

        if let Some(expires_at) = config.token_expires_at {
            let now = chrono::Utc::now().timestamp();
            let time_until_expiry = expires_at - now;
            log::info!("Token expiry check - expires_at: {}, now: {}, time_until_expiry: {}s", expires_at, now, time_until_expiry);
            // Consider expired if within 5 minutes of expiration
            Ok(now >= expires_at - 300)
        } else {
            log::warn!("No token expiration time set - treating as expired");
            Ok(true) // No expiration time means treat as expired
        }
    }

    /// Get config path for reference
    pub fn get_config_path(&self) -> &Path {
        &self.config_path
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let manager = TwitchConfigManager::new();
        let plaintext = "my_secret_token_123";

        let encrypted = manager.encrypt(plaintext).unwrap();
        let decrypted = manager.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
        assert_ne!(plaintext, encrypted);
    }

    #[test]
    fn test_config_save_load() {
        use std::fs;

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

        // Cleanup
        let _ = fs::remove_file(manager.config_path);
        let _ = fs::remove_file(manager.key_path);
    }
}
