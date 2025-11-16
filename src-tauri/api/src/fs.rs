//! File system utilities
//!
//! Provides FFI-safe file system operations.

use serde::{Serialize, Deserialize};
use std::fs as std_fs;
use std::io::{Read, Write};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// File metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_file: bool,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub created: Option<u64>,
    pub modified: Option<u64>,
    pub accessed: Option<u64>,
    pub readonly: bool,
}

/// File system operations
pub struct Fs;

impl Fs {
    /// Read entire file as bytes
    pub fn read_bytes(path: &str) -> Result<Vec<u8>, String> {
        std_fs::read(path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
    }

    /// Read entire file as string
    pub fn read_string(path: &str) -> Result<String, String> {
        std_fs::read_to_string(path)
            .map_err(|e| format!("Failed to read file '{}': {}", path, e))
    }

    /// Read file as lines
    pub fn read_lines(path: &str) -> Result<Vec<String>, String> {
        let content = Self::read_string(path)?;
        Ok(content.lines().map(|s| s.to_string()).collect())
    }

    /// Write bytes to file
    pub fn write_bytes(path: &str, data: &[u8]) -> Result<(), String> {
        std_fs::write(path, data).map_err(|e| format!("Failed to write file '{}': {}", path, e))
    }

    /// Write string to file
    pub fn write_string(path: &str, content: &str) -> Result<(), String> {
        std_fs::write(path, content)
            .map_err(|e| format!("Failed to write file '{}': {}", path, e))
    }

    /// Append bytes to file
    pub fn append_bytes(path: &str, data: &[u8]) -> Result<(), String> {
        let mut file = std_fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| format!("Failed to open file '{}': {}", path, e))?;

        file.write_all(data)
            .map_err(|e| format!("Failed to append to file '{}': {}", path, e))
    }

    /// Append string to file
    pub fn append_string(path: &str, content: &str) -> Result<(), String> {
        Self::append_bytes(path, content.as_bytes())
    }

    /// Check if path exists
    pub fn exists(path: &str) -> bool {
        Path::new(path).exists()
    }

    /// Check if path is a file
    pub fn is_file(path: &str) -> bool {
        Path::new(path).is_file()
    }

    /// Check if path is a directory
    pub fn is_dir(path: &str) -> bool {
        Path::new(path).is_dir()
    }

    /// Create directory (single level)
    pub fn create_dir(path: &str) -> Result<(), String> {
        std_fs::create_dir(path)
            .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
    }

    /// Create directory and all parent directories
    pub fn create_dir_all(path: &str) -> Result<(), String> {
        std_fs::create_dir_all(path)
            .map_err(|e| format!("Failed to create directories '{}': {}", path, e))
    }

    /// Remove file
    pub fn remove_file(path: &str) -> Result<(), String> {
        std_fs::remove_file(path)
            .map_err(|e| format!("Failed to remove file '{}': {}", path, e))
    }

    /// Remove directory (must be empty)
    pub fn remove_dir(path: &str) -> Result<(), String> {
        std_fs::remove_dir(path)
            .map_err(|e| format!("Failed to remove directory '{}': {}", path, e))
    }

    /// Remove directory and all contents
    pub fn remove_dir_all(path: &str) -> Result<(), String> {
        std_fs::remove_dir_all(path).map_err(|e| {
            format!(
                "Failed to remove directory and contents '{}': {}",
                path, e
            )
        })
    }

    /// Copy file
    pub fn copy_file(from: &str, to: &str) -> Result<u64, String> {
        std_fs::copy(from, to).map_err(|e| format!("Failed to copy '{}' to '{}': {}", from, to, e))
    }

    /// Move/rename file or directory
    pub fn rename(from: &str, to: &str) -> Result<(), String> {
        std_fs::rename(from, to)
            .map_err(|e| format!("Failed to rename '{}' to '{}': {}", from, to, e))
    }

    /// Get file metadata
    pub fn metadata(path: &str) -> Result<FileInfo, String> {
        let meta = std_fs::metadata(path)
            .map_err(|e| format!("Failed to get metadata for '{}': {}", path, e))?;

        let path_obj = Path::new(path);
        let name = path_obj
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let to_unix_time = |time: SystemTime| -> Option<u64> {
            time.duration_since(UNIX_EPOCH).ok().map(|d| d.as_secs())
        };

        Ok(FileInfo {
            path: path.to_string(),
            name,
            size: meta.len(),
            is_file: meta.is_file(),
            is_dir: meta.is_dir(),
            is_symlink: meta.file_type().is_symlink(),
            created: meta.created().ok().and_then(to_unix_time),
            modified: meta.modified().ok().and_then(to_unix_time),
            accessed: meta.accessed().ok().and_then(to_unix_time),
            readonly: meta.permissions().readonly(),
        })
    }

    /// Get file size in bytes
    pub fn size(path: &str) -> Result<u64, String> {
        std_fs::metadata(path)
            .map(|m| m.len())
            .map_err(|e| format!("Failed to get size of '{}': {}", path, e))
    }

    /// List directory contents
    pub fn list_dir(path: &str) -> Result<Vec<String>, String> {
        let entries = std_fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

        let mut result = Vec::new();
        for entry in entries {
            if let Ok(entry) = entry {
                result.push(entry.path().to_string_lossy().to_string());
            }
        }
        Ok(result)
    }

    /// List directory with metadata
    pub fn list_dir_info(path: &str) -> Result<Vec<FileInfo>, String> {
        let entries = std_fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

        let mut result = Vec::new();
        for entry in entries {
            if let Ok(entry) = entry {
                let path_str = entry.path().to_string_lossy().to_string();
                if let Ok(info) = Self::metadata(&path_str) {
                    result.push(info);
                }
            }
        }
        Ok(result)
    }

    /// List files only (no directories)
    pub fn list_files(path: &str) -> Result<Vec<String>, String> {
        let entries = Self::list_dir(path)?;
        Ok(entries
            .into_iter()
            .filter(|p| Path::new(p).is_file())
            .collect())
    }

    /// List directories only (no files)
    pub fn list_dirs(path: &str) -> Result<Vec<String>, String> {
        let entries = Self::list_dir(path)?;
        Ok(entries
            .into_iter()
            .filter(|p| Path::new(p).is_dir())
            .collect())
    }

    /// Find files matching a pattern (simple glob)
    pub fn find_files(dir: &str, pattern: &str) -> Result<Vec<String>, String> {
        let entries = Self::list_files(dir)?;

        // Simple pattern matching (* as wildcard)
        let pattern_parts: Vec<&str> = pattern.split('*').collect();

        Ok(entries
            .into_iter()
            .filter(|path| {
                let file_name = Path::new(path)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                if pattern_parts.len() == 1 {
                    // No wildcards
                    file_name == pattern
                } else {
                    // Has wildcards
                    let mut pos = 0;
                    for (i, part) in pattern_parts.iter().enumerate() {
                        if part.is_empty() {
                            continue;
                        }
                        if let Some(found_pos) = file_name[pos..].find(part) {
                            if i == 0 && found_pos != 0 {
                                return false; // Must start with first part
                            }
                            pos += found_pos + part.len();
                        } else {
                            return false;
                        }
                    }
                    // If pattern ends with *, any ending is fine
                    // If not, must be at end
                    pattern.ends_with('*') || pos == file_name.len()
                }
            })
            .collect())
    }

    /// Create a temporary file with given content
    pub fn create_temp_file(prefix: &str, content: &[u8]) -> Result<String, String> {
        let temp_dir = std::env::temp_dir();
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
        let file_name = format!("{}_{}.tmp", prefix, timestamp);
        let path = temp_dir.join(file_name);
        let path_str = path.to_string_lossy().to_string();

        Self::write_bytes(&path_str, content)?;
        Ok(path_str)
    }

    /// Ensure directory exists (create if not)
    pub fn ensure_dir(path: &str) -> Result<(), String> {
        if !Self::exists(path) {
            Self::create_dir_all(path)
        } else if !Self::is_dir(path) {
            Err(format!("Path '{}' exists but is not a directory", path))
        } else {
            Ok(())
        }
    }

    /// Get total size of directory (recursive)
    pub fn dir_size(path: &str) -> Result<u64, String> {
        let mut total = 0u64;
        let entries = Self::list_dir(path)?;

        for entry in entries {
            if Self::is_file(&entry) {
                total += Self::size(&entry)?;
            } else if Self::is_dir(&entry) {
                total += Self::dir_size(&entry)?;
            }
        }

        Ok(total)
    }

    /// Copy directory recursively
    pub fn copy_dir_all(from: &str, to: &str) -> Result<(), String> {
        Self::ensure_dir(to)?;

        for entry in Self::list_dir(from)? {
            let file_name = Path::new(&entry)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let dest = crate::path::Path::join(to, &[&file_name]);

            if Self::is_file(&entry) {
                Self::copy_file(&entry, &dest)?;
            } else if Self::is_dir(&entry) {
                Self::copy_dir_all(&entry, &dest)?;
            }
        }

        Ok(())
    }
}

/// File reading with options
pub struct FileReader {
    path: String,
}

impl FileReader {
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
        }
    }

    /// Read as bytes
    pub fn bytes(&self) -> Result<Vec<u8>, String> {
        Fs::read_bytes(&self.path)
    }

    /// Read as string
    pub fn string(&self) -> Result<String, String> {
        Fs::read_string(&self.path)
    }

    /// Read as lines
    pub fn lines(&self) -> Result<Vec<String>, String> {
        Fs::read_lines(&self.path)
    }

    /// Read as JSON
    pub fn json<T: serde::de::DeserializeOwned>(&self) -> Result<T, String> {
        let content = self.string()?;
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    /// Check if file exists
    pub fn exists(&self) -> bool {
        Fs::exists(&self.path)
    }

    /// Get file size
    pub fn size(&self) -> Result<u64, String> {
        Fs::size(&self.path)
    }
}

/// File writing with options
pub struct FileWriter {
    path: String,
    create_dirs: bool,
}

impl FileWriter {
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
            create_dirs: false,
        }
    }

    /// Create parent directories if they don't exist
    pub fn create_dirs(mut self) -> Self {
        self.create_dirs = true;
        self
    }

    fn ensure_parent_dirs(&self) -> Result<(), String> {
        if self.create_dirs {
            if let Some(parent) = Path::new(&self.path).parent() {
                Fs::ensure_dir(&parent.to_string_lossy())?;
            }
        }
        Ok(())
    }

    /// Write bytes
    pub fn bytes(&self, data: &[u8]) -> Result<(), String> {
        self.ensure_parent_dirs()?;
        Fs::write_bytes(&self.path, data)
    }

    /// Write string
    pub fn string(&self, content: &str) -> Result<(), String> {
        self.ensure_parent_dirs()?;
        Fs::write_string(&self.path, content)
    }

    /// Write JSON
    pub fn json<T: serde::Serialize>(&self, value: &T) -> Result<(), String> {
        let content = serde_json::to_string_pretty(value)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
        self.string(&content)
    }

    /// Append bytes
    pub fn append_bytes(&self, data: &[u8]) -> Result<(), String> {
        self.ensure_parent_dirs()?;
        Fs::append_bytes(&self.path, data)
    }

    /// Append string
    pub fn append_string(&self, content: &str) -> Result<(), String> {
        self.ensure_parent_dirs()?;
        Fs::append_string(&self.path, content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_temp_file() {
        let content = b"test content";
        let path = Fs::create_temp_file("test", content).unwrap();
        assert!(Fs::exists(&path));

        let read_content = Fs::read_bytes(&path).unwrap();
        assert_eq!(read_content, content);

        Fs::remove_file(&path).unwrap();
        assert!(!Fs::exists(&path));
    }

    #[test]
    fn test_file_info() {
        let content = b"test";
        let path = Fs::create_temp_file("info_test", content).unwrap();

        let info = Fs::metadata(&path).unwrap();
        assert!(info.is_file);
        assert!(!info.is_dir);
        assert_eq!(info.size, 4);

        Fs::remove_file(&path).unwrap();
    }
}
