//! Form data parsing - multipart and URL-encoded forms
//!
//! Provides FFI-safe form data parsing without external dependencies.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// A single field from a multipart form
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultipartField {
    /// Field name
    pub name: String,
    /// Optional filename (for file uploads)
    pub filename: Option<String>,
    /// Content type of the field
    pub content_type: Option<String>,
    /// Field data as bytes
    pub data: Vec<u8>,
}

impl MultipartField {
    /// Get data as UTF-8 string
    pub fn as_string(&self) -> Result<String, String> {
        String::from_utf8(self.data.clone())
            .map_err(|e| format!("Field data is not valid UTF-8: {}", e))
    }

    /// Check if this is a file upload
    pub fn is_file(&self) -> bool {
        self.filename.is_some()
    }

    /// Get the size of the data
    pub fn size(&self) -> usize {
        self.data.len()
    }

    /// Get file extension if this is a file
    pub fn extension(&self) -> Option<String> {
        self.filename.as_ref().and_then(|f| {
            f.rsplit('.').next().map(|s| s.to_lowercase())
        })
    }
}

/// Parsed multipart form data
#[derive(Debug, Clone, Default)]
pub struct MultipartForm {
    /// All fields in the form
    pub fields: Vec<MultipartField>,
}

impl MultipartForm {
    /// Create an empty form
    pub fn new() -> Self {
        Self { fields: Vec::new() }
    }

    /// Parse multipart form data from body and boundary
    pub fn parse(body: &[u8], boundary: &str) -> Result<Self, String> {
        let mut fields = Vec::new();
        let delimiter = format!("--{}", boundary);
        let end_delimiter = format!("--{}--", boundary);

        // Convert to string for header parsing (body may be binary)
        let body_str = String::from_utf8_lossy(body);

        // Split by boundary
        let parts: Vec<&str> = body_str.split(&delimiter).collect();

        for part in parts.iter().skip(1) {
            // Skip the final boundary marker
            if part.trim().starts_with("--") || part.trim().is_empty() {
                continue;
            }

            // Remove end delimiter if present
            let part = if part.contains(&end_delimiter) {
                part.split(&end_delimiter).next().unwrap_or(part)
            } else {
                part
            };

            // Split headers from body (separated by \r\n\r\n)
            let header_body_split: Vec<&str> = part.splitn(2, "\r\n\r\n").collect();
            if header_body_split.len() != 2 {
                continue;
            }

            let headers_section = header_body_split[0];
            let body_section = header_body_split[1];

            // Remove trailing \r\n from body
            let body_section = body_section.trim_end_matches("\r\n");

            // Parse headers
            let mut name = String::new();
            let mut filename = None;
            let mut content_type = None;

            for line in headers_section.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }

                let line_lower = line.to_lowercase();

                if line_lower.starts_with("content-disposition:") {
                    // Parse Content-Disposition header
                    for param in line.split(';').skip(1) {
                        let param = param.trim();
                        if let Some(rest) = param.strip_prefix("name=") {
                            name = rest.trim_matches('"').to_string();
                        } else if let Some(rest) = param.strip_prefix("filename=") {
                            filename = Some(rest.trim_matches('"').to_string());
                        }
                    }
                } else if line_lower.starts_with("content-type:") {
                    content_type = Some(
                        line.splitn(2, ':')
                            .nth(1)
                            .unwrap_or("")
                            .trim()
                            .to_string(),
                    );
                }
            }

            if !name.is_empty() {
                fields.push(MultipartField {
                    name,
                    filename,
                    content_type,
                    data: body_section.as_bytes().to_vec(),
                });
            }
        }

        Ok(Self { fields })
    }

    /// Get a field by name
    pub fn get(&self, name: &str) -> Option<&MultipartField> {
        self.fields.iter().find(|f| f.name == name)
    }

    /// Get all fields with a given name
    pub fn get_all(&self, name: &str) -> Vec<&MultipartField> {
        self.fields.iter().filter(|f| f.name == name).collect()
    }

    /// Get a field value as string
    pub fn get_string(&self, name: &str) -> Option<String> {
        self.get(name).and_then(|f| f.as_string().ok())
    }

    /// Get all file uploads
    pub fn files(&self) -> Vec<&MultipartField> {
        self.fields.iter().filter(|f| f.is_file()).collect()
    }

    /// Get all text fields (non-files)
    pub fn text_fields(&self) -> Vec<&MultipartField> {
        self.fields.iter().filter(|f| !f.is_file()).collect()
    }

    /// Convert to HashMap (only text fields)
    pub fn to_map(&self) -> HashMap<String, String> {
        let mut map = HashMap::new();
        for field in &self.fields {
            if !field.is_file() {
                if let Ok(value) = field.as_string() {
                    map.insert(field.name.clone(), value);
                }
            }
        }
        map
    }

    /// Check if the form has a field
    pub fn has(&self, name: &str) -> bool {
        self.fields.iter().any(|f| f.name == name)
    }

    /// Get the number of fields
    pub fn len(&self) -> usize {
        self.fields.len()
    }

    /// Check if form is empty
    pub fn is_empty(&self) -> bool {
        self.fields.is_empty()
    }
}

/// URL-encoded form data (application/x-www-form-urlencoded)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UrlEncodedForm {
    /// Key-value pairs
    pub fields: HashMap<String, Vec<String>>,
}

impl UrlEncodedForm {
    /// Create an empty form
    pub fn new() -> Self {
        Self {
            fields: HashMap::new(),
        }
    }

    /// Parse URL-encoded form data
    pub fn parse(data: &str) -> Result<Self, String> {
        let mut fields: HashMap<String, Vec<String>> = HashMap::new();

        for pair in data.split('&') {
            if pair.is_empty() {
                continue;
            }

            let mut parts = pair.splitn(2, '=');
            let key = parts.next().unwrap_or("");
            let value = parts.next().unwrap_or("");

            // URL decode
            let key = Self::url_decode(key)?;
            let value = Self::url_decode(value)?;

            fields.entry(key).or_insert_with(Vec::new).push(value);
        }

        Ok(Self { fields })
    }

    /// URL decode a string
    fn url_decode(s: &str) -> Result<String, String> {
        let mut result = String::new();
        let mut chars = s.chars().peekable();

        while let Some(c) = chars.next() {
            if c == '%' {
                // Read next two hex digits
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

    /// URL encode a string
    pub fn url_encode(s: &str) -> String {
        let mut result = String::new();
        for c in s.chars() {
            match c {
                'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => {
                    result.push(c);
                }
                ' ' => {
                    result.push('+');
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

    /// Get a field value (first value if multiple)
    pub fn get(&self, name: &str) -> Option<&String> {
        self.fields.get(name).and_then(|v| v.first())
    }

    /// Get all values for a field
    pub fn get_all(&self, name: &str) -> Option<&Vec<String>> {
        self.fields.get(name)
    }

    /// Set a field value
    pub fn set(&mut self, name: &str, value: &str) {
        self.fields.insert(name.to_string(), vec![value.to_string()]);
    }

    /// Add a value to a field
    pub fn add(&mut self, name: &str, value: &str) {
        self.fields
            .entry(name.to_string())
            .or_insert_with(Vec::new)
            .push(value.to_string());
    }

    /// Check if form has a field
    pub fn has(&self, name: &str) -> bool {
        self.fields.contains_key(name)
    }

    /// Convert to query string
    pub fn to_string(&self) -> String {
        let mut parts = Vec::new();
        for (key, values) in &self.fields {
            for value in values {
                parts.push(format!(
                    "{}={}",
                    Self::url_encode(key),
                    Self::url_encode(value)
                ));
            }
        }
        parts.join("&")
    }

    /// Convert to single-value HashMap
    pub fn to_map(&self) -> HashMap<String, String> {
        self.fields
            .iter()
            .filter_map(|(k, v)| v.first().map(|val| (k.clone(), val.clone())))
            .collect()
    }
}

/// Extract boundary from content-type header
pub fn extract_boundary(content_type: &str) -> Option<String> {
    content_type
        .split(';')
        .find(|part| part.trim().to_lowercase().starts_with("boundary="))
        .map(|part| {
            part.trim()
                .strip_prefix("boundary=")
                .or_else(|| part.trim().strip_prefix("Boundary="))
                .or_else(|| part.trim().strip_prefix("BOUNDARY="))
                .unwrap_or("")
                .trim_matches('"')
                .to_string()
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_url_encoded_parse() {
        let form = UrlEncodedForm::parse("name=John%20Doe&age=30&active=true").unwrap();
        assert_eq!(form.get("name"), Some(&"John Doe".to_string()));
        assert_eq!(form.get("age"), Some(&"30".to_string()));
        assert_eq!(form.get("active"), Some(&"true".to_string()));
    }

    #[test]
    fn test_url_encode_decode() {
        let original = "Hello World! @#$%";
        let encoded = UrlEncodedForm::url_encode(original);
        let decoded = UrlEncodedForm::url_decode(&encoded).unwrap();
        // Note: + decodes to space, so this should work
        assert!(decoded.contains("Hello"));
        assert!(decoded.contains("World"));
    }

    #[test]
    fn test_extract_boundary() {
        let ct = "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW";
        let boundary = extract_boundary(ct).unwrap();
        assert_eq!(boundary, "----WebKitFormBoundary7MA4YWxkTrZu0gW");
    }
}
