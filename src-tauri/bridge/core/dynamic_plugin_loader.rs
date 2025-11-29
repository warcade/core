use libloading::Library;
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Result, anyhow};

pub struct DynamicPluginLoader {
    plugins_dir: PathBuf,
    /// Secondary directory to check (e.g., bundled resources for exported apps)
    bundled_plugins_dir: Option<PathBuf>,
}

impl DynamicPluginLoader {
    pub fn new(plugins_dir: PathBuf) -> Self {
        Self {
            plugins_dir,
            bundled_plugins_dir: None,
        }
    }

    /// Set a bundled plugins directory (for exported apps with embedded plugins)
    pub fn with_bundled_dir(mut self, bundled_dir: PathBuf) -> Self {
        self.bundled_plugins_dir = Some(bundled_dir);
        self
    }

    /// Discover and load all plugins from available directories
    /// Priority: 1. Bundled resources (for exports) 2. AppData (for development)
    pub fn load_all_plugins(&mut self) -> Result<Vec<PluginInfo>> {
        let mut plugins = Vec::new();
        let mut loaded_ids = std::collections::HashSet::new();

        // First, try to load from bundled resources (for exported apps)
        // Clone the path to avoid borrow issues
        let bundled_dir = self.bundled_plugins_dir.clone();
        if let Some(bundled_dir) = bundled_dir {
            if bundled_dir.exists() {
                log::info!("🔍 Scanning for bundled plugins in: {:?}", bundled_dir);
                if let Ok(bundled_plugins) = self.load_plugins_from_dir(&bundled_dir) {
                    for plugin in bundled_plugins {
                        loaded_ids.insert(plugin.id.clone());
                        plugins.push(plugin);
                    }
                }
            }
        }

        // Then load from AppData (skip already loaded plugins)
        // Clone the path to avoid borrow issues
        let plugins_dir = self.plugins_dir.clone();
        log::info!("🔍 Scanning for plugins in: {:?}", plugins_dir);

        if !plugins_dir.exists() {
            fs::create_dir_all(&plugins_dir)?;
        }

        if let Ok(appdata_plugins) = self.load_plugins_from_dir(&plugins_dir) {
            for plugin in appdata_plugins {
                if !loaded_ids.contains(&plugin.id) {
                    plugins.push(plugin);
                } else {
                    log::debug!("Skipping {} (already loaded from bundled resources)", plugin.id);
                }
            }
        }

        log::info!("📦 Successfully loaded {} dynamic plugins", plugins.len());
        Ok(plugins)
    }

    fn load_plugins_from_dir(&mut self, dir: &Path) -> Result<Vec<PluginInfo>> {
        if !dir.exists() {
            return Ok(Vec::new());
        }

        let entries = fs::read_dir(dir)?;
        let mut plugins = Vec::new();

        for entry in entries {
            let entry = entry?;
            let path = entry.path();

            if path.is_dir() {
                match self.load_plugin_from_dir(&path) {
                    Ok(plugin_info) => {
                        plugins.push(plugin_info);
                    }
                    Err(e) => {
                        log::warn!("⚠️  Failed to load plugin from {:?}: {}", path, e);
                    }
                }
            }
        }

        Ok(plugins)
    }

    fn load_plugin_from_dir(&mut self, plugin_dir: &Path) -> Result<PluginInfo> {
        let package_json_path = plugin_dir.join("package.json");
        if !package_json_path.exists() {
            return Err(anyhow!("No package.json found"));
        }

        let package_str = fs::read_to_string(&package_json_path)?;
        let package_json: serde_json::Value = serde_json::from_str(&package_str)?;

        let webarcade_config = package_json.get("webarcade")
            .ok_or_else(|| anyhow!("package.json missing 'webarcade' section"))?;

        let plugin_id = webarcade_config["id"].as_str()
            .ok_or_else(|| anyhow!("Missing plugin id"))?
            .to_string();

        let has_backend = plugin_dir.join(format!("{}.dll", plugin_id)).exists()
            || plugin_dir.join(format!("lib{}.so", plugin_id)).exists()
            || plugin_dir.join(format!("lib{}.dylib", plugin_id)).exists();

        let has_frontend = plugin_dir.join("plugin.js").exists();

        let routes = webarcade_config.get("routes")
            .and_then(|r| r.as_array())
            .cloned()
            .unwrap_or_default();

        if has_backend {
            let dll_path = self.find_platform_binary(&plugin_dir, &plugin_id)?;
            let lib = unsafe { Library::new(&dll_path)? };
            let lib_arc = std::sync::Arc::new(lib);
            crate::core::plugin_exports::register_plugin_library(plugin_id.clone(), lib_arc);
            log::info!("✅ Loaded plugin: {} ({} routes)", plugin_id, routes.len());
        }

        Ok(PluginInfo {
            id: plugin_id,
            dir: plugin_dir.to_path_buf(),
            has_backend,
            has_frontend,
            routes,
        })
    }

    fn find_platform_binary(&self, plugin_dir: &Path, plugin_id: &str) -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        let binary_path = plugin_dir.join(format!("{}.dll", plugin_id));

        #[cfg(target_os = "linux")]
        let binary_path = plugin_dir.join(format!("lib{}.so", plugin_id));

        #[cfg(target_os = "macos")]
        let binary_path = plugin_dir.join(format!("lib{}.dylib", plugin_id));

        if binary_path.exists() {
            Ok(binary_path)
        } else {
            Err(anyhow!("Platform binary not found: {:?}", binary_path))
        }
    }
}

/// Information about a loaded plugin
#[derive(Debug, Clone)]
pub struct PluginInfo {
    pub id: String,
    pub dir: PathBuf,
    pub has_backend: bool,
    pub has_frontend: bool,
    pub routes: Vec<serde_json::Value>,
}
