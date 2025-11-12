import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { solidPlugin } from 'esbuild-plugin-solid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes('--watch');
const isProduction = process.env.NODE_ENV === 'production';

console.log(`🔨 Building frontend ${isProduction ? '(production)' : '(development)'}${isWatch ? ' with watch mode' : ''}...`);

// PostCSS plugin for esbuild
const postcssPlugin = {
  name: 'postcss',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = readFileSync(args.path, 'utf8');

      const result = await postcss([tailwindcss()]).process(css, {
        from: args.path,
        to: args.path,
      });

      return {
        contents: result.css,
        loader: 'css',
      };
    });
  },
};

const config = {
  entryPoints: [resolve(__dirname, '../src/entry-client.jsx')],
  bundle: true,
  outdir: resolve(__dirname, '../dist'),
  format: 'esm',
  splitting: true,
  minify: isProduction,
  sourcemap: !isProduction,
  target: ['es2020'],
  platform: 'browser',
  alias: {
    '@': resolve(__dirname, '../src'),
  },
  conditions: ['browser', 'import'],
  mainFields: ['browser', 'module', 'main'],
  loader: {
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.svg': 'file',
    '.gif': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.ttf': 'file',
    '.eot': 'file',
  },
  plugins: [
    solidPlugin({
      solid: {
        generate: 'dom',
        hydratable: false,
      },
    }),
    postcssPlugin,
  ],
  external: [],
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
  },
};

// Create index.html
const distDir = resolve(__dirname, '../dist');
mkdirSync(distDir, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebArcade</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/entry-client.js"></script>
</body>
</html>`;

writeFileSync(resolve(distDir, 'index.html'), html);

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 Watching for changes...');
} else {
  await esbuild.build(config);
  console.log('✅ Build complete!');
}
