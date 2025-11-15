import fs from 'fs';
import path from 'path';

/**
 * Convert a plugin from manifest.json + routes.json to package.json
 * @param {string} pluginDir - Path to the plugin directory
 */
function convertPlugin(pluginDir) {
  const manifestPath = path.join(pluginDir, 'manifest.json');
  const routesPath = path.join(pluginDir, 'routes.json');
  const packagePath = path.join(pluginDir, 'package.json');

  console.log(`\n📦 Converting: ${path.basename(pluginDir)}`);

  // Read existing package.json if it exists
  let packageJson = {};
  if (fs.existsSync(packagePath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      console.log('  ✓ Found existing package.json');
    } catch (err) {
      console.log('  ⚠ Invalid package.json, creating new one');
    }
  }

  // Read manifest.json if it exists
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log('  ✓ Found manifest.json');
    } catch (err) {
      console.log('  ✗ Invalid manifest.json');
      return;
    }
  } else {
    console.log('  ⚠ No manifest.json found, skipping');
    return;
  }

  // Read routes.json if it exists
  let routes = [];
  if (fs.existsSync(routesPath)) {
    try {
      const routesData = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
      routes = routesData.routes || [];
      console.log(`  ✓ Found routes.json (${routes.length} routes)`);
    } catch (err) {
      console.log('  ⚠ Invalid routes.json, using empty routes');
    }
  }

  // Merge manifest data into package.json
  packageJson.name = packageJson.name || manifest.id || path.basename(pluginDir);
  packageJson.version = packageJson.version || manifest.version || '1.0.0';
  packageJson.description = packageJson.description || manifest.description || '';
  packageJson.author = packageJson.author || manifest.author || 'Unknown';

  // Preserve existing dependencies
  packageJson.dependencies = packageJson.dependencies || {};

  // Create webarcade section
  packageJson.webarcade = {
    id: manifest.id,
    has_frontend: manifest.has_frontend !== undefined ? manifest.has_frontend : true,
    has_backend: manifest.has_backend !== undefined ? manifest.has_backend : false,
    routes: routes
  };

  // Write package.json
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('  ✓ Created/updated package.json');

  // Delete manifest.json and routes.json
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
    console.log('  ✓ Deleted manifest.json');
  }

  if (fs.existsSync(routesPath)) {
    fs.unlinkSync(routesPath);
    console.log('  ✓ Deleted routes.json');
  }

  console.log('  ✅ Conversion complete!');
}

/**
 * Convert all plugins in a directory
 * @param {string} baseDir - Base directory containing plugin subdirectories
 */
function convertAllPlugins(baseDir) {
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
    convertPlugin(pluginDir);
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

console.log('🚀 Converting plugins to package.json format...');

convertAllPlugins(projectsDir);
convertAllPlugins(pluginsDir);

console.log('\n✅ All conversions complete!');
