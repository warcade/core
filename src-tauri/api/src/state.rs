//! Plugin state management
//!
//! Provides FFI-safe state management for plugins.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Thread-safe state container
pub struct State<T> {
    inner: Arc<RwLock<T>>,
}

impl<T: Clone> State<T> {
    /// Create a new state container
    pub fn new(value: T) -> Self {
        Self {
            inner: Arc::new(RwLock::new(value)),
        }
    }

    /// Get a clone of the current state
    pub fn get(&self) -> Result<T, String> {
        self.inner
            .read()
            .map(|guard| guard.clone())
            .map_err(|e| format!("Failed to read state: {}", e))
    }

    /// Update the state
    pub fn set(&self, value: T) -> Result<(), String> {
        let mut guard = self
            .inner
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        *guard = value;
        Ok(())
    }

    /// Update state with a function
    pub fn update<F>(&self, f: F) -> Result<(), String>
    where
        F: FnOnce(&mut T),
    {
        let mut guard = self
            .inner
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        f(&mut guard);
        Ok(())
    }

    /// Transform state and return result
    pub fn with<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&T) -> R,
    {
        let guard = self
            .inner
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        Ok(f(&guard))
    }
}

impl<T> Clone for State<T> {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }
}

/// Global plugin state store
pub struct PluginState {
    data: Arc<RwLock<HashMap<String, serde_json::Value>>>,
}

impl PluginState {
    /// Create a new plugin state
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Get a value from state
    pub fn get(&self, key: &str) -> Result<Option<serde_json::Value>, String> {
        let guard = self
            .data
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        Ok(guard.get(key).cloned())
    }

    /// Get a typed value from state
    pub fn get_as<T: serde::de::DeserializeOwned>(&self, key: &str) -> Result<Option<T>, String> {
        let value = self.get(key)?;
        match value {
            Some(v) => serde_json::from_value(v)
                .map(Some)
                .map_err(|e| format!("Failed to deserialize: {}", e)),
            None => Ok(None),
        }
    }

    /// Set a value in state
    pub fn set<T: Serialize>(&self, key: &str, value: T) -> Result<(), String> {
        let json_value = serde_json::to_value(value)
            .map_err(|e| format!("Failed to serialize: {}", e))?;
        let mut guard = self
            .data
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        guard.insert(key.to_string(), json_value);
        Ok(())
    }

    /// Remove a value from state
    pub fn remove(&self, key: &str) -> Result<Option<serde_json::Value>, String> {
        let mut guard = self
            .data
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        Ok(guard.remove(key))
    }

    /// Check if key exists
    pub fn has(&self, key: &str) -> Result<bool, String> {
        let guard = self
            .data
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        Ok(guard.contains_key(key))
    }

    /// Get all keys
    pub fn keys(&self) -> Result<Vec<String>, String> {
        let guard = self
            .data
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        Ok(guard.keys().cloned().collect())
    }

    /// Clear all state
    pub fn clear(&self) -> Result<(), String> {
        let mut guard = self
            .data
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        guard.clear();
        Ok(())
    }

    /// Get number of entries
    pub fn len(&self) -> Result<usize, String> {
        let guard = self
            .data
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        Ok(guard.len())
    }

    /// Export state to JSON
    pub fn export(&self) -> Result<String, String> {
        let guard = self
            .data
            .read()
            .map_err(|e| format!("Failed to read state: {}", e))?;
        serde_json::to_string_pretty(&*guard)
            .map_err(|e| format!("Failed to serialize state: {}", e))
    }

    /// Import state from JSON
    pub fn import(&self, json: &str) -> Result<(), String> {
        let new_data: HashMap<String, serde_json::Value> = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse state JSON: {}", e))?;
        let mut guard = self
            .data
            .write()
            .map_err(|e| format!("Failed to write state: {}", e))?;
        *guard = new_data;
        Ok(())
    }
}

impl Clone for PluginState {
    fn clone(&self) -> Self {
        Self {
            data: Arc::clone(&self.data),
        }
    }
}

impl Default for PluginState {
    fn default() -> Self {
        Self::new()
    }
}

/// Atomic counter
pub struct Counter {
    value: Arc<RwLock<i64>>,
}

impl Counter {
    /// Create a new counter starting at 0
    pub fn new() -> Self {
        Self::with_value(0)
    }

    /// Create a counter with initial value
    pub fn with_value(value: i64) -> Self {
        Self {
            value: Arc::new(RwLock::new(value)),
        }
    }

    /// Get current value
    pub fn get(&self) -> Result<i64, String> {
        self.value
            .read()
            .map(|guard| *guard)
            .map_err(|e| format!("Failed to read counter: {}", e))
    }

    /// Set value
    pub fn set(&self, value: i64) -> Result<(), String> {
        let mut guard = self
            .value
            .write()
            .map_err(|e| format!("Failed to write counter: {}", e))?;
        *guard = value;
        Ok(())
    }

    /// Increment and return new value
    pub fn increment(&self) -> Result<i64, String> {
        self.add(1)
    }

    /// Decrement and return new value
    pub fn decrement(&self) -> Result<i64, String> {
        self.add(-1)
    }

    /// Add to counter and return new value
    pub fn add(&self, amount: i64) -> Result<i64, String> {
        let mut guard = self
            .value
            .write()
            .map_err(|e| format!("Failed to write counter: {}", e))?;
        *guard += amount;
        Ok(*guard)
    }

    /// Reset to 0
    pub fn reset(&self) -> Result<(), String> {
        self.set(0)
    }
}

impl Clone for Counter {
    fn clone(&self) -> Self {
        Self {
            value: Arc::clone(&self.value),
        }
    }
}

impl Default for Counter {
    fn default() -> Self {
        Self::new()
    }
}

/// Observable value that can notify on changes
pub struct Observable<T> {
    value: Arc<RwLock<T>>,
    listeners: Arc<RwLock<Vec<Box<dyn Fn(&T) + Send + Sync>>>>,
}

impl<T: Clone + Send + Sync + 'static> Observable<T> {
    /// Create a new observable
    pub fn new(value: T) -> Self {
        Self {
            value: Arc::new(RwLock::new(value)),
            listeners: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Get current value
    pub fn get(&self) -> Result<T, String> {
        self.value
            .read()
            .map(|guard| guard.clone())
            .map_err(|e| format!("Failed to read observable: {}", e))
    }

    /// Set value and notify listeners
    pub fn set(&self, new_value: T) -> Result<(), String> {
        {
            let mut guard = self
                .value
                .write()
                .map_err(|e| format!("Failed to write observable: {}", e))?;
            *guard = new_value;
        }

        // Notify listeners
        let guard = self
            .value
            .read()
            .map_err(|e| format!("Failed to read observable: {}", e))?;
        let listeners = self
            .listeners
            .read()
            .map_err(|e| format!("Failed to read listeners: {}", e))?;

        for listener in listeners.iter() {
            listener(&guard);
        }

        Ok(())
    }

    /// Subscribe to changes
    pub fn subscribe<F>(&self, callback: F) -> Result<(), String>
    where
        F: Fn(&T) + Send + Sync + 'static,
    {
        let mut listeners = self
            .listeners
            .write()
            .map_err(|e| format!("Failed to write listeners: {}", e))?;
        listeners.push(Box::new(callback));
        Ok(())
    }

    /// Clear all listeners
    pub fn clear_listeners(&self) -> Result<(), String> {
        let mut listeners = self
            .listeners
            .write()
            .map_err(|e| format!("Failed to write listeners: {}", e))?;
        listeners.clear();
        Ok(())
    }
}

impl<T> Clone for Observable<T> {
    fn clone(&self) -> Self {
        Self {
            value: Arc::clone(&self.value),
            listeners: Arc::clone(&self.listeners),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state() {
        let state = State::new(42);
        assert_eq!(state.get().unwrap(), 42);

        state.set(100).unwrap();
        assert_eq!(state.get().unwrap(), 100);

        state.update(|v| *v += 1).unwrap();
        assert_eq!(state.get().unwrap(), 101);
    }

    #[test]
    fn test_plugin_state() {
        let state = PluginState::new();
        state.set("count", 10).unwrap();
        state.set("name", "test").unwrap();

        let count: Option<i32> = state.get_as("count").unwrap();
        assert_eq!(count, Some(10));

        let name: Option<String> = state.get_as("name").unwrap();
        assert_eq!(name, Some("test".to_string()));

        assert!(state.has("count").unwrap());
        assert!(!state.has("missing").unwrap());
    }

    #[test]
    fn test_counter() {
        let counter = Counter::new();
        assert_eq!(counter.get().unwrap(), 0);

        counter.increment().unwrap();
        assert_eq!(counter.get().unwrap(), 1);

        counter.add(10).unwrap();
        assert_eq!(counter.get().unwrap(), 11);

        counter.decrement().unwrap();
        assert_eq!(counter.get().unwrap(), 10);
    }

    #[test]
    fn test_observable() {
        let observable = Observable::new(0);
        let change_count = Counter::new();
        let change_count_clone = change_count.clone();

        observable
            .subscribe(move |_| {
                change_count_clone.increment().unwrap();
            })
            .unwrap();

        observable.set(1).unwrap();
        observable.set(2).unwrap();

        assert_eq!(change_count.get().unwrap(), 2);
        assert_eq!(observable.get().unwrap(), 2);
    }
}
