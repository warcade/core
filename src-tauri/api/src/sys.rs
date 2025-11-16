//! System information utilities
//!
//! Provides FFI-safe system information operations.

use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// System information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub platform: String,
    pub hostname: String,
    pub username: String,
    pub home_dir: String,
    pub temp_dir: String,
    pub current_dir: String,
}

/// System utilities
pub struct Sys;

impl Sys {
    /// Get comprehensive system information
    pub fn info() -> SystemInfo {
        SystemInfo {
            os: Self::os_name(),
            arch: Self::arch(),
            platform: Self::platform(),
            hostname: Self::hostname().unwrap_or_else(|| "unknown".to_string()),
            username: Self::username().unwrap_or_else(|| "unknown".to_string()),
            home_dir: Self::home_dir().unwrap_or_else(|| "unknown".to_string()),
            temp_dir: Self::temp_dir(),
            current_dir: Self::current_dir().unwrap_or_else(|_| "unknown".to_string()),
        }
    }

    /// Get operating system name
    pub fn os_name() -> String {
        if cfg!(windows) {
            "Windows".to_string()
        } else if cfg!(target_os = "macos") {
            "macOS".to_string()
        } else if cfg!(target_os = "linux") {
            "Linux".to_string()
        } else {
            "Unknown".to_string()
        }
    }

    /// Get architecture
    pub fn arch() -> String {
        if cfg!(target_arch = "x86_64") {
            "x86_64".to_string()
        } else if cfg!(target_arch = "aarch64") {
            "aarch64".to_string()
        } else if cfg!(target_arch = "x86") {
            "x86".to_string()
        } else {
            "unknown".to_string()
        }
    }

    /// Get platform string
    pub fn platform() -> String {
        format!("{}-{}", Self::os_name().to_lowercase(), Self::arch())
    }

    /// Get hostname
    pub fn hostname() -> Option<String> {
        // Try environment variable first
        std::env::var("COMPUTERNAME")
            .ok()
            .or_else(|| std::env::var("HOSTNAME").ok())
            .or_else(|| std::env::var("HOST").ok())
    }

    /// Get username
    pub fn username() -> Option<String> {
        std::env::var("USER")
            .ok()
            .or_else(|| std::env::var("USERNAME").ok())
            .or_else(|| std::env::var("LOGNAME").ok())
    }

    /// Get home directory
    pub fn home_dir() -> Option<String> {
        dirs::home_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get temporary directory
    pub fn temp_dir() -> String {
        std::env::temp_dir().to_string_lossy().to_string()
    }

    /// Get current working directory
    pub fn current_dir() -> Result<String, String> {
        std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current directory: {}", e))
    }

    /// Get current Unix timestamp (seconds)
    pub fn timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    /// Get current Unix timestamp (milliseconds)
    pub fn timestamp_millis() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    }

    /// Get current Unix timestamp (microseconds)
    pub fn timestamp_micros() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros()
    }

    /// Get current Unix timestamp (nanoseconds)
    pub fn timestamp_nanos() -> u128 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    }

    /// Sleep for specified milliseconds
    pub fn sleep_millis(ms: u64) {
        std::thread::sleep(std::time::Duration::from_millis(ms));
    }

    /// Sleep for specified seconds
    pub fn sleep_secs(secs: u64) {
        std::thread::sleep(std::time::Duration::from_secs(secs));
    }

    /// Get number of CPU cores
    pub fn num_cpus() -> usize {
        std::thread::available_parallelism()
            .map(|n| n.get())
            .unwrap_or(1)
    }

    /// Check if running on Windows
    pub fn is_windows() -> bool {
        cfg!(windows)
    }

    /// Check if running on macOS
    pub fn is_macos() -> bool {
        cfg!(target_os = "macos")
    }

    /// Check if running on Linux
    pub fn is_linux() -> bool {
        cfg!(target_os = "linux")
    }

    /// Check if running in debug mode
    pub fn is_debug() -> bool {
        cfg!(debug_assertions)
    }

    /// Check if running in release mode
    pub fn is_release() -> bool {
        !cfg!(debug_assertions)
    }

    /// Get pointer size (32 or 64 bit)
    pub fn pointer_size() -> usize {
        std::mem::size_of::<usize>() * 8
    }

    /// Get endianness
    pub fn endianness() -> String {
        if cfg!(target_endian = "little") {
            "little".to_string()
        } else {
            "big".to_string()
        }
    }

    /// Get Rust version (compile time)
    pub fn rust_version() -> String {
        env!("CARGO_PKG_RUST_VERSION", "unknown").to_string()
    }

    /// Get package version
    pub fn package_version() -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }

    /// Get package name
    pub fn package_name() -> String {
        env!("CARGO_PKG_NAME").to_string()
    }
}

/// Process ID operations
pub struct Process;

impl Process {
    /// Get current process ID
    pub fn id() -> u32 {
        std::process::id()
    }

    /// Exit process with code
    pub fn exit(code: i32) -> ! {
        std::process::exit(code)
    }

    /// Abort process immediately
    pub fn abort() -> ! {
        std::process::abort()
    }
}

/// Performance timing utilities
pub struct Timing;

impl Timing {
    /// Get high-precision timestamp for measuring elapsed time
    pub fn now() -> std::time::Instant {
        std::time::Instant::now()
    }

    /// Measure elapsed time in milliseconds
    pub fn elapsed_millis(start: std::time::Instant) -> u128 {
        start.elapsed().as_millis()
    }

    /// Measure elapsed time in microseconds
    pub fn elapsed_micros(start: std::time::Instant) -> u128 {
        start.elapsed().as_micros()
    }

    /// Measure elapsed time in nanoseconds
    pub fn elapsed_nanos(start: std::time::Instant) -> u128 {
        start.elapsed().as_nanos()
    }

    /// Measure elapsed time in seconds (floating point)
    pub fn elapsed_secs(start: std::time::Instant) -> f64 {
        start.elapsed().as_secs_f64()
    }
}

/// Simple stopwatch for timing operations
#[derive(Debug, Clone)]
pub struct Stopwatch {
    start: std::time::Instant,
    laps: Vec<u128>,
}

impl Stopwatch {
    /// Create and start a new stopwatch
    pub fn start() -> Self {
        Self {
            start: std::time::Instant::now(),
            laps: Vec::new(),
        }
    }

    /// Record a lap time (in milliseconds)
    pub fn lap(&mut self) -> u128 {
        let elapsed = self.start.elapsed().as_millis();
        self.laps.push(elapsed);
        elapsed
    }

    /// Get total elapsed time in milliseconds
    pub fn elapsed_millis(&self) -> u128 {
        self.start.elapsed().as_millis()
    }

    /// Get total elapsed time in seconds
    pub fn elapsed_secs(&self) -> f64 {
        self.start.elapsed().as_secs_f64()
    }

    /// Get all lap times
    pub fn laps(&self) -> &Vec<u128> {
        &self.laps
    }

    /// Get number of laps
    pub fn lap_count(&self) -> usize {
        self.laps.len()
    }

    /// Reset the stopwatch
    pub fn reset(&mut self) {
        self.start = std::time::Instant::now();
        self.laps.clear();
    }
}

/// Rate limiter for controlling operation frequency
#[derive(Debug)]
pub struct RateLimiter {
    max_ops: u32,
    window_ms: u64,
    operations: Vec<u64>,
}

impl RateLimiter {
    /// Create a new rate limiter
    /// max_ops: maximum number of operations allowed in the window
    /// window_ms: time window in milliseconds
    pub fn new(max_ops: u32, window_ms: u64) -> Self {
        Self {
            max_ops,
            window_ms,
            operations: Vec::new(),
        }
    }

    /// Check if operation is allowed (and record it if so)
    pub fn allow(&mut self) -> bool {
        let now = Sys::timestamp_millis() as u64;
        let window_start = now.saturating_sub(self.window_ms);

        // Remove old operations outside the window
        self.operations.retain(|&t| t > window_start);

        // Check if we can allow a new operation
        if (self.operations.len() as u32) < self.max_ops {
            self.operations.push(now);
            true
        } else {
            false
        }
    }

    /// Get remaining operations allowed in current window
    pub fn remaining(&mut self) -> u32 {
        let now = Sys::timestamp_millis() as u64;
        let window_start = now.saturating_sub(self.window_ms);
        self.operations.retain(|&t| t > window_start);

        self.max_ops.saturating_sub(self.operations.len() as u32)
    }

    /// Reset the rate limiter
    pub fn reset(&mut self) {
        self.operations.clear();
    }

    /// Get time until next operation is allowed (in ms), or 0 if allowed now
    pub fn time_until_allowed(&mut self) -> u64 {
        if self.remaining() > 0 {
            return 0;
        }

        let now = Sys::timestamp_millis() as u64;
        let window_start = now.saturating_sub(self.window_ms);
        self.operations.retain(|&t| t > window_start);

        if let Some(&oldest) = self.operations.first() {
            (oldest + self.window_ms).saturating_sub(now)
        } else {
            0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_info() {
        let info = Sys::info();
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
    }

    #[test]
    fn test_timestamp() {
        let ts1 = Sys::timestamp();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let ts2 = Sys::timestamp();
        assert!(ts2 >= ts1);
    }

    #[test]
    fn test_stopwatch() {
        let mut sw = Stopwatch::start();
        std::thread::sleep(std::time::Duration::from_millis(10));
        let lap1 = sw.lap();
        assert!(lap1 >= 10);
        assert_eq!(sw.lap_count(), 1);
    }

    #[test]
    fn test_rate_limiter() {
        let mut limiter = RateLimiter::new(2, 1000);
        assert!(limiter.allow()); // 1st
        assert!(limiter.allow()); // 2nd
        assert!(!limiter.allow()); // 3rd - denied
        assert_eq!(limiter.remaining(), 0);
    }
}
