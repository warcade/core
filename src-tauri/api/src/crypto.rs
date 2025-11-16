//! Cryptographic utilities - Hashing, random generation, UUIDs
//!
//! Provides FFI-safe cryptographic operations.

use serde::{Serialize, Deserialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

/// Hashing algorithms
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HashAlgorithm {
    /// Simple hash (fast, not cryptographic)
    Simple,
    /// FNV-1a hash (fast, good distribution)
    Fnv1a,
}

/// Hash utilities
pub struct Hashing;

impl Hashing {
    /// Compute a simple hash of bytes (not cryptographic)
    pub fn simple(data: &[u8]) -> u64 {
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        hasher.finish()
    }

    /// Compute FNV-1a hash (good for hash tables)
    pub fn fnv1a(data: &[u8]) -> u64 {
        const FNV_OFFSET: u64 = 14695981039346656037;
        const FNV_PRIME: u64 = 1099511628211;

        let mut hash = FNV_OFFSET;
        for byte in data {
            hash ^= *byte as u64;
            hash = hash.wrapping_mul(FNV_PRIME);
        }
        hash
    }

    /// Compute hash of string
    pub fn hash_string(s: &str) -> u64 {
        Self::simple(s.as_bytes())
    }

    /// Compute hash as hex string
    pub fn hash_hex(data: &[u8]) -> String {
        format!("{:016x}", Self::simple(data))
    }

    /// Simple checksum (sum of all bytes)
    pub fn checksum(data: &[u8]) -> u32 {
        data.iter().fold(0u32, |acc, &b| acc.wrapping_add(b as u32))
    }

    /// CRC32-like checksum (polynomial based)
    pub fn crc32_simple(data: &[u8]) -> u32 {
        let mut crc: u32 = 0xFFFFFFFF;
        for byte in data {
            crc ^= *byte as u32;
            for _ in 0..8 {
                if crc & 1 != 0 {
                    crc = (crc >> 1) ^ 0xEDB88320;
                } else {
                    crc >>= 1;
                }
            }
        }
        !crc
    }
}

/// Random number generation utilities
pub struct Random;

impl Random {
    /// Generate random bytes
    pub fn bytes(len: usize) -> Vec<u8> {
        use rand::RngCore;
        let mut rng = rand::thread_rng();
        let mut bytes = vec![0u8; len];
        rng.fill_bytes(&mut bytes);
        bytes
    }

    /// Generate random u32
    pub fn u32() -> u32 {
        use rand::Rng;
        rand::thread_rng().gen()
    }

    /// Generate random u64
    pub fn u64() -> u64 {
        use rand::Rng;
        rand::thread_rng().gen()
    }

    /// Generate random u32 in range [min, max)
    pub fn u32_range(min: u32, max: u32) -> u32 {
        use rand::Rng;
        rand::thread_rng().gen_range(min..max)
    }

    /// Generate random u64 in range [min, max)
    pub fn u64_range(min: u64, max: u64) -> u64 {
        use rand::Rng;
        rand::thread_rng().gen_range(min..max)
    }

    /// Generate random f64 in range [0.0, 1.0)
    pub fn f64() -> f64 {
        use rand::Rng;
        rand::thread_rng().gen()
    }

    /// Generate random f64 in range [min, max)
    pub fn f64_range(min: f64, max: f64) -> f64 {
        use rand::Rng;
        rand::thread_rng().gen_range(min..max)
    }

    /// Generate random boolean
    pub fn bool() -> bool {
        use rand::Rng;
        rand::thread_rng().gen()
    }

    /// Generate random boolean with probability
    pub fn bool_with_probability(p: f64) -> bool {
        use rand::Rng;
        rand::thread_rng().gen_bool(p.clamp(0.0, 1.0))
    }

    /// Generate random alphanumeric string
    pub fn string(len: usize) -> String {
        use rand::Rng;
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let mut rng = rand::thread_rng();
        (0..len)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect()
    }

    /// Generate random hex string
    pub fn hex_string(len: usize) -> String {
        let bytes = Self::bytes((len + 1) / 2);
        let hex: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
        hex[..len].to_string()
    }

    /// Shuffle a vector in place
    pub fn shuffle<T>(vec: &mut Vec<T>) {
        use rand::seq::SliceRandom;
        vec.shuffle(&mut rand::thread_rng());
    }

    /// Pick a random element from a slice
    pub fn choose<T>(slice: &[T]) -> Option<&T> {
        use rand::seq::SliceRandom;
        slice.choose(&mut rand::thread_rng())
    }

    /// Pick n random elements from a slice
    pub fn choose_multiple<T>(slice: &[T], n: usize) -> Vec<&T> {
        use rand::seq::SliceRandom;
        slice
            .choose_multiple(&mut rand::thread_rng(), n)
            .collect()
    }
}

/// UUID generation and utilities
pub struct Uuid;

impl Uuid {
    /// Generate a new random UUID v4
    pub fn v4() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    /// Generate a new UUID v4 without hyphens
    pub fn v4_simple() -> String {
        uuid::Uuid::new_v4().simple().to_string()
    }

    /// Parse a UUID string
    pub fn parse(s: &str) -> Result<String, String> {
        uuid::Uuid::parse_str(s)
            .map(|u| u.to_string())
            .map_err(|e| format!("Invalid UUID: {}", e))
    }

    /// Check if string is a valid UUID
    pub fn is_valid(s: &str) -> bool {
        uuid::Uuid::parse_str(s).is_ok()
    }

    /// Generate a nil UUID (all zeros)
    pub fn nil() -> String {
        uuid::Uuid::nil().to_string()
    }
}

/// Token generation utilities
pub struct Token;

impl Token {
    /// Generate a secure random token (hex)
    pub fn hex(bytes: usize) -> String {
        Random::hex_string(bytes * 2)
    }

    /// Generate a secure random token (base64)
    pub fn base64(bytes: usize) -> String {
        use crate::encoding::Base64;
        Base64::encode(&Random::bytes(bytes))
    }

    /// Generate a secure random token (URL-safe base64)
    pub fn base64_url_safe(bytes: usize) -> String {
        use crate::encoding::Base64;
        Base64::encode_url_safe(&Random::bytes(bytes))
    }

    /// Generate an API key style token
    pub fn api_key() -> String {
        format!("wa_{}", Random::hex_string(32))
    }

    /// Generate a session token
    pub fn session() -> String {
        format!("sess_{}", Random::hex_string(48))
    }

    /// Generate a short token (for verification codes, etc.)
    pub fn short() -> String {
        Random::string(8).to_uppercase()
    }

    /// Generate a numeric code (for OTP, etc.)
    pub fn numeric(digits: usize) -> String {
        let max = 10u64.pow(digits as u32);
        let num = Random::u64_range(0, max);
        format!("{:0width$}", num, width = digits)
    }
}

/// Simple XOR cipher (not secure, for basic obfuscation only)
pub struct XorCipher;

impl XorCipher {
    /// XOR encrypt/decrypt data with a key (symmetric)
    pub fn apply(data: &[u8], key: &[u8]) -> Vec<u8> {
        if key.is_empty() {
            return data.to_vec();
        }
        data.iter()
            .enumerate()
            .map(|(i, b)| b ^ key[i % key.len()])
            .collect()
    }

    /// XOR encrypt and encode to base64
    pub fn encrypt_to_base64(data: &[u8], key: &[u8]) -> String {
        use crate::encoding::Base64;
        let encrypted = Self::apply(data, key);
        Base64::encode(&encrypted)
    }

    /// Decode from base64 and XOR decrypt
    pub fn decrypt_from_base64(encoded: &str, key: &[u8]) -> Result<Vec<u8>, String> {
        use crate::encoding::Base64;
        let encrypted = Base64::decode(encoded)?;
        Ok(Self::apply(&encrypted, key))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hashing() {
        let data = b"Hello, World!";
        let hash1 = Hashing::simple(data);
        let hash2 = Hashing::simple(data);
        assert_eq!(hash1, hash2);

        let hash3 = Hashing::fnv1a(data);
        assert_ne!(hash1, hash3); // Different algorithms
    }

    #[test]
    fn test_random() {
        let bytes = Random::bytes(16);
        assert_eq!(bytes.len(), 16);

        let s = Random::string(10);
        assert_eq!(s.len(), 10);

        let hex = Random::hex_string(8);
        assert_eq!(hex.len(), 8);
    }

    #[test]
    fn test_uuid() {
        let uuid = Uuid::v4();
        assert!(Uuid::is_valid(&uuid));
        assert_eq!(uuid.len(), 36); // Standard UUID format with hyphens

        let simple = Uuid::v4_simple();
        assert_eq!(simple.len(), 32); // Without hyphens
    }

    #[test]
    fn test_token() {
        let api_key = Token::api_key();
        assert!(api_key.starts_with("wa_"));

        let numeric = Token::numeric(6);
        assert_eq!(numeric.len(), 6);
        assert!(numeric.chars().all(|c| c.is_ascii_digit()));
    }

    #[test]
    fn test_xor_cipher() {
        let data = b"Secret message";
        let key = b"mykey";
        let encrypted = XorCipher::apply(data, key);
        let decrypted = XorCipher::apply(&encrypted, key);
        assert_eq!(decrypted, data);
    }
}
