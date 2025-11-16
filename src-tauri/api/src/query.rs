//! Query string parsing and building utilities
//!
//! Pure Rust implementation for URL query strings.

use std::collections::HashMap;

/// Query string utilities
pub struct QueryString;

impl QueryString {
    /// Parse query string into HashMap
    /// Input: "key1=value1&key2=value2"
    pub fn parse(query: &str) -> HashMap<String, String> {
        let query = query.trim_start_matches('?');

        query.split('&')
            .filter(|s| !s.is_empty())
            .filter_map(|pair| {
                let mut parts = pair.splitn(2, '=');
                let key = parts.next()?;
                let value = parts.next().unwrap_or("");
                Some((
                    Self::decode(key),
                    Self::decode(value)
                ))
            })
            .collect()
    }

    /// Parse query string with multiple values per key
    /// Returns HashMap<String, Vec<String>>
    pub fn parse_multi(query: &str) -> HashMap<String, Vec<String>> {
        let query = query.trim_start_matches('?');
        let mut result: HashMap<String, Vec<String>> = HashMap::new();

        for pair in query.split('&').filter(|s| !s.is_empty()) {
            let mut parts = pair.splitn(2, '=');
            if let Some(key) = parts.next() {
                let value = parts.next().unwrap_or("");
                result
                    .entry(Self::decode(key))
                    .or_insert_with(Vec::new)
                    .push(Self::decode(value));
            }
        }

        result
    }

    /// Build query string from HashMap
    /// Output: "key1=value1&key2=value2"
    pub fn build(params: &HashMap<String, String>) -> String {
        params.iter()
            .map(|(k, v)| format!("{}={}", Self::encode(k), Self::encode(v)))
            .collect::<Vec<_>>()
            .join("&")
    }

    /// Build query string from multi-value HashMap
    pub fn build_multi(params: &HashMap<String, Vec<String>>) -> String {
        let mut pairs = Vec::new();

        for (key, values) in params {
            for value in values {
                pairs.push(format!("{}={}", Self::encode(key), Self::encode(value)));
            }
        }

        pairs.join("&")
    }

    /// URL encode a string (percent encoding)
    pub fn encode(s: &str) -> String {
        let mut result = String::new();

        for byte in s.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    result.push(byte as char);
                }
                b' ' => {
                    result.push('+');
                }
                _ => {
                    result.push_str(&format!("%{:02X}", byte));
                }
            }
        }

        result
    }

    /// URL decode a string (percent decoding)
    pub fn decode(s: &str) -> String {
        let mut result = Vec::new();
        let mut chars = s.chars().peekable();

        while let Some(ch) = chars.next() {
            match ch {
                '%' => {
                    let hex: String = chars.by_ref().take(2).collect();
                    if hex.len() == 2 {
                        if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                            result.push(byte);
                        }
                    }
                }
                '+' => {
                    result.push(b' ');
                }
                _ => {
                    result.push(ch as u8);
                }
            }
        }

        String::from_utf8_lossy(&result).to_string()
    }

    /// Get a single value from parsed query string
    pub fn get<'a>(params: &'a HashMap<String, String>, key: &str) -> Option<&'a String> {
        params.get(key)
    }

    /// Get a value with default
    pub fn get_or(params: &HashMap<String, String>, key: &str, default: &str) -> String {
        params.get(key).cloned().unwrap_or_else(|| default.to_string())
    }

    /// Get value as integer
    pub fn get_int(params: &HashMap<String, String>, key: &str) -> Option<i64> {
        params.get(key).and_then(|v| v.parse().ok())
    }

    /// Get value as float
    pub fn get_float(params: &HashMap<String, String>, key: &str) -> Option<f64> {
        params.get(key).and_then(|v| v.parse().ok())
    }

    /// Get value as boolean
    pub fn get_bool(params: &HashMap<String, String>, key: &str) -> Option<bool> {
        params.get(key).map(|v| {
            matches!(v.to_lowercase().as_str(), "true" | "1" | "yes" | "on")
        })
    }

    /// Merge two query string HashMaps
    pub fn merge(base: &HashMap<String, String>, overlay: &HashMap<String, String>) -> HashMap<String, String> {
        let mut result = base.clone();
        result.extend(overlay.clone());
        result
    }

    /// Remove keys from query string
    pub fn remove_keys(params: &HashMap<String, String>, keys: &[&str]) -> HashMap<String, String> {
        params.iter()
            .filter(|(k, _)| !keys.contains(&k.as_str()))
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Keep only specified keys
    pub fn keep_keys(params: &HashMap<String, String>, keys: &[&str]) -> HashMap<String, String> {
        params.iter()
            .filter(|(k, _)| keys.contains(&k.as_str()))
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Append query string to URL
    pub fn append_to_url(url: &str, params: &HashMap<String, String>) -> String {
        if params.is_empty() {
            return url.to_string();
        }

        let query = Self::build(params);

        if url.contains('?') {
            format!("{}&{}", url, query)
        } else {
            format!("{}?{}", url, query)
        }
    }

    /// Extract query string from URL
    pub fn from_url(url: &str) -> HashMap<String, String> {
        if let Some(pos) = url.find('?') {
            let query = &url[pos + 1..];
            // Remove fragment if present
            let query = if let Some(frag_pos) = query.find('#') {
                &query[..frag_pos]
            } else {
                query
            };
            Self::parse(query)
        } else {
            HashMap::new()
        }
    }
}

/// Query string builder for fluent API
pub struct QueryBuilder {
    params: HashMap<String, String>,
}

impl QueryBuilder {
    pub fn new() -> Self {
        Self {
            params: HashMap::new(),
        }
    }

    /// Add a parameter
    pub fn param(mut self, key: &str, value: &str) -> Self {
        self.params.insert(key.to_string(), value.to_string());
        self
    }

    /// Add integer parameter
    pub fn param_int(self, key: &str, value: i64) -> Self {
        self.param(key, &value.to_string())
    }

    /// Add float parameter
    pub fn param_float(self, key: &str, value: f64) -> Self {
        self.param(key, &value.to_string())
    }

    /// Add boolean parameter
    pub fn param_bool(self, key: &str, value: bool) -> Self {
        self.param(key, if value { "true" } else { "false" })
    }

    /// Add parameter only if condition is true
    pub fn param_if(self, condition: bool, key: &str, value: &str) -> Self {
        if condition {
            self.param(key, value)
        } else {
            self
        }
    }

    /// Add parameter only if value is Some
    pub fn param_opt(self, key: &str, value: Option<&str>) -> Self {
        if let Some(v) = value {
            self.param(key, v)
        } else {
            self
        }
    }

    /// Build the query string
    pub fn build(self) -> String {
        QueryString::build(&self.params)
    }

    /// Get the internal HashMap
    pub fn into_map(self) -> HashMap<String, String> {
        self.params
    }

    /// Append to URL
    pub fn append_to(self, url: &str) -> String {
        QueryString::append_to_url(url, &self.params)
    }
}

impl Default for QueryBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse() {
        let params = QueryString::parse("name=John&age=30&city=New%20York");
        assert_eq!(params.get("name").unwrap(), "John");
        assert_eq!(params.get("age").unwrap(), "30");
        assert_eq!(params.get("city").unwrap(), "New York");
    }

    #[test]
    fn test_parse_with_question_mark() {
        let params = QueryString::parse("?key=value");
        assert_eq!(params.get("key").unwrap(), "value");
    }

    #[test]
    fn test_build() {
        let mut params = HashMap::new();
        params.insert("key".to_string(), "value".to_string());
        params.insert("space".to_string(), "hello world".to_string());

        let query = QueryString::build(&params);
        assert!(query.contains("key=value"));
        assert!(query.contains("space=hello+world"));
    }

    #[test]
    fn test_encode_decode() {
        let original = "hello world!@#$%";
        let encoded = QueryString::encode(original);
        let decoded = QueryString::decode(&encoded);
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_builder() {
        let query = QueryBuilder::new()
            .param("name", "Alice")
            .param_int("age", 25)
            .param_bool("active", true)
            .build();

        assert!(query.contains("name=Alice"));
        assert!(query.contains("age=25"));
        assert!(query.contains("active=true"));
    }

    #[test]
    fn test_from_url() {
        let params = QueryString::from_url("https://example.com/path?foo=bar&baz=qux#section");
        assert_eq!(params.get("foo").unwrap(), "bar");
        assert_eq!(params.get("baz").unwrap(), "qux");
    }

    #[test]
    fn test_append_to_url() {
        let mut params = HashMap::new();
        params.insert("key".to_string(), "value".to_string());

        let url = QueryString::append_to_url("https://example.com", &params);
        assert_eq!(url, "https://example.com?key=value");

        let url2 = QueryString::append_to_url("https://example.com?existing=1", &params);
        assert!(url2.contains("existing=1"));
        assert!(url2.contains("key=value"));
    }
}
