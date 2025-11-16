//! Validation utilities - Input validation for common patterns
//!
//! Provides FFI-safe validation functions.

use serde::{Serialize, Deserialize};

/// Validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

impl ValidationResult {
    pub fn ok() -> Self {
        Self {
            valid: true,
            errors: Vec::new(),
        }
    }

    pub fn error(msg: &str) -> Self {
        Self {
            valid: false,
            errors: vec![msg.to_string()],
        }
    }

    pub fn errors(errors: Vec<String>) -> Self {
        Self {
            valid: errors.is_empty(),
            errors,
        }
    }

    pub fn is_valid(&self) -> bool {
        self.valid
    }

    pub fn first_error(&self) -> Option<&String> {
        self.errors.first()
    }
}

/// Email validation
pub struct Email;

impl Email {
    /// Basic email validation
    pub fn is_valid(email: &str) -> bool {
        if email.is_empty() || email.len() > 254 {
            return false;
        }

        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return false;
        }

        let local = parts[0];
        let domain = parts[1];

        // Local part checks
        if local.is_empty() || local.len() > 64 {
            return false;
        }

        // Domain checks
        if domain.is_empty() || !domain.contains('.') {
            return false;
        }

        // Check for valid characters
        let valid_local = local.chars().all(|c| {
            c.is_ascii_alphanumeric() || "!#$%&'*+/=?^_`{|}~.-".contains(c)
        });

        let valid_domain = domain.chars().all(|c| {
            c.is_ascii_alphanumeric() || c == '.' || c == '-'
        });

        valid_local && valid_domain
    }

    /// Validate email with detailed result
    pub fn validate(email: &str) -> ValidationResult {
        if email.is_empty() {
            return ValidationResult::error("Email cannot be empty");
        }

        if email.len() > 254 {
            return ValidationResult::error("Email is too long (max 254 characters)");
        }

        if !email.contains('@') {
            return ValidationResult::error("Email must contain @ symbol");
        }

        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return ValidationResult::error("Email must have exactly one @ symbol");
        }

        let local = parts[0];
        let domain = parts[1];

        if local.is_empty() {
            return ValidationResult::error("Email local part cannot be empty");
        }

        if domain.is_empty() {
            return ValidationResult::error("Email domain cannot be empty");
        }

        if !domain.contains('.') {
            return ValidationResult::error("Email domain must contain a dot");
        }

        ValidationResult::ok()
    }
}

/// URL validation
pub struct Url;

impl Url {
    /// Basic URL validation
    pub fn is_valid(url: &str) -> bool {
        if url.is_empty() {
            return false;
        }

        // Must start with a valid scheme
        let has_scheme = url.starts_with("http://")
            || url.starts_with("https://")
            || url.starts_with("ftp://")
            || url.starts_with("file://");

        if !has_scheme {
            return false;
        }

        // Must have a host after scheme
        let after_scheme = if url.starts_with("http://") {
            &url[7..]
        } else if url.starts_with("https://") {
            &url[8..]
        } else if url.starts_with("ftp://") {
            &url[6..]
        } else if url.starts_with("file://") {
            &url[7..]
        } else {
            return false;
        };

        !after_scheme.is_empty() && !after_scheme.starts_with('/')
    }

    /// Check if URL is HTTPS
    pub fn is_https(url: &str) -> bool {
        url.starts_with("https://")
    }

    /// Extract domain from URL
    pub fn extract_domain(url: &str) -> Option<String> {
        let after_scheme = if url.starts_with("https://") {
            &url[8..]
        } else if url.starts_with("http://") {
            &url[7..]
        } else {
            return None;
        };

        let domain = after_scheme.split('/').next()?;
        let domain = domain.split(':').next()?; // Remove port
        Some(domain.to_string())
    }
}

/// String validation utilities
pub struct StringValidation;

impl StringValidation {
    /// Check if string is alphanumeric
    pub fn is_alphanumeric(s: &str) -> bool {
        !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric())
    }

    /// Check if string is alphabetic only
    pub fn is_alphabetic(s: &str) -> bool {
        !s.is_empty() && s.chars().all(|c| c.is_ascii_alphabetic())
    }

    /// Check if string is numeric only
    pub fn is_numeric(s: &str) -> bool {
        !s.is_empty() && s.chars().all(|c| c.is_ascii_digit())
    }

    /// Check if string contains only allowed characters
    pub fn matches_charset(s: &str, allowed: &str) -> bool {
        s.chars().all(|c| allowed.contains(c))
    }

    /// Check string length is within bounds
    pub fn length_between(s: &str, min: usize, max: usize) -> bool {
        let len = s.len();
        len >= min && len <= max
    }

    /// Check if string is a valid identifier (starts with letter/underscore, contains alphanumeric/underscore)
    pub fn is_identifier(s: &str) -> bool {
        if s.is_empty() {
            return false;
        }
        let mut chars = s.chars();
        let first = chars.next().unwrap();
        if !first.is_ascii_alphabetic() && first != '_' {
            return false;
        }
        chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
    }

    /// Check if string is a valid slug (lowercase, alphanumeric, hyphens)
    pub fn is_slug(s: &str) -> bool {
        if s.is_empty() {
            return false;
        }
        s.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
            && !s.starts_with('-')
            && !s.ends_with('-')
            && !s.contains("--")
    }
}

/// Number validation utilities
pub struct NumberValidation;

impl NumberValidation {
    /// Check if string is a valid integer
    pub fn is_integer(s: &str) -> bool {
        if s.is_empty() {
            return false;
        }
        let s = s.trim();
        let s = if s.starts_with('-') || s.starts_with('+') {
            &s[1..]
        } else {
            s
        };
        !s.is_empty() && s.chars().all(|c| c.is_ascii_digit())
    }

    /// Check if string is a valid float
    pub fn is_float(s: &str) -> bool {
        s.parse::<f64>().is_ok()
    }

    /// Check if number is in range
    pub fn in_range_i64(value: i64, min: i64, max: i64) -> bool {
        value >= min && value <= max
    }

    /// Check if float is in range
    pub fn in_range_f64(value: f64, min: f64, max: f64) -> bool {
        value >= min && value <= max
    }

    /// Parse and validate integer
    pub fn parse_integer(s: &str) -> Result<i64, String> {
        s.trim()
            .parse::<i64>()
            .map_err(|_| format!("'{}' is not a valid integer", s))
    }

    /// Parse and validate float
    pub fn parse_float(s: &str) -> Result<f64, String> {
        s.trim()
            .parse::<f64>()
            .map_err(|_| format!("'{}' is not a valid number", s))
    }
}

/// Password validation
pub struct Password;

impl Password {
    /// Check password strength (basic)
    pub fn validate(password: &str) -> ValidationResult {
        let mut errors = Vec::new();

        if password.len() < 8 {
            errors.push("Password must be at least 8 characters long".to_string());
        }

        if !password.chars().any(|c| c.is_ascii_uppercase()) {
            errors.push("Password must contain at least one uppercase letter".to_string());
        }

        if !password.chars().any(|c| c.is_ascii_lowercase()) {
            errors.push("Password must contain at least one lowercase letter".to_string());
        }

        if !password.chars().any(|c| c.is_ascii_digit()) {
            errors.push("Password must contain at least one digit".to_string());
        }

        ValidationResult::errors(errors)
    }

    /// Check password strength with custom rules
    pub fn validate_custom(
        password: &str,
        min_length: usize,
        require_uppercase: bool,
        require_lowercase: bool,
        require_digit: bool,
        require_special: bool,
    ) -> ValidationResult {
        let mut errors = Vec::new();

        if password.len() < min_length {
            errors.push(format!(
                "Password must be at least {} characters long",
                min_length
            ));
        }

        if require_uppercase && !password.chars().any(|c| c.is_ascii_uppercase()) {
            errors.push("Password must contain at least one uppercase letter".to_string());
        }

        if require_lowercase && !password.chars().any(|c| c.is_ascii_lowercase()) {
            errors.push("Password must contain at least one lowercase letter".to_string());
        }

        if require_digit && !password.chars().any(|c| c.is_ascii_digit()) {
            errors.push("Password must contain at least one digit".to_string());
        }

        if require_special && !password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;':\",./<>?".contains(c)) {
            errors.push("Password must contain at least one special character".to_string());
        }

        ValidationResult::errors(errors)
    }
}

/// File validation
pub struct FileValidation;

impl FileValidation {
    /// Check if filename is safe (no path traversal, valid characters)
    pub fn is_safe_filename(filename: &str) -> bool {
        if filename.is_empty() || filename.len() > 255 {
            return false;
        }

        // No path separators
        if filename.contains('/') || filename.contains('\\') {
            return false;
        }

        // No parent directory references
        if filename == "." || filename == ".." || filename.contains("..") {
            return false;
        }

        // No null bytes
        if filename.contains('\0') {
            return false;
        }

        // Windows reserved names
        let reserved = [
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];
        let upper = filename.to_uppercase();
        let name_part = upper.split('.').next().unwrap_or(&upper);
        if reserved.contains(&name_part) {
            return false;
        }

        true
    }

    /// Check if file extension is allowed
    pub fn has_allowed_extension(filename: &str, allowed: &[&str]) -> bool {
        if let Some(ext) = filename.rsplit('.').next() {
            let ext_lower = ext.to_lowercase();
            allowed.iter().any(|&a| a.to_lowercase() == ext_lower)
        } else {
            false
        }
    }

    /// Get file extension
    pub fn get_extension(filename: &str) -> Option<String> {
        filename.rsplit('.').next().map(|s| s.to_lowercase())
    }

    /// Check file size is within limit
    pub fn size_within_limit(size_bytes: u64, max_mb: u64) -> bool {
        size_bytes <= max_mb * 1024 * 1024
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(Email::is_valid("test@example.com"));
        assert!(Email::is_valid("user.name@domain.co.uk"));
        assert!(!Email::is_valid("invalid"));
        assert!(!Email::is_valid("@domain.com"));
        assert!(!Email::is_valid("user@"));
    }

    #[test]
    fn test_url_validation() {
        assert!(Url::is_valid("https://example.com"));
        assert!(Url::is_valid("http://localhost:3000/path"));
        assert!(!Url::is_valid("example.com"));
        assert!(!Url::is_valid("ftp://"));
    }

    #[test]
    fn test_string_validation() {
        assert!(StringValidation::is_alphanumeric("Hello123"));
        assert!(!StringValidation::is_alphanumeric("Hello 123"));
        assert!(StringValidation::is_identifier("my_var"));
        assert!(!StringValidation::is_identifier("123var"));
        assert!(StringValidation::is_slug("my-cool-slug"));
        assert!(!StringValidation::is_slug("My-Slug"));
    }

    #[test]
    fn test_password_validation() {
        let result = Password::validate("Weak");
        assert!(!result.is_valid());

        let result = Password::validate("StrongPass123");
        assert!(result.is_valid());
    }

    #[test]
    fn test_file_validation() {
        assert!(FileValidation::is_safe_filename("document.pdf"));
        assert!(!FileValidation::is_safe_filename("../secret.txt"));
        assert!(!FileValidation::is_safe_filename("CON.txt"));

        assert!(FileValidation::has_allowed_extension(
            "image.jpg",
            &["jpg", "png", "gif"]
        ));
        assert!(!FileValidation::has_allowed_extension(
            "script.exe",
            &["jpg", "png", "gif"]
        ));
    }
}
