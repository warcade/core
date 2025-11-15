import fs from 'fs';
import path from 'path';

/**
 * Remove has_backend and has_frontend from package.json webarcade section
 * @param {string} pluginDir - Path to the plugin directory
 */
function cleanupPlugin(pluginDir) {
  const packagePath = path.join(pluginDir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    return;
  }

  console.log(`\n📦 Cleaning: ${path.basename(pluginDir)}`);

  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    if (!packageJson.webarcade) {
      console.log('  ⚠ No webarcade section found, skipping');
      return;
    }

    let modified = false;

    // Remove has_backend and has_frontend fields
    if ('has_backend' in packageJson.webarcade) {
      delete packageJson.webarcade.has_backend;
      console.log('  ✓ Removed has_backend');
      modified = true;
    }

    if ('has_frontend' in packageJson.webarcade) {
      delete packageJson.webarcade.has_frontend;
      console.log('  ✓ Removed has_frontend');
      modified = true;
    }

    // Also remove build metadata fields if present
    if ('build_date' in packageJson.webarcade) {
      delete packageJson.webarcade.build_date;
      console.log('  ✓ Removed build_date');
      modified = true;
    }

    if ('build_platform' in packageJson.webarcade) {
      delete packageJson.webarcade.build_platform;
      console.log('  ✓ Removed build_platform');
      modified = true;
    }

    if ('supported_platforms' in packageJson.webarcade) {
      delete packageJson.webarcade.supported_platforms;
      console.log('  ✓ Removed supported_platforms');
      modified = true;
    }

    if (modified) {
      // Write updated package.json
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log('  ✅ Cleanup complete!');
    } else {
      console.log('  ℹ Already clean, no changes needed');
    }
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
  }
}

/**
 * Clean all plugins in a directory
 * @param {string} baseDir - Base directory containing plugin subdirectories
 */
function cleanAllPlugins(baseDir) {
  if (!fs.existsSync(baseDir)) {
    console.log(`⚠️  Directory not found: ${baseDir}`);
    return;
  }

  console.log(`\n🔍 Scanning: ${baseDir}`);

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);

  console.log(`   Found ${dirs.length} directories`);

  for (const dir of dirs) {
    const pluginDir = path.join(baseDir, dir);
    cleanupPlugin(pluginDir);
  }
}

// Main execution
const appDataDir = process.env.LOCALAPPDATA || process.env.APPDATA;
if (!appDataDir) {
  console.error('❌ Could not determine AppData directory');
  process.exit(1);
}

const projectsDir = path.join(appDataDir, 'WebArcade', 'projects');
const pluginsDir = path.join(appDataDir, 'WebArcade', 'plugins');

console.log('🚀 Cleaning package.json files...');

cleanAllPlugins(projectsDir);
cleanAllPlugins(pluginsDir);

console.log('\n✅ All cleanups complete!');
