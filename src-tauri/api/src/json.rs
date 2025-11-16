//! JSON utilities - FFI-safe JSON operations
//!
//! Provides a clean wrapper around serde_json with FFI-compatible types.

use serde::{Serialize, Deserialize, de::DeserializeOwned};
use std::collections::HashMap;

/// Re-export serde_json Value for convenience
pub use serde_json::{Value, Number, Map};

/// JSON parsing and stringification utilities
pub struct Json;

impl Json {
    /// Parse JSON string into a Value
    pub fn parse(s: &str) -> Result<Value, String> {
        serde_json::from_str(s).map_err(|e| format!("JSON parse error: {}", e))
    }

    /// Parse JSON string into a typed value
    pub fn parse_into<T: DeserializeOwned>(s: &str) -> Result<T, String> {
        serde_json::from_str(s).map_err(|e| format!("JSON parse error: {}", e))
    }

    /// Parse JSON bytes into a Value
    pub fn parse_bytes(bytes: &[u8]) -> Result<Value, String> {
        serde_json::from_slice(bytes).map_err(|e| format!("JSON parse error: {}", e))
    }

    /// Parse JSON bytes into a typed value
    pub fn parse_bytes_into<T: DeserializeOwned>(bytes: &[u8]) -> Result<T, String> {
        serde_json::from_slice(bytes).map_err(|e| format!("JSON parse error: {}", e))
    }

    /// Stringify a value to JSON
    pub fn stringify<T: Serialize>(value: &T) -> Result<String, String> {
        serde_json::to_string(value).map_err(|e| format!("JSON stringify error: {}", e))
    }

    /// Stringify a value to pretty JSON
    pub fn stringify_pretty<T: Serialize>(value: &T) -> Result<String, String> {
        serde_json::to_string_pretty(value).map_err(|e| format!("JSON stringify error: {}", e))
    }

    /// Stringify a value to JSON bytes
    pub fn stringify_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>, String> {
        serde_json::to_vec(value).map_err(|e| format!("JSON stringify error: {}", e))
    }

    /// Create a JSON object from key-value pairs
    pub fn object(pairs: Vec<(&str, Value)>) -> Value {
        let mut map = Map::new();
        for (key, value) in pairs {
            map.insert(key.to_string(), value);
        }
        Value::Object(map)
    }

    /// Create a JSON array from values
    pub fn array(values: Vec<Value>) -> Value {
        Value::Array(values)
    }

    /// Merge two JSON objects (second overwrites first)
    pub fn merge(base: &Value, overlay: &Value) -> Value {
        match (base, overlay) {
            (Value::Object(base_map), Value::Object(overlay_map)) => {
                let mut result = base_map.clone();
                for (key, value) in overlay_map {
                    if let Some(base_value) = result.get(key) {
                        result.insert(key.clone(), Self::merge(base_value, value));
                    } else {
                        result.insert(key.clone(), value.clone());
                    }
                }
                Value::Object(result)
            }
            _ => overlay.clone(),
        }
    }

    /// Get a nested value using dot notation (e.g., "user.profile.name")
    pub fn get_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = value;

        for part in parts {
            match current {
                Value::Object(map) => {
                    current = map.get(part)?;
                }
                Value::Array(arr) => {
                    let index: usize = part.parse().ok()?;
                    current = arr.get(index)?;
                }
                _ => return None,
            }
        }

        Some(current)
    }

    /// Set a nested value using dot notation
    pub fn set_path(value: &mut Value, path: &str, new_value: Value) -> Result<(), String> {
        let parts: Vec<&str> = path.split('.').collect();
        if parts.is_empty() {
            return Err("Empty path".to_string());
        }

        let mut current = value;

        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                // Last part - set the value
                match current {
                    Value::Object(map) => {
                        map.insert(part.to_string(), new_value);
                        return Ok(());
                    }
                    Value::Array(arr) => {
                        let index: usize = part.parse().map_err(|_| "Invalid array index")?;
                        if index < arr.len() {
                            arr[index] = new_value;
                            return Ok(());
                        } else {
                            return Err("Array index out of bounds".to_string());
                        }
                    }
                    _ => return Err("Cannot set path on non-object/array".to_string()),
                }
            } else {
                // Navigate deeper
                match current {
                    Value::Object(map) => {
                        if !map.contains_key(*part) {
                            map.insert(part.to_string(), Value::Object(Map::new()));
                        }
                        current = map.get_mut(*part).unwrap();
                    }
                    Value::Array(arr) => {
                        let index: usize = part.parse().map_err(|_| "Invalid array index")?;
                        current = arr.get_mut(index).ok_or("Array index out of bounds")?;
                    }
                    _ => return Err("Cannot navigate through non-object/array".to_string()),
                }
            }
        }

        Ok(())
    }
}

/// JSON value builder for fluent construction
#[derive(Debug, Clone)]
pub struct JsonBuilder {
    value: Value,
}

impl JsonBuilder {
    /// Create a new object builder
    pub fn object() -> Self {
        Self {
            value: Value::Object(Map::new()),
        }
    }

    /// Create a new array builder
    pub fn array() -> Self {
        Self {
            value: Value::Array(Vec::new()),
        }
    }

    /// Add a field to an object
    pub fn field<T: Serialize>(mut self, key: &str, value: T) -> Self {
        if let Value::Object(ref mut map) = self.value {
            if let Ok(v) = serde_json::to_value(value) {
                map.insert(key.to_string(), v);
            }
        }
        self
    }

    /// Add a null field to an object
    pub fn null_field(mut self, key: &str) -> Self {
        if let Value::Object(ref mut map) = self.value {
            map.insert(key.to_string(), Value::Null);
        }
        self
    }

    /// Add an item to an array
    pub fn item<T: Serialize>(mut self, value: T) -> Self {
        if let Value::Array(ref mut arr) = self.value {
            if let Ok(v) = serde_json::to_value(value) {
                arr.push(v);
            }
        }
        self
    }

    /// Build the final value
    pub fn build(self) -> Value {
        self.value
    }

    /// Build and stringify
    pub fn to_string(self) -> Result<String, String> {
        Json::stringify(&self.value)
    }
}

/// Trait for converting to JSON Value
pub trait ToJson {
    fn to_json(&self) -> Result<Value, String>;
}

impl<T: Serialize> ToJson for T {
    fn to_json(&self) -> Result<Value, String> {
        serde_json::to_value(self).map_err(|e| format!("Failed to convert to JSON: {}", e))
    }
}

/// Trait for converting from JSON Value
pub trait FromJson: Sized {
    fn from_json(value: &Value) -> Result<Self, String>;
}

impl<T: DeserializeOwned> FromJson for T {
    fn from_json(value: &Value) -> Result<Self, String> {
        serde_json::from_value(value.clone()).map_err(|e| format!("Failed to convert from JSON: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_stringify() {
        let json_str = r#"{"name": "test", "value": 42}"#;
        let value = Json::parse(json_str).unwrap();
        assert_eq!(value["name"], "test");
        assert_eq!(value["value"], 42);
    }

    #[test]
    fn test_builder() {
        let value = JsonBuilder::object()
            .field("name", "test")
            .field("value", 42)
            .field("active", true)
            .build();

        assert_eq!(value["name"], "test");
        assert_eq!(value["value"], 42);
        assert_eq!(value["active"], true);
    }

    #[test]
    fn test_get_path() {
        let value = Json::parse(r#"{"user": {"profile": {"name": "John"}}}"#).unwrap();
        let name = Json::get_path(&value, "user.profile.name").unwrap();
        assert_eq!(name, "John");
    }
}
