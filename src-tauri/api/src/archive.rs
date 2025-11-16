//! Archive and compression utilities
//!
//! Provides FFI-safe archive operations (zip, etc.)

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::Path;

/// Archive entry information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub compressed_size: u64,
    pub is_file: bool,
    pub is_dir: bool,
}

/// In-memory archive builder
#[derive(Debug)]
pub struct ArchiveBuilder {
    entries: HashMap<String, Vec<u8>>,
}

impl ArchiveBuilder {
    /// Create a new archive builder
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    /// Add a file from bytes
    pub fn add_bytes(&mut self, path: &str, data: Vec<u8>) -> &mut Self {
        self.entries.insert(path.to_string(), data);
        self
    }

    /// Add a file from string
    pub fn add_string(&mut self, path: &str, content: &str) -> &mut Self {
        self.entries
            .insert(path.to_string(), content.as_bytes().to_vec());
        self
    }

    /// Add a file from disk
    pub fn add_file(&mut self, archive_path: &str, disk_path: &str) -> Result<&mut Self, String> {
        let data = crate::fs::Fs::read_bytes(disk_path)?;
        self.entries.insert(archive_path.to_string(), data);
        Ok(self)
    }

    /// Add a directory from disk (recursively)
    pub fn add_dir(&mut self, archive_prefix: &str, disk_path: &str) -> Result<&mut Self, String> {
        let entries = crate::fs::Fs::list_dir(disk_path)?;

        for entry_path in entries {
            let file_name = Path::new(&entry_path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let archive_path = if archive_prefix.is_empty() {
                file_name.clone()
            } else {
                format!("{}/{}", archive_prefix.trim_end_matches('/'), file_name)
            };

            if crate::fs::Fs::is_file(&entry_path) {
                self.add_file(&archive_path, &entry_path)?;
            } else if crate::fs::Fs::is_dir(&entry_path) {
                self.add_dir(&archive_path, &entry_path)?;
            }
        }

        Ok(self)
    }

    /// Get number of entries
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get all entry paths
    pub fn paths(&self) -> Vec<String> {
        self.entries.keys().cloned().collect()
    }

    /// Build as ZIP file (bytes)
    pub fn build_zip(&self) -> Result<Vec<u8>, String> {
        use std::io::Cursor;
        use zip::write::SimpleFileOptions;
        use zip::ZipWriter;

        let buffer = Cursor::new(Vec::new());
        let mut zip = ZipWriter::new(buffer);
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

        for (path, data) in &self.entries {
            zip.start_file(path, options)
                .map_err(|e| format!("Failed to add file to ZIP: {}", e))?;
            zip.write_all(data)
                .map_err(|e| format!("Failed to write to ZIP: {}", e))?;
        }

        let result = zip
            .finish()
            .map_err(|e| format!("Failed to finish ZIP: {}", e))?;

        Ok(result.into_inner())
    }

    /// Build as ZIP file and save to disk
    pub fn save_zip(&self, path: &str) -> Result<(), String> {
        let bytes = self.build_zip()?;
        crate::fs::Fs::write_bytes(path, &bytes)
    }
}

impl Default for ArchiveBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// ZIP archive reader
pub struct ZipReader {
    entries: HashMap<String, Vec<u8>>,
}

impl ZipReader {
    /// Open a ZIP file from bytes
    pub fn from_bytes(data: &[u8]) -> Result<Self, String> {
        use std::io::Cursor;
        use zip::ZipArchive;

        let reader = Cursor::new(data);
        let mut archive =
            ZipArchive::new(reader).map_err(|e| format!("Failed to open ZIP: {}", e))?;

        let mut entries = HashMap::new();

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Failed to read ZIP entry: {}", e))?;

            if !file.is_dir() {
                let name = file.name().to_string();
                let mut contents = Vec::new();
                file.read_to_end(&mut contents)
                    .map_err(|e| format!("Failed to read file from ZIP: {}", e))?;
                entries.insert(name, contents);
            }
        }

        Ok(Self { entries })
    }

    /// Open a ZIP file from disk
    pub fn open(path: &str) -> Result<Self, String> {
        let data = crate::fs::Fs::read_bytes(path)?;
        Self::from_bytes(&data)
    }

    /// Get a file from the archive
    pub fn get(&self, path: &str) -> Option<&Vec<u8>> {
        self.entries.get(path)
    }

    /// Get a file as string
    pub fn get_string(&self, path: &str) -> Result<String, String> {
        let data = self.get(path).ok_or_else(|| format!("File not found: {}", path))?;
        String::from_utf8(data.clone()).map_err(|e| format!("Invalid UTF-8: {}", e))
    }

    /// Check if file exists in archive
    pub fn contains(&self, path: &str) -> bool {
        self.entries.contains_key(path)
    }

    /// Get all file paths
    pub fn paths(&self) -> Vec<String> {
        self.entries.keys().cloned().collect()
    }

    /// Get number of files
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Extract all files to a directory
    pub fn extract_all(&self, dest_dir: &str) -> Result<(), String> {
        crate::fs::Fs::ensure_dir(dest_dir)?;

        for (path, data) in &self.entries {
            let full_path = crate::path::Path::join(dest_dir, &[path]);

            // Ensure parent directory exists
            if let Some(parent) = crate::path::Path::parent(&full_path) {
                crate::fs::Fs::ensure_dir(&parent)?;
            }

            crate::fs::Fs::write_bytes(&full_path, data)?;
        }

        Ok(())
    }

    /// Extract a single file
    pub fn extract_file(&self, archive_path: &str, dest_path: &str) -> Result<(), String> {
        let data = self
            .get(archive_path)
            .ok_or_else(|| format!("File not found in archive: {}", archive_path))?;

        // Ensure parent directory exists
        if let Some(parent) = crate::path::Path::parent(dest_path) {
            crate::fs::Fs::ensure_dir(&parent)?;
        }

        crate::fs::Fs::write_bytes(dest_path, data)
    }
}

/// Simple compression utilities (without external crates, basic algorithms)
pub struct Compress;

impl Compress {
    /// Run-length encoding compression
    pub fn rle_encode(data: &[u8]) -> Vec<u8> {
        if data.is_empty() {
            return Vec::new();
        }

        let mut result = Vec::new();
        let mut current = data[0];
        let mut count: u8 = 1;

        for &byte in &data[1..] {
            if byte == current && count < 255 {
                count += 1;
            } else {
                result.push(count);
                result.push(current);
                current = byte;
                count = 1;
            }
        }

        result.push(count);
        result.push(current);

        result
    }

    /// Run-length encoding decompression
    pub fn rle_decode(data: &[u8]) -> Result<Vec<u8>, String> {
        if data.len() % 2 != 0 {
            return Err("Invalid RLE data: odd length".to_string());
        }

        let mut result = Vec::new();

        for chunk in data.chunks(2) {
            let count = chunk[0] as usize;
            let byte = chunk[1];
            result.extend(std::iter::repeat(byte).take(count));
        }

        Ok(result)
    }

    /// Simple byte-level delta encoding
    pub fn delta_encode(data: &[u8]) -> Vec<u8> {
        if data.is_empty() {
            return Vec::new();
        }

        let mut result = vec![data[0]];
        for i in 1..data.len() {
            let delta = data[i].wrapping_sub(data[i - 1]);
            result.push(delta);
        }
        result
    }

    /// Delta decoding
    pub fn delta_decode(data: &[u8]) -> Vec<u8> {
        if data.is_empty() {
            return Vec::new();
        }

        let mut result = vec![data[0]];
        let mut prev = data[0];

        for &delta in &data[1..] {
            let value = prev.wrapping_add(delta);
            result.push(value);
            prev = value;
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_builder() {
        let mut builder = ArchiveBuilder::new();
        builder.add_string("test.txt", "Hello, World!");
        builder.add_bytes("data.bin", vec![1, 2, 3, 4, 5]);

        assert_eq!(builder.len(), 2);
        assert!(builder.paths().contains(&"test.txt".to_string()));
    }

    #[test]
    fn test_rle_compression() {
        let data = vec![1, 1, 1, 2, 2, 3];
        let compressed = Compress::rle_encode(&data);
        let decompressed = Compress::rle_decode(&compressed).unwrap();
        assert_eq!(data, decompressed);
    }

    #[test]
    fn test_delta_encoding() {
        let data = vec![10, 12, 15, 14, 20];
        let encoded = Compress::delta_encode(&data);
        let decoded = Compress::delta_decode(&encoded);
        assert_eq!(data, decoded);
    }
}
