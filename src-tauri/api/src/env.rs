//! Environment variable utilities
//!
//! Provides FFI-safe environment variable operations.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::env;

/// Environment variable operations
pub struct Env;

impl Env {
    /// Get an environment variable
    pub fn get(key: &str) -> Option<String> {
        env::var(key).ok()
    }

    /// Get an environment variable with default value
    pub fn get_or(key: &str, default: &str) -> String {
        env::var(key).unwrap_or_else(|_| default.to_string())
    }

    /// Get an environment variable, error if not set
    pub fn require(key: &str) -> Result<String, String> {
        env::var(key).map_err(|_| format!("Environment variable '{}' is not set", key))
    }

    /// Set an environment variable
    pub fn set(key: &str, value: &str) {
        env::set_var(key, value);
    }

    /// Remove an environment variable
    pub fn remove(key: &str) {
        env::remove_var(key);
    }

    /// Check if environment variable is set
    pub fn has(key: &str) -> bool {
        env::var(key).is_ok()
    }

    /// Get all environment variables
    pub fn all() -> HashMap<String, String> {
        env::vars().collect()
    }

    /// Get all environment variables with prefix
    pub fn with_prefix(prefix: &str) -> HashMap<String, String> {
        env::vars()
            .filter(|(k, _)| k.starts_with(prefix))
            .collect()
    }

    /// Get current executable path
    pub fn current_exe() -> Result<String, String> {
        env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current executable: {}", e))
    }

    /// Get current working directory
    pub fn current_dir() -> Result<String, String> {
        env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current directory: {}", e))
    }

    /// Set current working directory
    pub fn set_current_dir(path: &str) -> Result<(), String> {
        env::set_current_dir(path)
            .map_err(|e| format!("Failed to set current directory: {}", e))
    }

    /// Get command line arguments
    pub fn args() -> Vec<String> {
        env::args().collect()
    }

    /// Get command line arguments (skip executable)
    pub fn args_skip_exe() -> Vec<String> {
        env::args().skip(1).collect()
    }

    /// Get PATH environment variable as list of directories
    pub fn path_dirs() -> Vec<String> {
        Self::get("PATH")
            .map(|p| {
                let separator = if cfg!(windows) { ';' } else { ':' };
                p.split(separator).map(|s| s.to_string()).collect()
            })
            .unwrap_or_default()
    }

    /// Get temporary directory
    pub fn temp_dir() -> String {
        env::temp_dir().to_string_lossy().to_string()
    }

    /// Get home directory
    pub fn home_dir() -> Option<String> {
        dirs::home_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get config directory
    pub fn config_dir() -> Option<String> {
        dirs::config_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get data local directory
    pub fn data_local_dir() -> Option<String> {
        dirs::data_local_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get cache directory
    pub fn cache_dir() -> Option<String> {
        dirs::cache_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get username
    pub fn username() -> Option<String> {
        Self::get("USER")
            .or_else(|| Self::get("USERNAME"))
            .or_else(|| Self::get("LOGNAME"))
    }

    /// Check if running in debug mode
    pub fn is_debug() -> bool {
        cfg!(debug_assertions)
    }

    /// Check if running on Windows
    pub fn is_windows() -> bool {
        cfg!(windows)
    }

    /// Check if running on macOS
    pub fn is_macos() -> bool {
        cfg!(target_os = "macos")
    }

    /// Check if running on Linux
    pub fn is_linux() -> bool {
        cfg!(target_os = "linux")
    }

    /// Get operating system name
    pub fn os_name() -> String {
        if cfg!(windows) {
            "windows".to_string()
        } else if cfg!(target_os = "macos") {
            "macos".to_string()
        } else if cfg!(target_os = "linux") {
            "linux".to_string()
        } else {
            "unknown".to_string()
        }
    }

    /// Get architecture
    pub fn arch() -> String {
        if cfg!(target_arch = "x86_64") {
            "x86_64".to_string()
        } else if cfg!(target_arch = "aarch64") {
            "aarch64".to_string()
        } else if cfg!(target_arch = "x86") {
            "x86".to_string()
        } else {
            "unknown".to_string()
        }
    }

    /// Get target triple
    pub fn target() -> String {
        format!("{}-{}", Self::arch(), Self::os_name())
    }
}

/// Environment configuration loader
#[derive(Debug, Clone, Default)]
pub struct EnvConfig {
    vars: HashMap<String, String>,
}

impl EnvConfig {
    /// Create new config from environment
    pub fn from_env() -> Self {
        Self {
            vars: Env::all(),
        }
    }

    /// Create new config with prefix filter
    pub fn from_env_prefix(prefix: &str) -> Self {
        Self {
            vars: Env::with_prefix(prefix),
        }
    }

    /// Create empty config
    pub fn new() -> Self {
        Self {
            vars: HashMap::new(),
        }
    }

    /// Add a value
    pub fn set(&mut self, key: &str, value: &str) {
        self.vars.insert(key.to_string(), value.to_string());
    }

    /// Get a value
    pub fn get(&self, key: &str) -> Option<&String> {
        self.vars.get(key)
    }

    /// Get a value with default
    pub fn get_or(&self, key: &str, default: &str) -> String {
        self.vars
            .get(key)
            .cloned()
            .unwrap_or_else(|| default.to_string())
    }

    /// Get as integer
    pub fn get_int(&self, key: &str) -> Option<i64> {
        self.vars.get(key).and_then(|v| v.parse().ok())
    }

    /// Get as integer with default
    pub fn get_int_or(&self, key: &str, default: i64) -> i64 {
        self.get_int(key).unwrap_or(default)
    }

    /// Get as boolean (true, 1, yes, on)
    pub fn get_bool(&self, key: &str) -> Option<bool> {
        self.vars.get(key).map(|v| {
            let lower = v.to_lowercase();
            lower == "true" || lower == "1" || lower == "yes" || lower == "on"
        })
    }

    /// Get as boolean with default
    pub fn get_bool_or(&self, key: &str, default: bool) -> bool {
        self.get_bool(key).unwrap_or(default)
    }

    /// Get as list (comma-separated)
    pub fn get_list(&self, key: &str) -> Vec<String> {
        self.vars
            .get(key)
            .map(|v| v.split(',').map(|s| s.trim().to_string()).collect())
            .unwrap_or_default()
    }

    /// Check if key exists
    pub fn has(&self, key: &str) -> bool {
        self.vars.contains_key(key)
    }

    /// Get all keys
    pub fn keys(&self) -> Vec<String> {
        self.vars.keys().cloned().collect()
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.vars.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.vars.is_empty()
    }

    /// Apply all values to environment
    pub fn apply(&self) {
        for (key, value) in &self.vars {
            Env::set(key, value);
        }
    }

    /// Merge with another config (other takes precedence)
    pub fn merge(&mut self, other: &EnvConfig) {
        for (key, value) in &other.vars {
            self.vars.insert(key.clone(), value.clone());
        }
    }
}

/// Parse .env file format
pub fn parse_dotenv(content: &str) -> HashMap<String, String> {
    let mut vars = HashMap::new();

    for line in content.lines() {
        let line = line.trim();

        // Skip empty lines and comments
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Split on first =
        if let Some(pos) = line.find('=') {
            let key = line[..pos].trim();
            let value = line[pos + 1..].trim();

            // Remove surrounding quotes if present
            let value = value
                .strip_prefix('"')
                .and_then(|s| s.strip_suffix('"'))
                .or_else(|| value.strip_prefix('\'').and_then(|s| s.strip_suffix('\'')))
                .unwrap_or(value);

            vars.insert(key.to_string(), value.to_string());
        }
    }

    vars
}

/// Load .env file and apply to environment
pub fn load_dotenv(path: &str) -> Result<(), String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read .env file '{}': {}", path, e))?;

    let vars = parse_dotenv(&content);
    for (key, value) in vars {
        Env::set(&key, &value);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_env_get_set() {
        Env::set("TEST_VAR", "test_value");
        assert_eq!(Env::get("TEST_VAR"), Some("test_value".to_string()));
        assert!(Env::has("TEST_VAR"));

        Env::remove("TEST_VAR");
        assert!(!Env::has("TEST_VAR"));
    }

    #[test]
    fn test_parse_dotenv() {
        let content = r#"
# This is a comment
KEY1=value1
KEY2="quoted value"
KEY3='single quoted'
KEY4=no spaces
"#;
        let vars = parse_dotenv(content);
        assert_eq!(vars.get("KEY1"), Some(&"value1".to_string()));
        assert_eq!(vars.get("KEY2"), Some(&"quoted value".to_string()));
        assert_eq!(vars.get("KEY3"), Some(&"single quoted".to_string()));
        assert_eq!(vars.get("KEY4"), Some(&"no spaces".to_string()));
    }

    #[test]
    fn test_env_config() {
        let mut config = EnvConfig::new();
        config.set("PORT", "3000");
        config.set("DEBUG", "true");
        config.set("ITEMS", "a,b,c");

        assert_eq!(config.get_int("PORT"), Some(3000));
        assert_eq!(config.get_bool("DEBUG"), Some(true));
        assert_eq!(config.get_list("ITEMS"), vec!["a", "b", "c"]);
    }
}
