//! INI/Config file parsing and writing utilities
//!
//! Pure Rust implementation with no external dependencies.
//! Supports standard INI format with sections and key-value pairs.

use std::collections::HashMap;

/// INI parser and writer
pub struct Ini;

impl Ini {
    /// Parse INI string into sections with key-value pairs
    /// Returns HashMap<section_name, HashMap<key, value>>
    pub fn parse(text: &str) -> Result<HashMap<String, HashMap<String, String>>, String> {
        let mut result: HashMap<String, HashMap<String, String>> = HashMap::new();
        let mut current_section = String::new();

        // Initialize global section (for keys without section)
        result.insert(String::new(), HashMap::new());

        for (line_num, line) in text.lines().enumerate() {
            let line = line.trim();

            // Skip empty lines and comments
            if line.is_empty() || line.starts_with(';') || line.starts_with('#') {
                continue;
            }

            // Section header [section]
            if line.starts_with('[') {
                if !line.ends_with(']') {
                    return Err(format!("Line {}: Invalid section header: {}", line_num + 1, line));
                }
                current_section = line[1..line.len()-1].trim().to_string();
                if !result.contains_key(&current_section) {
                    result.insert(current_section.clone(), HashMap::new());
                }
                continue;
            }

            // Key-value pair
            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim().to_string();
                let value = line[eq_pos + 1..].trim().to_string();

                // Remove surrounding quotes if present
                let value = Self::unquote(&value);

                result
                    .entry(current_section.clone())
                    .or_insert_with(HashMap::new)
                    .insert(key, value);
            } else {
                return Err(format!("Line {}: Invalid line (no '=' found): {}", line_num + 1, line));
            }
        }

        Ok(result)
    }

    /// Parse INI and flatten to single HashMap (ignoring sections)
    pub fn parse_flat(text: &str) -> Result<HashMap<String, String>, String> {
        let sections = Self::parse(text)?;
        let mut result = HashMap::new();

        for section_map in sections.values() {
            for (key, value) in section_map {
                result.insert(key.clone(), value.clone());
            }
        }

        Ok(result)
    }

    /// Get a value from parsed INI
    pub fn get<'a>(
        data: &'a HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
    ) -> Option<&'a String> {
        data.get(section).and_then(|s| s.get(key))
    }

    /// Get a value from global section
    pub fn get_global<'a>(
        data: &'a HashMap<String, HashMap<String, String>>,
        key: &str,
    ) -> Option<&'a String> {
        Self::get(data, "", key)
    }

    /// Get value with default
    pub fn get_or(
        data: &HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
        default: &str,
    ) -> String {
        Self::get(data, section, key)
            .cloned()
            .unwrap_or_else(|| default.to_string())
    }

    /// Get value as integer
    pub fn get_int(
        data: &HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
    ) -> Option<i64> {
        Self::get(data, section, key).and_then(|v| v.parse().ok())
    }

    /// Get value as float
    pub fn get_float(
        data: &HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
    ) -> Option<f64> {
        Self::get(data, section, key).and_then(|v| v.parse().ok())
    }

    /// Get value as boolean
    pub fn get_bool(
        data: &HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
    ) -> Option<bool> {
        Self::get(data, section, key).map(|v| {
            matches!(v.to_lowercase().as_str(), "true" | "1" | "yes" | "on")
        })
    }

    /// Convert sections to INI string
    pub fn stringify(data: &HashMap<String, HashMap<String, String>>) -> String {
        let mut result = String::new();

        // Write global section first (empty section name)
        if let Some(global) = data.get("") {
            for (key, value) in global {
                result.push_str(&format!("{} = {}\n", key, Self::quote_if_needed(value)));
            }
            if !global.is_empty() {
                result.push('\n');
            }
        }

        // Write other sections
        for (section, pairs) in data {
            if section.is_empty() {
                continue; // Already handled global section
            }
            result.push_str(&format!("[{}]\n", section));
            for (key, value) in pairs {
                result.push_str(&format!("{} = {}\n", key, Self::quote_if_needed(value)));
            }
            result.push('\n');
        }

        result
    }

    /// Remove surrounding quotes from value
    fn unquote(value: &str) -> String {
        let value = value.trim();
        if (value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\''))
        {
            value[1..value.len() - 1].to_string()
        } else {
            value.to_string()
        }
    }

    /// Quote value if it contains special characters
    fn quote_if_needed(value: &str) -> String {
        if value.contains(';') || value.contains('#') || value.contains('=') || value.contains('\n') {
            format!("\"{}\"", value.replace('"', "\\\""))
        } else {
            value.to_string()
        }
    }

    /// List all sections
    pub fn sections(data: &HashMap<String, HashMap<String, String>>) -> Vec<String> {
        data.keys()
            .filter(|k| !k.is_empty())
            .cloned()
            .collect()
    }

    /// Check if section exists
    pub fn has_section(data: &HashMap<String, HashMap<String, String>>, section: &str) -> bool {
        data.contains_key(section)
    }

    /// Check if key exists in section
    pub fn has_key(
        data: &HashMap<String, HashMap<String, String>>,
        section: &str,
        key: &str,
    ) -> bool {
        data.get(section).map(|s| s.contains_key(key)).unwrap_or(false)
    }
}

/// INI builder for programmatic creation
pub struct IniBuilder {
    data: HashMap<String, HashMap<String, String>>,
    current_section: String,
}

impl IniBuilder {
    pub fn new() -> Self {
        let mut data = HashMap::new();
        data.insert(String::new(), HashMap::new()); // Global section
        Self {
            data,
            current_section: String::new(),
        }
    }

    /// Set current section
    pub fn section(mut self, name: &str) -> Self {
        self.current_section = name.to_string();
        if !self.data.contains_key(&self.current_section) {
            self.data.insert(self.current_section.clone(), HashMap::new());
        }
        self
    }

    /// Add key-value to current section
    pub fn set(mut self, key: &str, value: &str) -> Self {
        self.data
            .entry(self.current_section.clone())
            .or_insert_with(HashMap::new)
            .insert(key.to_string(), value.to_string());
        self
    }

    /// Add integer value
    pub fn set_int(self, key: &str, value: i64) -> Self {
        self.set(key, &value.to_string())
    }

    /// Add float value
    pub fn set_float(self, key: &str, value: f64) -> Self {
        self.set(key, &value.to_string())
    }

    /// Add boolean value
    pub fn set_bool(self, key: &str, value: bool) -> Self {
        self.set(key, if value { "true" } else { "false" })
    }

    /// Build the data structure
    pub fn build(self) -> HashMap<String, HashMap<String, String>> {
        self.data
    }

    /// Build as INI string
    pub fn to_string(self) -> String {
        Ini::stringify(&self.data)
    }
}

impl Default for IniBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple() {
        let ini = r#"
[database]
host = localhost
port = 5432
name = mydb

[server]
port = 8080
debug = true
"#;
        let data = Ini::parse(ini).unwrap();

        assert_eq!(Ini::get(&data, "database", "host").unwrap(), "localhost");
        assert_eq!(Ini::get_int(&data, "database", "port").unwrap(), 5432);
        assert_eq!(Ini::get_bool(&data, "server", "debug").unwrap(), true);
    }

    #[test]
    fn test_parse_with_comments() {
        let ini = r#"
; This is a comment
# This is also a comment
key = value
"#;
        let data = Ini::parse(ini).unwrap();
        assert_eq!(Ini::get_global(&data, "key").unwrap(), "value");
    }

    #[test]
    fn test_parse_quoted_values() {
        let ini = r#"
key1 = "value with spaces"
key2 = 'single quotes'
"#;
        let data = Ini::parse(ini).unwrap();
        assert_eq!(Ini::get_global(&data, "key1").unwrap(), "value with spaces");
        assert_eq!(Ini::get_global(&data, "key2").unwrap(), "single quotes");
    }

    #[test]
    fn test_builder() {
        let ini = IniBuilder::new()
            .section("server")
            .set("host", "localhost")
            .set_int("port", 8080)
            .set_bool("debug", true)
            .to_string();

        assert!(ini.contains("[server]"));
        assert!(ini.contains("host = localhost"));
        assert!(ini.contains("port = 8080"));
        assert!(ini.contains("debug = true"));
    }

    #[test]
    fn test_stringify() {
        let data = IniBuilder::new()
            .section("app")
            .set("name", "MyApp")
            .set("version", "1.0.0")
            .build();

        let ini_str = Ini::stringify(&data);
        let reparsed = Ini::parse(&ini_str).unwrap();

        assert_eq!(Ini::get(&reparsed, "app", "name").unwrap(), "MyApp");
    }
}
