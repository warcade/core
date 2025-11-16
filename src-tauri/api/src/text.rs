//! Text manipulation utilities
//!
//! Provides FFI-safe string manipulation functions.

use serde::{Serialize, Deserialize};

/// Text transformation utilities
pub struct Text;

impl Text {
    /// Convert string to slug (lowercase, hyphens)
    pub fn slugify(s: &str) -> String {
        s.to_lowercase()
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() {
                    c
                } else {
                    '-'
                }
            })
            .collect::<String>()
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<_>>()
            .join("-")
    }

    /// Convert to camelCase
    pub fn to_camel_case(s: &str) -> String {
        let parts: Vec<&str> = s.split(|c: char| !c.is_ascii_alphanumeric()).collect();
        let mut result = String::new();
        for (i, part) in parts.iter().enumerate() {
            if part.is_empty() {
                continue;
            }
            if i == 0 {
                result.push_str(&part.to_lowercase());
            } else {
                let mut chars = part.chars();
                if let Some(first) = chars.next() {
                    result.push(first.to_ascii_uppercase());
                    result.push_str(&chars.as_str().to_lowercase());
                }
            }
        }
        result
    }

    /// Convert to PascalCase
    pub fn to_pascal_case(s: &str) -> String {
        let parts: Vec<&str> = s.split(|c: char| !c.is_ascii_alphanumeric()).collect();
        let mut result = String::new();
        for part in parts {
            if part.is_empty() {
                continue;
            }
            let mut chars = part.chars();
            if let Some(first) = chars.next() {
                result.push(first.to_ascii_uppercase());
                result.push_str(&chars.as_str().to_lowercase());
            }
        }
        result
    }

    /// Convert to snake_case
    pub fn to_snake_case(s: &str) -> String {
        let mut result = String::new();
        let chars: Vec<char> = s.chars().collect();

        for (i, &c) in chars.iter().enumerate() {
            if c.is_ascii_uppercase() {
                if i > 0 && !chars[i - 1].is_ascii_uppercase() {
                    result.push('_');
                }
                result.push(c.to_ascii_lowercase());
            } else if !c.is_ascii_alphanumeric() {
                if !result.ends_with('_') && !result.is_empty() {
                    result.push('_');
                }
            } else {
                result.push(c);
            }
        }

        result.trim_matches('_').to_string()
    }

    /// Convert to SCREAMING_SNAKE_CASE
    pub fn to_screaming_snake_case(s: &str) -> String {
        Self::to_snake_case(s).to_uppercase()
    }

    /// Convert to kebab-case
    pub fn to_kebab_case(s: &str) -> String {
        Self::to_snake_case(s).replace('_', "-")
    }

    /// Truncate string to max length with ellipsis
    pub fn truncate(s: &str, max_len: usize) -> String {
        if s.len() <= max_len {
            s.to_string()
        } else if max_len <= 3 {
            s.chars().take(max_len).collect()
        } else {
            format!("{}...", &s[..max_len - 3])
        }
    }

    /// Truncate string to max length with custom suffix
    pub fn truncate_with(s: &str, max_len: usize, suffix: &str) -> String {
        if s.len() <= max_len {
            s.to_string()
        } else if max_len <= suffix.len() {
            s.chars().take(max_len).collect()
        } else {
            format!("{}{}", &s[..max_len - suffix.len()], suffix)
        }
    }

    /// Pad string to left with character
    pub fn pad_left(s: &str, len: usize, pad_char: char) -> String {
        if s.len() >= len {
            s.to_string()
        } else {
            let padding: String = std::iter::repeat(pad_char).take(len - s.len()).collect();
            format!("{}{}", padding, s)
        }
    }

    /// Pad string to right with character
    pub fn pad_right(s: &str, len: usize, pad_char: char) -> String {
        if s.len() >= len {
            s.to_string()
        } else {
            let padding: String = std::iter::repeat(pad_char).take(len - s.len()).collect();
            format!("{}{}", s, padding)
        }
    }

    /// Center string with padding
    pub fn center(s: &str, len: usize, pad_char: char) -> String {
        if s.len() >= len {
            s.to_string()
        } else {
            let total_padding = len - s.len();
            let left_padding = total_padding / 2;
            let right_padding = total_padding - left_padding;
            let left: String = std::iter::repeat(pad_char).take(left_padding).collect();
            let right: String = std::iter::repeat(pad_char).take(right_padding).collect();
            format!("{}{}{}", left, s, right)
        }
    }

    /// Remove all whitespace from string
    pub fn remove_whitespace(s: &str) -> String {
        s.chars().filter(|c| !c.is_whitespace()).collect()
    }

    /// Collapse multiple whitespace into single space
    pub fn collapse_whitespace(s: &str) -> String {
        s.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// Reverse a string
    pub fn reverse(s: &str) -> String {
        s.chars().rev().collect()
    }

    /// Count occurrences of substring
    pub fn count_occurrences(s: &str, pattern: &str) -> usize {
        if pattern.is_empty() {
            return 0;
        }
        s.matches(pattern).count()
    }

    /// Extract all words from string
    pub fn words(s: &str) -> Vec<String> {
        s.split_whitespace().map(|w| w.to_string()).collect()
    }

    /// Extract first n words
    pub fn first_words(s: &str, n: usize) -> String {
        s.split_whitespace().take(n).collect::<Vec<_>>().join(" ")
    }

    /// Capitalize first letter
    pub fn capitalize(s: &str) -> String {
        let mut chars = s.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => {
                format!("{}{}", first.to_uppercase(), chars.as_str())
            }
        }
    }

    /// Capitalize each word
    pub fn title_case(s: &str) -> String {
        s.split_whitespace()
            .map(|word| Self::capitalize(word))
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Check if string contains only ASCII
    pub fn is_ascii(s: &str) -> bool {
        s.is_ascii()
    }

    /// Remove non-ASCII characters
    pub fn ascii_only(s: &str) -> String {
        s.chars().filter(|c| c.is_ascii()).collect()
    }

    /// Escape special regex characters
    pub fn escape_regex(s: &str) -> String {
        let special = r"\.+*?^${}[]|()";
        let mut result = String::new();
        for c in s.chars() {
            if special.contains(c) {
                result.push('\\');
            }
            result.push(c);
        }
        result
    }

    /// Strip HTML tags from string (basic)
    pub fn strip_html(s: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in s.chars() {
            if c == '<' {
                in_tag = true;
            } else if c == '>' {
                in_tag = false;
            } else if !in_tag {
                result.push(c);
            }
        }

        result
    }

    /// Wrap text to specified width
    pub fn word_wrap(s: &str, width: usize) -> String {
        let words = s.split_whitespace();
        let mut lines = Vec::new();
        let mut current_line = String::new();

        for word in words {
            if current_line.is_empty() {
                current_line = word.to_string();
            } else if current_line.len() + 1 + word.len() <= width {
                current_line.push(' ');
                current_line.push_str(word);
            } else {
                lines.push(current_line);
                current_line = word.to_string();
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }

        lines.join("\n")
    }
}

/// String similarity and distance
pub struct StringDistance;

impl StringDistance {
    /// Calculate Levenshtein distance between two strings
    pub fn levenshtein(a: &str, b: &str) -> usize {
        let a_chars: Vec<char> = a.chars().collect();
        let b_chars: Vec<char> = b.chars().collect();
        let a_len = a_chars.len();
        let b_len = b_chars.len();

        if a_len == 0 {
            return b_len;
        }
        if b_len == 0 {
            return a_len;
        }

        let mut matrix = vec![vec![0usize; b_len + 1]; a_len + 1];

        for i in 0..=a_len {
            matrix[i][0] = i;
        }
        for j in 0..=b_len {
            matrix[0][j] = j;
        }

        for i in 1..=a_len {
            for j in 1..=b_len {
                let cost = if a_chars[i - 1] == b_chars[j - 1] {
                    0
                } else {
                    1
                };
                matrix[i][j] = *[
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost,
                ]
                .iter()
                .min()
                .unwrap();
            }
        }

        matrix[a_len][b_len]
    }

    /// Calculate similarity ratio (0.0 to 1.0)
    pub fn similarity(a: &str, b: &str) -> f64 {
        let max_len = a.len().max(b.len());
        if max_len == 0 {
            return 1.0;
        }
        let distance = Self::levenshtein(a, b);
        1.0 - (distance as f64 / max_len as f64)
    }

    /// Check if strings are similar (above threshold)
    pub fn are_similar(a: &str, b: &str, threshold: f64) -> bool {
        Self::similarity(a, b) >= threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(Text::slugify("Hello World!"), "hello-world");
        assert_eq!(Text::slugify("My  Cool   Plugin"), "my-cool-plugin");
    }

    #[test]
    fn test_case_conversions() {
        assert_eq!(Text::to_camel_case("hello_world"), "helloWorld");
        assert_eq!(Text::to_pascal_case("hello_world"), "HelloWorld");
        assert_eq!(Text::to_snake_case("helloWorld"), "hello_world");
        assert_eq!(Text::to_kebab_case("helloWorld"), "hello-world");
    }

    #[test]
    fn test_truncate() {
        assert_eq!(Text::truncate("Hello World", 8), "Hello...");
        assert_eq!(Text::truncate("Hi", 10), "Hi");
    }

    #[test]
    fn test_padding() {
        assert_eq!(Text::pad_left("42", 5, '0'), "00042");
        assert_eq!(Text::pad_right("Hi", 5, '-'), "Hi---");
        assert_eq!(Text::center("Hi", 6, '-'), "--Hi--");
    }

    #[test]
    fn test_levenshtein() {
        assert_eq!(StringDistance::levenshtein("kitten", "sitting"), 3);
        assert_eq!(StringDistance::levenshtein("", "abc"), 3);
        assert_eq!(StringDistance::levenshtein("abc", "abc"), 0);
    }

    #[test]
    fn test_word_wrap() {
        let text = "This is a long text that needs to be wrapped";
        let wrapped = Text::word_wrap(text, 20);
        assert!(wrapped.contains('\n'));
    }
}
