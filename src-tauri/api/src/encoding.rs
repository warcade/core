//! Encoding utilities - Base64, Hex, URL encoding
//!
//! Provides FFI-safe encoding/decoding operations.

use serde::{Serialize, Deserialize};

/// Base64 encoding/decoding utilities
pub struct Base64;

impl Base64 {
    /// Encode bytes to base64 string
    pub fn encode(data: &[u8]) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD.encode(data)
    }

    /// Encode bytes to URL-safe base64 string
    pub fn encode_url_safe(data: &[u8]) -> String {
        use base64::Engine;
        base64::engine::general_purpose::URL_SAFE.encode(data)
    }

    /// Encode bytes to base64 without padding
    pub fn encode_no_pad(data: &[u8]) -> String {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD_NO_PAD.encode(data)
    }

    /// Decode base64 string to bytes
    pub fn decode(s: &str) -> Result<Vec<u8>, String> {
        use base64::Engine;
        base64::engine::general_purpose::STANDARD
            .decode(s)
            .map_err(|e| format!("Base64 decode error: {}", e))
    }

    /// Decode URL-safe base64 string to bytes
    pub fn decode_url_safe(s: &str) -> Result<Vec<u8>, String> {
        use base64::Engine;
        base64::engine::general_purpose::URL_SAFE
            .decode(s)
            .map_err(|e| format!("Base64 decode error: {}", e))
    }

    /// Encode string to base64
    pub fn encode_string(s: &str) -> String {
        Self::encode(s.as_bytes())
    }

    /// Decode base64 to string
    pub fn decode_string(s: &str) -> Result<String, String> {
        let bytes = Self::decode(s)?;
        String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {}", e))
    }
}

/// Hexadecimal encoding/decoding utilities
pub struct Hex;

impl Hex {
    /// Encode bytes to hex string (lowercase)
    pub fn encode(data: &[u8]) -> String {
        data.iter().map(|b| format!("{:02x}", b)).collect()
    }

    /// Encode bytes to hex string (uppercase)
    pub fn encode_upper(data: &[u8]) -> String {
        data.iter().map(|b| format!("{:02X}", b)).collect()
    }

    /// Decode hex string to bytes
    pub fn decode(s: &str) -> Result<Vec<u8>, String> {
        if s.len() % 2 != 0 {
            return Err("Hex string must have even length".to_string());
        }

        let mut result = Vec::with_capacity(s.len() / 2);
        let chars: Vec<char> = s.chars().collect();

        for chunk in chars.chunks(2) {
            let hex_str: String = chunk.iter().collect();
            let byte = u8::from_str_radix(&hex_str, 16)
                .map_err(|_| format!("Invalid hex character in '{}'", hex_str))?;
            result.push(byte);
        }

        Ok(result)
    }

    /// Encode string to hex
    pub fn encode_string(s: &str) -> String {
        Self::encode(s.as_bytes())
    }

    /// Decode hex to string
    pub fn decode_string(s: &str) -> Result<String, String> {
        let bytes = Self::decode(s)?;
        String::from_utf8(bytes).map_err(|e| format!("Invalid UTF-8: {}", e))
    }
}

/// URL encoding/decoding utilities
pub struct UrlEncoding;

impl UrlEncoding {
    /// Encode a string for use in URLs
    pub fn encode(s: &str) -> String {
        let mut result = String::new();
        for c in s.chars() {
            match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                    result.push(c);
                }
                _ => {
                    for byte in c.to_string().as_bytes() {
                        result.push_str(&format!("%{:02X}", byte));
                    }
                }
            }
        }
        result
    }

    /// Encode a string for use in URL path components
    pub fn encode_component(s: &str) -> String {
        Self::encode(s)
    }

    /// Decode a URL-encoded string
    pub fn decode(s: &str) -> Result<String, String> {
        let mut result = String::new();
        let mut chars = s.chars().peekable();

        while let Some(c) = chars.next() {
            if c == '%' {
                let hex1 = chars.next().ok_or("Incomplete percent encoding")?;
                let hex2 = chars.next().ok_or("Incomplete percent encoding")?;
                let hex_str = format!("{}{}", hex1, hex2);
                let byte = u8::from_str_radix(&hex_str, 16)
                    .map_err(|_| "Invalid percent encoding")?;
                result.push(byte as char);
            } else if c == '+' {
                result.push(' ');
            } else {
                result.push(c);
            }
        }

        Ok(result)
    }
}

/// HTML entity encoding/decoding
pub struct HtmlEncoding;

impl HtmlEncoding {
    /// Encode special HTML characters
    pub fn encode(s: &str) -> String {
        s.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
            .replace('\'', "&#39;")
    }

    /// Decode HTML entities
    pub fn decode(s: &str) -> String {
        s.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&#x27;", "'")
            .replace("&apos;", "'")
    }
}

/// Binary data container with encoding support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinaryData {
    data: Vec<u8>,
}

impl BinaryData {
    /// Create from raw bytes
    pub fn from_bytes(data: Vec<u8>) -> Self {
        Self { data }
    }

    /// Create from base64 string
    pub fn from_base64(s: &str) -> Result<Self, String> {
        Ok(Self {
            data: Base64::decode(s)?,
        })
    }

    /// Create from hex string
    pub fn from_hex(s: &str) -> Result<Self, String> {
        Ok(Self {
            data: Hex::decode(s)?,
        })
    }

    /// Get raw bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.data
    }

    /// Get owned bytes
    pub fn into_bytes(self) -> Vec<u8> {
        self.data
    }

    /// Convert to base64
    pub fn to_base64(&self) -> String {
        Base64::encode(&self.data)
    }

    /// Convert to hex
    pub fn to_hex(&self) -> String {
        Hex::encode(&self.data)
    }

    /// Convert to string (if valid UTF-8)
    pub fn to_string(&self) -> Result<String, String> {
        String::from_utf8(self.data.clone()).map_err(|e| format!("Invalid UTF-8: {}", e))
    }

    /// Get size in bytes
    pub fn size(&self) -> usize {
        self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64() {
        let original = b"Hello, World!";
        let encoded = Base64::encode(original);
        let decoded = Base64::decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_hex() {
        let original = b"Hello";
        let encoded = Hex::encode(original);
        assert_eq!(encoded, "48656c6c6f");
        let decoded = Hex::decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_url_encoding() {
        let original = "Hello World! @#$%";
        let encoded = UrlEncoding::encode(original);
        assert!(encoded.contains("%20")); // Space encoded
        assert!(!encoded.contains(' ')); // No raw spaces
    }

    #[test]
    fn test_html_encoding() {
        let original = "<script>alert('XSS')</script>";
        let encoded = HtmlEncoding::encode(original);
        assert!(!encoded.contains('<'));
        assert!(!encoded.contains('>'));
        let decoded = HtmlEncoding::decode(&encoded);
        assert_eq!(decoded, original);
    }
}
