//! In-memory caching utilities
//!
//! Provides FFI-safe caching with TTL support.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

/// Cache entry with expiration
#[derive(Debug, Clone)]
struct CacheEntry<V> {
    value: V,
    expires_at: Option<u64>, // Unix timestamp in milliseconds
}

impl<V> CacheEntry<V> {
    fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            now >= expires_at
        } else {
            false
        }
    }
}

/// TTL Cache - cache with time-to-live support
pub struct TtlCache<K, V> {
    entries: HashMap<K, CacheEntry<V>>,
    default_ttl_ms: Option<u64>,
}

impl<K: Eq + std::hash::Hash + Clone, V: Clone> TtlCache<K, V> {
    /// Create a new cache without default TTL
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
            default_ttl_ms: None,
        }
    }

    /// Create a new cache with default TTL in milliseconds
    pub fn with_ttl(ttl_ms: u64) -> Self {
        Self {
            entries: HashMap::new(),
            default_ttl_ms: Some(ttl_ms),
        }
    }

    /// Create a new cache with default TTL in seconds
    pub fn with_ttl_secs(ttl_secs: u64) -> Self {
        Self::with_ttl(ttl_secs * 1000)
    }

    /// Get a value from cache (returns None if expired)
    pub fn get(&self, key: &K) -> Option<&V> {
        self.entries.get(key).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(&entry.value)
            }
        })
    }

    /// Get a value and remove from cache
    pub fn take(&mut self, key: &K) -> Option<V> {
        if let Some(entry) = self.entries.remove(key) {
            if !entry.is_expired() {
                Some(entry.value)
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Insert a value with default TTL
    pub fn insert(&mut self, key: K, value: V) {
        let expires_at = self.default_ttl_ms.map(|ttl| {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
            now + ttl
        });

        self.entries.insert(
            key,
            CacheEntry {
                value,
                expires_at,
            },
        );
    }

    /// Insert a value with custom TTL in milliseconds
    pub fn insert_with_ttl(&mut self, key: K, value: V, ttl_ms: u64) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        self.entries.insert(
            key,
            CacheEntry {
                value,
                expires_at: Some(now + ttl_ms),
            },
        );
    }

    /// Insert a value with custom TTL in seconds
    pub fn insert_with_ttl_secs(&mut self, key: K, value: V, ttl_secs: u64) {
        self.insert_with_ttl(key, value, ttl_secs * 1000);
    }

    /// Insert a value that never expires
    pub fn insert_permanent(&mut self, key: K, value: V) {
        self.entries.insert(
            key,
            CacheEntry {
                value,
                expires_at: None,
            },
        );
    }

    /// Remove a value from cache
    pub fn remove(&mut self, key: &K) -> Option<V> {
        self.entries.remove(key).map(|e| e.value)
    }

    /// Check if key exists (and is not expired)
    pub fn contains(&self, key: &K) -> bool {
        self.get(key).is_some()
    }

    /// Get or insert a value
    pub fn get_or_insert<F>(&mut self, key: K, f: F) -> &V
    where
        F: FnOnce() -> V,
    {
        // Check if exists and not expired
        let should_insert = self
            .entries
            .get(&key)
            .map(|e| e.is_expired())
            .unwrap_or(true);

        if should_insert {
            let value = f();
            self.insert(key.clone(), value);
        }

        self.entries.get(&key).map(|e| &e.value).unwrap()
    }

    /// Clear all entries
    pub fn clear(&mut self) {
        self.entries.clear();
    }

    /// Remove expired entries
    pub fn cleanup(&mut self) {
        let expired_keys: Vec<K> = self
            .entries
            .iter()
            .filter(|(_, entry)| entry.is_expired())
            .map(|(key, _)| key.clone())
            .collect();

        for key in expired_keys {
            self.entries.remove(&key);
        }
    }

    /// Get number of entries (including expired)
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Get number of valid (non-expired) entries
    pub fn valid_count(&self) -> usize {
        self.entries
            .values()
            .filter(|entry| !entry.is_expired())
            .count()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get all keys (including expired)
    pub fn keys(&self) -> Vec<K> {
        self.entries.keys().cloned().collect()
    }

    /// Get all valid keys
    pub fn valid_keys(&self) -> Vec<K> {
        self.entries
            .iter()
            .filter(|(_, entry)| !entry.is_expired())
            .map(|(key, _)| key.clone())
            .collect()
    }
}

impl<K: Eq + std::hash::Hash + Clone, V: Clone> Default for TtlCache<K, V> {
    fn default() -> Self {
        Self::new()
    }
}

/// Memoization cache for function results
pub struct Memo<K, V> {
    cache: TtlCache<K, V>,
}

impl<K: Eq + std::hash::Hash + Clone, V: Clone> Memo<K, V> {
    /// Create a new memoization cache
    pub fn new() -> Self {
        Self {
            cache: TtlCache::new(),
        }
    }

    /// Create with TTL
    pub fn with_ttl_secs(ttl_secs: u64) -> Self {
        Self {
            cache: TtlCache::with_ttl_secs(ttl_secs),
        }
    }

    /// Get cached value or compute
    pub fn get_or_compute<F>(&mut self, key: K, compute: F) -> V
    where
        F: FnOnce() -> V,
    {
        if let Some(value) = self.cache.get(&key) {
            value.clone()
        } else {
            let value = compute();
            self.cache.insert(key, value.clone());
            value
        }
    }

    /// Invalidate a specific key
    pub fn invalidate(&mut self, key: &K) {
        self.cache.remove(key);
    }

    /// Clear all cached values
    pub fn clear(&mut self) {
        self.cache.clear();
    }

    /// Get number of cached values
    pub fn len(&self) -> usize {
        self.cache.len()
    }
}

impl<K: Eq + std::hash::Hash + Clone, V: Clone> Default for Memo<K, V> {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple key-value store with persistence support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Store {
    data: HashMap<String, serde_json::Value>,
}

impl Store {
    /// Create a new empty store
    pub fn new() -> Self {
        Self {
            data: HashMap::new(),
        }
    }

    /// Load store from JSON string
    pub fn from_json(json: &str) -> Result<Self, String> {
        serde_json::from_str(json).map_err(|e| format!("Failed to parse store: {}", e))
    }

    /// Save store to JSON string
    pub fn to_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(&self)
            .map_err(|e| format!("Failed to serialize store: {}", e))
    }

    /// Load store from file
    pub fn load(path: &str) -> Result<Self, String> {
        let content = crate::fs::Fs::read_string(path)?;
        Self::from_json(&content)
    }

    /// Save store to file
    pub fn save(&self, path: &str) -> Result<(), String> {
        let json = self.to_json()?;
        crate::fs::Fs::write_string(path, &json)
    }

    /// Get a value
    pub fn get(&self, key: &str) -> Option<&serde_json::Value> {
        self.data.get(key)
    }

    /// Get a value as specific type
    pub fn get_as<T: serde::de::DeserializeOwned>(&self, key: &str) -> Option<T> {
        self.data
            .get(key)
            .and_then(|v| serde_json::from_value(v.clone()).ok())
    }

    /// Get a string value
    pub fn get_string(&self, key: &str) -> Option<String> {
        self.data.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
    }

    /// Get an integer value
    pub fn get_i64(&self, key: &str) -> Option<i64> {
        self.data.get(key).and_then(|v| v.as_i64())
    }

    /// Get a float value
    pub fn get_f64(&self, key: &str) -> Option<f64> {
        self.data.get(key).and_then(|v| v.as_f64())
    }

    /// Get a boolean value
    pub fn get_bool(&self, key: &str) -> Option<bool> {
        self.data.get(key).and_then(|v| v.as_bool())
    }

    /// Set a value
    pub fn set<T: Serialize>(&mut self, key: &str, value: T) -> Result<(), String> {
        let json_value = serde_json::to_value(value)
            .map_err(|e| format!("Failed to serialize value: {}", e))?;
        self.data.insert(key.to_string(), json_value);
        Ok(())
    }

    /// Remove a value
    pub fn remove(&mut self, key: &str) -> Option<serde_json::Value> {
        self.data.remove(key)
    }

    /// Check if key exists
    pub fn has(&self, key: &str) -> bool {
        self.data.contains_key(key)
    }

    /// Get all keys
    pub fn keys(&self) -> Vec<String> {
        self.data.keys().cloned().collect()
    }

    /// Clear all data
    pub fn clear(&mut self) {
        self.data.clear();
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.data.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

impl Default for Store {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ttl_cache() {
        let mut cache = TtlCache::with_ttl(100); // 100ms TTL
        cache.insert("key1", "value1");
        assert_eq!(cache.get(&"key1"), Some(&"value1"));

        // Test immediate access
        assert!(cache.contains(&"key1"));
    }

    #[test]
    fn test_memo() {
        let mut memo = Memo::new();
        let mut call_count = 0;

        let result1 = memo.get_or_compute("key", || {
            call_count += 1;
            42
        });
        assert_eq!(result1, 42);

        let result2 = memo.get_or_compute("key", || {
            call_count += 1;
            100
        });
        assert_eq!(result2, 42); // Should return cached value
        assert_eq!(call_count, 1); // Should only compute once
    }

    #[test]
    fn test_store() {
        let mut store = Store::new();
        store.set("name", "John").unwrap();
        store.set("age", 30).unwrap();
        store.set("active", true).unwrap();

        assert_eq!(store.get_string("name"), Some("John".to_string()));
        assert_eq!(store.get_i64("age"), Some(30));
        assert_eq!(store.get_bool("active"), Some(true));

        let json = store.to_json().unwrap();
        let loaded = Store::from_json(&json).unwrap();
        assert_eq!(loaded.get_string("name"), Some("John".to_string()));
    }
}
