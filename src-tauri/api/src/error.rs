//! Error handling utilities
//!
//! Provides FFI-safe error handling types and utilities.

use serde::{Serialize, Deserialize};
use std::fmt;

/// Standard result type for WebArcade API
pub type Result<T> = std::result::Result<T, Error>;

/// Standard error type for WebArcade API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Error {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
}

impl Error {
    /// Create a new error
    pub fn new(code: ErrorCode, message: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            details: None,
        }
    }

    /// Create error with details
    pub fn with_details(code: ErrorCode, message: &str, details: &str) -> Self {
        Self {
            code,
            message: message.to_string(),
            details: Some(details.to_string()),
        }
    }

    /// Create a generic error
    pub fn generic(message: &str) -> Self {
        Self::new(ErrorCode::Generic, message)
    }

    /// Create a not found error
    pub fn not_found(message: &str) -> Self {
        Self::new(ErrorCode::NotFound, message)
    }

    /// Create a validation error
    pub fn validation(message: &str) -> Self {
        Self::new(ErrorCode::Validation, message)
    }

    /// Create an IO error
    pub fn io(message: &str) -> Self {
        Self::new(ErrorCode::Io, message)
    }

    /// Create a parse error
    pub fn parse(message: &str) -> Self {
        Self::new(ErrorCode::Parse, message)
    }

    /// Create an unauthorized error
    pub fn unauthorized(message: &str) -> Self {
        Self::new(ErrorCode::Unauthorized, message)
    }

    /// Create a forbidden error
    pub fn forbidden(message: &str) -> Self {
        Self::new(ErrorCode::Forbidden, message)
    }

    /// Create an internal error
    pub fn internal(message: &str) -> Self {
        Self::new(ErrorCode::Internal, message)
    }

    /// Create a timeout error
    pub fn timeout(message: &str) -> Self {
        Self::new(ErrorCode::Timeout, message)
    }

    /// Convert to HTTP status code
    pub fn to_http_status(&self) -> u16 {
        self.code.to_http_status()
    }

    /// Convert to JSON string
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            format!(r#"{{"error":"{}"}}"#, self.message)
        })
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if let Some(details) = &self.details {
            write!(f, "[{}] {}: {}", self.code, self.message, details)
        } else {
            write!(f, "[{}] {}", self.code, self.message)
        }
    }
}

impl std::error::Error for Error {}

/// Error codes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    Generic,
    NotFound,
    Validation,
    Io,
    Parse,
    Unauthorized,
    Forbidden,
    Internal,
    Timeout,
    Network,
    Database,
    Configuration,
    Plugin,
    Ffi,
}

impl ErrorCode {
    /// Convert to HTTP status code
    pub fn to_http_status(&self) -> u16 {
        match self {
            ErrorCode::Generic => 500,
            ErrorCode::NotFound => 404,
            ErrorCode::Validation => 400,
            ErrorCode::Io => 500,
            ErrorCode::Parse => 400,
            ErrorCode::Unauthorized => 401,
            ErrorCode::Forbidden => 403,
            ErrorCode::Internal => 500,
            ErrorCode::Timeout => 408,
            ErrorCode::Network => 503,
            ErrorCode::Database => 500,
            ErrorCode::Configuration => 500,
            ErrorCode::Plugin => 500,
            ErrorCode::Ffi => 500,
        }
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorCode::Generic => write!(f, "GENERIC"),
            ErrorCode::NotFound => write!(f, "NOT_FOUND"),
            ErrorCode::Validation => write!(f, "VALIDATION"),
            ErrorCode::Io => write!(f, "IO"),
            ErrorCode::Parse => write!(f, "PARSE"),
            ErrorCode::Unauthorized => write!(f, "UNAUTHORIZED"),
            ErrorCode::Forbidden => write!(f, "FORBIDDEN"),
            ErrorCode::Internal => write!(f, "INTERNAL"),
            ErrorCode::Timeout => write!(f, "TIMEOUT"),
            ErrorCode::Network => write!(f, "NETWORK"),
            ErrorCode::Database => write!(f, "DATABASE"),
            ErrorCode::Configuration => write!(f, "CONFIGURATION"),
            ErrorCode::Plugin => write!(f, "PLUGIN"),
            ErrorCode::Ffi => write!(f, "FFI"),
        }
    }
}

/// Extension trait for Result to add context
pub trait ResultExt<T> {
    fn context(self, message: &str) -> Result<T>;
    fn with_code(self, code: ErrorCode) -> Result<T>;
}

impl<T, E: fmt::Display> ResultExt<T> for std::result::Result<T, E> {
    fn context(self, message: &str) -> Result<T> {
        self.map_err(|e| Error::with_details(ErrorCode::Generic, message, &e.to_string()))
    }

    fn with_code(self, code: ErrorCode) -> Result<T> {
        self.map_err(|e| Error::new(code, &e.to_string()))
    }
}

/// Option extension trait
pub trait OptionExt<T> {
    fn ok_or_not_found(self, message: &str) -> Result<T>;
    fn ok_or_error(self, code: ErrorCode, message: &str) -> Result<T>;
}

impl<T> OptionExt<T> for Option<T> {
    fn ok_or_not_found(self, message: &str) -> Result<T> {
        self.ok_or_else(|| Error::not_found(message))
    }

    fn ok_or_error(self, code: ErrorCode, message: &str) -> Result<T> {
        self.ok_or_else(|| Error::new(code, message))
    }
}

/// Helper macro for quick error creation
#[macro_export]
macro_rules! err {
    ($msg:expr) => {
        $crate::error::Error::generic($msg)
    };
    ($code:expr, $msg:expr) => {
        $crate::error::Error::new($code, $msg)
    };
    ($code:expr, $msg:expr, $details:expr) => {
        $crate::error::Error::with_details($code, $msg, $details)
    };
}

/// Helper macro for quick Result::Err creation
#[macro_export]
macro_rules! bail {
    ($msg:expr) => {
        return Err($crate::error::Error::generic($msg))
    };
    ($code:expr, $msg:expr) => {
        return Err($crate::error::Error::new($code, $msg))
    };
}

/// Try to execute something, converting errors
pub fn try_catch<T, F>(f: F) -> Result<T>
where
    F: FnOnce() -> Result<T> + std::panic::UnwindSafe,
{
    match std::panic::catch_unwind(f) {
        Ok(result) => result,
        Err(_) => Err(Error::internal("Operation panicked")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = Error::not_found("File not found");
        assert_eq!(err.code, ErrorCode::NotFound);
        assert_eq!(err.to_http_status(), 404);
    }

    #[test]
    fn test_error_display() {
        let err = Error::validation("Invalid input");
        let display = format!("{}", err);
        assert!(display.contains("VALIDATION"));
        assert!(display.contains("Invalid input"));
    }

    #[test]
    fn test_result_ext() {
        let result: std::result::Result<i32, &str> = Err("original error");
        let converted = result.context("Failed to process");
        assert!(converted.is_err());
    }

    #[test]
    fn test_option_ext() {
        let opt: Option<i32> = None;
        let result = opt.ok_or_not_found("Item not found");
        assert!(result.is_err());
        if let Err(e) = result {
            assert_eq!(e.code, ErrorCode::NotFound);
        }
    }
}
