import { rspack } from '@rspack/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

/**
 * Bundle a plugin's frontend code (JSX) into a standalone JavaScript module
 * @param {string} pluginDir - Absolute path to the plugin directory
 * @param {string} outputDir - Absolute path to output directory (usually dist/plugins/<plugin_id>)
 * @returns {Promise<void>}
 */
export async function bundlePluginFrontend(pluginDir, outputDir) {
  const pluginName = pluginDir.split(/[\/\\]/).pop();

  // Check if plugin has frontend files
  const indexPath = resolve(pluginDir, 'index.jsx');
  const indexJsPath = resolve(pluginDir, 'index.js');

  if (!fs.existsSync(indexPath) && !fs.existsSync(indexJsPath)) {
    console.log(`   ⏭️  No frontend files found for ${pluginName}`);
    return;
  }

  const entryFile = fs.existsSync(indexPath) ? indexPath : indexJsPath;

  console.log(`   📦 Bundling frontend for ${pluginName}...`);

  // Ensure output directory exists (output directly to root)
  fs.mkdirSync(outputDir, { recursive: true });

  // Process Tailwind CSS v4 - scan all files in plugin directory
  console.log(`   🔍 Scanning for Tailwind classes in: ${pluginDir}`);

  // Tailwind v4 CSS with content scanning
  const cssContent = `@import "tailwindcss";

@source "${pluginDir.replace(/\\/g, '/')}/**/*.{js,jsx,ts,tsx}";
@source "${pluginDir.replace(/\\/g, '/')}/*.{js,jsx,ts,tsx}";
`;

  const result = await postcss([
    tailwindcss()
  ]).process(cssContent, {
    from: undefined,
    map: false
  });

  const processedCss = result.css;
  console.log(`   📊 Generated CSS size: ${processedCss.length} bytes`);

  const config = {
    mode: 'production',
    entry: {
      main: entryFile,
    },

    devtool: false,

    // Externals: Don't bundle shared dependencies - use globals from host app
    externals: {
      'solid-js': 'SolidJS',
      'solid-js/web': 'SolidJSWeb',
      'solid-js/store': 'SolidJSStore',
      '@/api/plugin': 'WebArcadeAPI',
      '@/api/bridge': 'WebArcadeAPI',
      '@tabler/icons-solidjs': 'TablerIconsSolidJS',
    },

    // Configure output to access externals from global scope
    externalsType: 'window',

    resolve: {
      alias: {
        '@': resolve(rootDir, 'src')
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      fullySpecified: false,
      modules: [
        resolve(pluginDir, 'node_modules'),  // Check plugin's node_modules first
        resolve(rootDir, 'node_modules'),     // Then check main project's node_modules
        'node_modules'                        // Finally, check standard node resolution
      ]
    },

    module: {
      rules: [
        {
          test: /\.(jsx|tsx)$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['solid', {
                    generate: 'dom',
                    hydratable: false,
                    dev: false
                  }]
                ],
                plugins: [],
              },
            },
          ],
        },
      ],
    },

    plugins: [
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'import.meta.env.DEV': JSON.stringify(false),
        'import.meta.env.PROD': JSON.stringify(true),
        'import.meta.env.MODE': JSON.stringify('production'),
        '__DEV__': JSON.stringify(false),
      }),
      // Inject CSS at the top of the bundle
      new rspack.BannerPlugin({
        banner: `if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.setAttribute('data-plugin', '${pluginName}');
  style.textContent = ${JSON.stringify(processedCss)};
  document.head.appendChild(style);
}`,
        raw: true,
        entryOnly: true,
      }),
    ],

    optimization: {
      minimize: true,
      minimizer: [
        new rspack.SwcJsMinimizerRspackPlugin(),
      ],
      // Disable all code splitting - force single file output
      splitChunks: false,
      runtimeChunk: false,
      moduleIds: 'named',
      chunkIds: 'named',
      concatenateModules: true, // Enable scope hoisting to inline modules
    },

    output: {
      path: outputDir,
      filename: 'plugin.js',
      library: {
        type: 'module',
      },
      clean: false, // Don't clean since binaries are already there
      publicPath: `/plugins/${pluginName}/`,
      asyncChunks: false, // Disable async chunk loading
      wasmLoading: false,
      chunkLoading: false,
    },

    experiments: {
      outputModule: true,
    },
  };

  return new Promise((resolve, reject) => {
    rspack(config, (err, stats) => {
      if (err) {
        console.error(`   ❌ Failed to bundle ${pluginName}:`, err);
        reject(err);
        return;
      }

      if (stats.hasErrors()) {
        const errors = stats.toJson().errors;
        console.error(`   ❌ Bundle errors for ${pluginName}:`);
        errors.forEach(error => console.error(error.message));
        reject(new Error('Bundle failed with errors'));
        return;
      }

      console.log(`   ✅ Frontend bundled for ${pluginName}`);
      resolve();
    });
  });
}

// CLI usage - check if this script is being run directly
const isMainModule = process.argv[1] && (
  process.argv[1].includes('build_plugin.js') ||
  import.meta.url === `file://${process.argv[1]}`
);

if (isMainModule) {
  const pluginDir = process.argv[2];
  const outputDir = process.argv[3];

  if (!pluginDir || !outputDir) {
    console.error('Usage: node build_plugin.js <plugin-dir> <output-dir>');
    process.exit(1);
  }

  bundlePluginFrontend(pluginDir, outputDir)
    .then(() => {
      console.log('✅ Frontend bundling complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Frontend bundling failed:', err);
      process.exit(1);
    });
}
