//! Regular expression utilities
//!
//! Provides FFI-safe regex operations wrapper.

use serde::{Serialize, Deserialize};

/// Pattern match result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Match {
    pub text: String,
    pub start: usize,
    pub end: usize,
}

/// Regex capture group result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capture {
    pub full_match: String,
    pub groups: Vec<Option<String>>,
}

/// Regex utilities
pub struct Regex;

impl Regex {
    /// Check if pattern matches anywhere in text
    pub fn is_match(pattern: &str, text: &str) -> Result<bool, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.is_match(text))
    }

    /// Find first match
    pub fn find(pattern: &str, text: &str) -> Result<Option<Match>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re.find(text).map(|m| Match {
            text: m.as_str().to_string(),
            start: m.start(),
            end: m.end(),
        }))
    }

    /// Find all matches
    pub fn find_all(pattern: &str, text: &str) -> Result<Vec<Match>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re
            .find_iter(text)
            .map(|m| Match {
                text: m.as_str().to_string(),
                start: m.start(),
                end: m.end(),
            })
            .collect())
    }

    /// Capture groups from first match
    pub fn capture(pattern: &str, text: &str) -> Result<Option<Capture>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re.captures(text).map(|caps| {
            let full_match = caps.get(0).map(|m| m.as_str().to_string()).unwrap_or_default();
            let groups: Vec<Option<String>> = caps
                .iter()
                .skip(1)
                .map(|g| g.map(|m| m.as_str().to_string()))
                .collect();
            Capture { full_match, groups }
        }))
    }

    /// Capture groups from all matches
    pub fn capture_all(pattern: &str, text: &str) -> Result<Vec<Capture>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;

        Ok(re
            .captures_iter(text)
            .map(|caps| {
                let full_match = caps.get(0).map(|m| m.as_str().to_string()).unwrap_or_default();
                let groups: Vec<Option<String>> = caps
                    .iter()
                    .skip(1)
                    .map(|g| g.map(|m| m.as_str().to_string()))
                    .collect();
                Capture { full_match, groups }
            })
            .collect())
    }

    /// Replace first match
    pub fn replace(pattern: &str, text: &str, replacement: &str) -> Result<String, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.replace(text, replacement).to_string())
    }

    /// Replace all matches
    pub fn replace_all(pattern: &str, text: &str, replacement: &str) -> Result<String, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.replace_all(text, replacement).to_string())
    }

    /// Split text by pattern
    pub fn split(pattern: &str, text: &str) -> Result<Vec<String>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.split(text).map(|s| s.to_string()).collect())
    }

    /// Split text by pattern with limit
    pub fn splitn(pattern: &str, text: &str, limit: usize) -> Result<Vec<String>, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.splitn(text, limit).map(|s| s.to_string()).collect())
    }

    /// Count matches
    pub fn count(pattern: &str, text: &str) -> Result<usize, String> {
        let re = regex::Regex::new(pattern)
            .map_err(|e| format!("Invalid regex pattern: {}", e))?;
        Ok(re.find_iter(text).count())
    }

    /// Escape special regex characters in a string
    pub fn escape(text: &str) -> String {
        regex::escape(text)
    }

    /// Validate that a pattern is a valid regex
    pub fn is_valid(pattern: &str) -> bool {
        regex::Regex::new(pattern).is_ok()
    }
}

/// Common regex patterns
pub struct Patterns;

impl Patterns {
    /// Email pattern (basic)
    pub fn email() -> &'static str {
        r#"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"#
    }

    /// URL pattern (http/https)
    pub fn url() -> &'static str {
        r#"https?://[^\s<>"{}|\\^`\[\]]+"#
    }

    /// IPv4 address
    pub fn ipv4() -> &'static str {
        r#"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"#
    }

    /// Phone number (US)
    pub fn phone_us() -> &'static str {
        r#"\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}"#
    }

    /// Hexadecimal color
    pub fn hex_color() -> &'static str {
        r#"#(?:[0-9a-fA-F]{3}){1,2}\b"#
    }

    /// Date (YYYY-MM-DD)
    pub fn date_iso() -> &'static str {
        r#"\d{4}-\d{2}-\d{2}"#
    }

    /// Time (HH:MM or HH:MM:SS)
    pub fn time() -> &'static str {
        r#"\d{1,2}:\d{2}(?::\d{2})?"#
    }

    /// Integer
    pub fn integer() -> &'static str {
        r#"-?\d+"#
    }

    /// Float/decimal
    pub fn decimal() -> &'static str {
        r#"-?\d+\.?\d*"#
    }

    /// Word characters only
    pub fn word() -> &'static str {
        r#"\w+"#
    }

    /// Alphanumeric only
    pub fn alphanumeric() -> &'static str {
        r#"[a-zA-Z0-9]+"#
    }

    /// HTML tag
    pub fn html_tag() -> &'static str {
        r#"<[^>]+>"#
    }

    /// Whitespace
    pub fn whitespace() -> &'static str {
        r#"\s+"#
    }

    /// Line break
    pub fn line_break() -> &'static str {
        r#"\r?\n"#
    }

    /// UUID
    pub fn uuid() -> &'static str {
        r#"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"#
    }

    /// JSON string
    pub fn json_string() -> &'static str {
        r##""(?:[^"\\]|\\.)*""##
    }

    /// File extension
    pub fn file_extension() -> &'static str {
        r#"\.[a-zA-Z0-9]+$"#
    }

    /// Path separator
    pub fn path_separator() -> &'static str {
        r#"[/\\]"#
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_match() {
        assert!(Regex::is_match(r"\d+", "test123").unwrap());
        assert!(!Regex::is_match(r"\d+", "nodigits").unwrap());
    }

    #[test]
    fn test_find() {
        let result = Regex::find(r"\d+", "abc123def").unwrap().unwrap();
        assert_eq!(result.text, "123");
        assert_eq!(result.start, 3);
        assert_eq!(result.end, 6);
    }

    #[test]
    fn test_find_all() {
        let results = Regex::find_all(r"\d+", "a1b22c333").unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].text, "1");
        assert_eq!(results[1].text, "22");
        assert_eq!(results[2].text, "333");
    }

    #[test]
    fn test_capture() {
        let result = Regex::capture(r"(\w+)@(\w+)\.(\w+)", "user@example.com")
            .unwrap()
            .unwrap();
        assert_eq!(result.full_match, "user@example.com");
        assert_eq!(result.groups[0], Some("user".to_string()));
        assert_eq!(result.groups[1], Some("example".to_string()));
        assert_eq!(result.groups[2], Some("com".to_string()));
    }

    #[test]
    fn test_replace() {
        let result = Regex::replace(r"\d", "a1b2c3", "X").unwrap();
        assert_eq!(result, "aXb2c3"); // Only first

        let result = Regex::replace_all(r"\d", "a1b2c3", "X").unwrap();
        assert_eq!(result, "aXbXcX"); // All
    }

    #[test]
    fn test_split() {
        let result = Regex::split(r"\s+", "one two  three").unwrap();
        assert_eq!(result, vec!["one", "two", "three"]);
    }

    #[test]
    fn test_escape() {
        let escaped = Regex::escape("test.+*?");
        assert_eq!(escaped, r"test\.\+\*\?");
    }

    #[test]
    fn test_patterns() {
        assert!(Regex::is_match(Patterns::email(), "user@example.com").unwrap());
        assert!(Regex::is_match(Patterns::url(), "https://example.com/path").unwrap());
        assert!(Regex::is_match(Patterns::hex_color(), "#ff00aa").unwrap());
    }
}
