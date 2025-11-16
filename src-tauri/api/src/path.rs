//! Path manipulation utilities
//!
//! Provides FFI-safe cross-platform path operations.

use serde::{Serialize, Deserialize};
use std::path::{Path as StdPath, PathBuf};

/// Path utilities
pub struct Path;

impl Path {
    /// Join path segments
    pub fn join(base: &str, parts: &[&str]) -> String {
        let mut path = PathBuf::from(base);
        for part in parts {
            path.push(part);
        }
        path.to_string_lossy().to_string()
    }

    /// Get file name from path
    pub fn file_name(path: &str) -> Option<String> {
        StdPath::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
    }

    /// Get file stem (name without extension)
    pub fn file_stem(path: &str) -> Option<String> {
        StdPath::new(path)
            .file_stem()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
    }

    /// Get file extension
    pub fn extension(path: &str) -> Option<String> {
        StdPath::new(path)
            .extension()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
    }

    /// Get parent directory
    pub fn parent(path: &str) -> Option<String> {
        StdPath::new(path)
            .parent()
            .map(|p| p.to_string_lossy().to_string())
    }

    /// Check if path is absolute
    pub fn is_absolute(path: &str) -> bool {
        StdPath::new(path).is_absolute()
    }

    /// Check if path is relative
    pub fn is_relative(path: &str) -> bool {
        StdPath::new(path).is_relative()
    }

    /// Normalize path (resolve . and ..)
    pub fn normalize(path: &str) -> String {
        let mut components = Vec::new();
        let path_obj = StdPath::new(path);

        for component in path_obj.components() {
            match component {
                std::path::Component::ParentDir => {
                    if !components.is_empty() {
                        components.pop();
                    }
                }
                std::path::Component::CurDir => {}
                other => {
                    components.push(other.as_os_str().to_string_lossy().to_string());
                }
            }
        }

        if components.is_empty() {
            ".".to_string()
        } else {
            components.join(if cfg!(windows) { "\\" } else { "/" })
        }
    }

    /// Make path relative to base
    pub fn relative_to(path: &str, base: &str) -> Option<String> {
        let path = StdPath::new(path);
        let base = StdPath::new(base);

        path.strip_prefix(base)
            .ok()
            .map(|p| p.to_string_lossy().to_string())
    }

    /// Get current working directory
    pub fn cwd() -> Result<String, String> {
        std::env::current_dir()
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to get current directory: {}", e))
    }

    /// Get home directory
    pub fn home() -> Option<String> {
        dirs::home_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get local data directory (AppData/Local on Windows, ~/.local/share on Linux)
    pub fn data_local() -> Option<String> {
        dirs::data_local_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get config directory
    pub fn config() -> Option<String> {
        dirs::config_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get cache directory
    pub fn cache() -> Option<String> {
        dirs::cache_dir().map(|p| p.to_string_lossy().to_string())
    }

    /// Get temp directory
    pub fn temp() -> String {
        std::env::temp_dir().to_string_lossy().to_string()
    }

    /// Get WebArcade data directory
    pub fn webarcade_data() -> Result<String, String> {
        Self::data_local()
            .map(|p| Self::join(&p, &["WebArcade"]))
            .ok_or_else(|| "Could not determine WebArcade data directory".to_string())
    }

    /// Get WebArcade plugins directory
    pub fn webarcade_plugins() -> Result<String, String> {
        Self::webarcade_data().map(|p| Self::join(&p, &["plugins"]))
    }

    /// Get WebArcade projects directory
    pub fn webarcade_projects() -> Result<String, String> {
        Self::webarcade_data().map(|p| Self::join(&p, &["projects"]))
    }

    /// Check if path exists
    pub fn exists(path: &str) -> bool {
        StdPath::new(path).exists()
    }

    /// Check if path is a file
    pub fn is_file(path: &str) -> bool {
        StdPath::new(path).is_file()
    }

    /// Check if path is a directory
    pub fn is_dir(path: &str) -> bool {
        StdPath::new(path).is_dir()
    }

    /// Replace file extension
    pub fn with_extension(path: &str, ext: &str) -> String {
        let mut path_buf = PathBuf::from(path);
        path_buf.set_extension(ext);
        path_buf.to_string_lossy().to_string()
    }

    /// Add suffix before extension (e.g., "file.txt" -> "file_backup.txt")
    pub fn with_suffix(path: &str, suffix: &str) -> String {
        let stem = Self::file_stem(path).unwrap_or_default();
        let ext = Self::extension(path);
        let parent = Self::parent(path).unwrap_or_default();

        let new_name = if let Some(ext) = ext {
            format!("{}{}.{}", stem, suffix, ext)
        } else {
            format!("{}{}", stem, suffix)
        };

        if parent.is_empty() {
            new_name
        } else {
            Self::join(&parent, &[&new_name])
        }
    }

    /// Split path into components
    pub fn components(path: &str) -> Vec<String> {
        StdPath::new(path)
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect()
    }

    /// Convert Windows path to Unix style
    pub fn to_unix_style(path: &str) -> String {
        path.replace('\\', "/")
    }

    /// Convert Unix path to Windows style
    pub fn to_windows_style(path: &str) -> String {
        path.replace('/', "\\")
    }

    /// Get platform-native separator
    pub fn separator() -> char {
        std::path::MAIN_SEPARATOR
    }

    /// Ensure path ends with separator
    pub fn ensure_trailing_separator(path: &str) -> String {
        let sep = Self::separator();
        if path.ends_with(sep) || path.ends_with('/') || path.ends_with('\\') {
            path.to_string()
        } else {
            format!("{}{}", path, sep)
        }
    }

    /// Remove trailing separator
    pub fn remove_trailing_separator(path: &str) -> String {
        let path = path.trim_end_matches('/').trim_end_matches('\\');
        path.to_string()
    }
}

/// Path builder for fluent path construction
#[derive(Debug, Clone)]
pub struct PathBuilder {
    path: PathBuf,
}

impl PathBuilder {
    /// Start with a base path
    pub fn new(base: &str) -> Self {
        Self {
            path: PathBuf::from(base),
        }
    }

    /// Start from current directory
    pub fn from_cwd() -> Result<Self, String> {
        Ok(Self {
            path: std::env::current_dir()
                .map_err(|e| format!("Failed to get current directory: {}", e))?,
        })
    }

    /// Start from home directory
    pub fn from_home() -> Result<Self, String> {
        Ok(Self {
            path: dirs::home_dir()
                .ok_or_else(|| "Could not determine home directory".to_string())?,
        })
    }

    /// Start from WebArcade data directory
    pub fn from_webarcade() -> Result<Self, String> {
        let data_dir = dirs::data_local_dir()
            .ok_or_else(|| "Could not determine data directory".to_string())?;
        Ok(Self {
            path: data_dir.join("WebArcade"),
        })
    }

    /// Push a path segment
    pub fn push(mut self, segment: &str) -> Self {
        self.path.push(segment);
        self
    }

    /// Push multiple segments
    pub fn push_all(mut self, segments: &[&str]) -> Self {
        for segment in segments {
            self.path.push(segment);
        }
        self
    }

    /// Set file extension
    pub fn with_extension(mut self, ext: &str) -> Self {
        self.path.set_extension(ext);
        self
    }

    /// Go to parent directory
    pub fn parent(mut self) -> Self {
        if let Some(parent) = self.path.parent() {
            self.path = parent.to_path_buf();
        }
        self
    }

    /// Build the final path string
    pub fn build(self) -> String {
        self.path.to_string_lossy().to_string()
    }

    /// Build as PathBuf
    pub fn build_pathbuf(self) -> PathBuf {
        self.path
    }

    /// Check if the built path exists
    pub fn exists(&self) -> bool {
        self.path.exists()
    }

    /// Check if the built path is a file
    pub fn is_file(&self) -> bool {
        self.path.is_file()
    }

    /// Check if the built path is a directory
    pub fn is_dir(&self) -> bool {
        self.path.is_dir()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_join() {
        let path = Path::join("/home/user", &["documents", "file.txt"]);
        assert!(path.contains("documents"));
        assert!(path.contains("file.txt"));
    }

    #[test]
    fn test_file_parts() {
        let path = "/home/user/document.pdf";
        assert_eq!(Path::file_name(path), Some("document.pdf".to_string()));
        assert_eq!(Path::file_stem(path), Some("document".to_string()));
        assert_eq!(Path::extension(path), Some("pdf".to_string()));
    }

    #[test]
    fn test_with_extension() {
        let path = "/home/user/file.txt";
        let new_path = Path::with_extension(path, "md");
        assert!(new_path.ends_with("file.md"));
    }

    #[test]
    fn test_with_suffix() {
        let path = "document.txt";
        let new_path = Path::with_suffix(path, "_backup");
        assert_eq!(new_path, "document_backup.txt");
    }

    #[test]
    fn test_path_builder() {
        let path = PathBuilder::new("/home")
            .push("user")
            .push("documents")
            .push("file")
            .with_extension("txt")
            .build();

        assert!(path.contains("user"));
        assert!(path.contains("documents"));
        assert!(path.ends_with(".txt"));
    }
}
