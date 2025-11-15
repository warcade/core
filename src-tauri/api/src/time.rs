//! Time utilities module
//!
//! Provides convenient wrappers around chrono for common time operations.
//!
//! # Examples
//!
//! ```rust
//! use webarcade_api::time;
//!
//! // Get current Unix timestamp
//! let now = time::timestamp();
//!
//! // Format current time
//! let formatted = time::format_now("%Y-%m-%d %H:%M:%S");
//! ```

pub use chrono;

/// Get the current Unix timestamp in seconds
///
/// # Examples
/// ```rust
/// let now = time::timestamp();
/// println!("Current timestamp: {}", now);
/// ```
pub fn timestamp() -> i64 {
    chrono::Utc::now().timestamp()
}

/// Get the current Unix timestamp in milliseconds
///
/// # Examples
/// ```rust
/// let now_ms = time::timestamp_millis();
/// ```
pub fn timestamp_millis() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

/// Get the current DateTime<Utc>
///
/// # Examples
/// ```rust
/// let now = time::now();
/// println!("Year: {}", now.year());
/// ```
pub fn now() -> chrono::DateTime<chrono::Utc> {
    chrono::Utc::now()
}

/// Format the current time with a custom format string
///
/// # Arguments
/// * `fmt` - Format string (see [chrono format docs](https://docs.rs/chrono/latest/chrono/format/strftime/index.html))
///
/// # Examples
/// ```rust
/// let date = time::format_now("%Y-%m-%d");
/// let datetime = time::format_now("%Y-%m-%d %H:%M:%S");
/// let iso = time::format_now("%+"); // ISO 8601
/// ```
pub fn format_now(fmt: &str) -> String {
    chrono::Utc::now().format(fmt).to_string()
}

/// Format a DateTime with a custom format string
///
/// # Examples
/// ```rust
/// let dt = chrono::DateTime::parse_from_rfc3339("2024-01-01T00:00:00Z").unwrap();
/// let formatted = time::format(&dt, "%Y-%m-%d");
/// ```
pub fn format<Tz: chrono::TimeZone>(dt: &chrono::DateTime<Tz>, fmt: &str) -> String
where
    Tz::Offset: std::fmt::Display,
{
    dt.format(fmt).to_string()
}

/// Parse an RFC 3339 / ISO 8601 datetime string
///
/// # Examples
/// ```rust
/// let dt = time::parse_rfc3339("2024-01-01T12:00:00Z")?;
/// ```
pub fn parse_rfc3339(s: &str) -> Result<chrono::DateTime<chrono::FixedOffset>, chrono::ParseError> {
    chrono::DateTime::parse_from_rfc3339(s)
}

/// Parse a datetime string with a custom format
///
/// # Examples
/// ```rust
/// let dt = time::parse("2024-01-01 12:00:00", "%Y-%m-%d %H:%M:%S")?;
/// ```
pub fn parse(s: &str, fmt: &str) -> Result<chrono::NaiveDateTime, chrono::ParseError> {
    chrono::NaiveDateTime::parse_from_str(s, fmt)
}

/// Convert Unix timestamp (seconds) to DateTime
///
/// # Examples
/// ```rust
/// let dt = time::from_timestamp(1704110400);
/// ```
pub fn from_timestamp(timestamp: i64) -> Option<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::from_timestamp(timestamp, 0)
}

/// Convert Unix timestamp (milliseconds) to DateTime
///
/// # Examples
/// ```rust
/// let dt = time::from_timestamp_millis(1704110400000);
/// ```
pub fn from_timestamp_millis(timestamp_millis: i64) -> Option<chrono::DateTime<chrono::Utc>> {
    chrono::DateTime::from_timestamp_millis(timestamp_millis)
}
