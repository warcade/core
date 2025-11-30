#!/usr/bin/env node
/**
 * Pre-build script that dynamically configures Tauri resources
 * based on which plugins exist in the plugins/ directory.
 *
 * Run before `tauri build` to bundle existing plugins.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PLUGINS_DIR = path.join(ROOT_DIR, 'plugins');
const TAURI_CONFIG_PATH = path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json');

function getExistingPlugins() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    return [];
  }

  return fs.readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
}

function updateTauriConfig() {
  const plugins = getExistingPlugins();
  console.log(`[prepare-build] Found ${plugins.length} plugins:`, plugins);

  // Read current config
  const config = JSON.parse(fs.readFileSync(TAURI_CONFIG_PATH, 'utf-8'));

  // Build resources object
  const resources = {
    'scripts/build_plugin.js': 'scripts/'
  };

  // Add each plugin directory
  for (const plugin of plugins) {
    resources[`../plugins/${plugin}/`] = `plugins/${plugin}/`;
  }

  // Update config
  config.bundle.resources = resources;

  // Write back
  fs.writeFileSync(TAURI_CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('[prepare-build] Updated tauri.conf.json with plugin resources');
}

function main() {
  console.log('[prepare-build] Preparing build...');

  try {
    updateTauriConfig();
    console.log('[prepare-build] Done!');
  } catch (error) {
    console.error('[prepare-build] Error:', error.message);
    process.exit(1);
  }
}

main();
