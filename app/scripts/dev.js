/**
 * WebArcade Dev Server
 *
 * Watches for file changes and triggers rebuilds + browser refresh.
 *
 * Watches:
 * - src/           → rebuild frontend → refresh
 * - plugins/       → rebuild plugin → refresh
 * - app/plugins/   → just refresh (already built)
 */

import * as esbuild from 'esbuild';
import { transformAsync } from '@babel/core';
import solidPreset from 'babel-preset-solid';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SRC = resolve(ROOT, 'src');
const DIST = resolve(ROOT, 'app/dist');
const PLUGINS_SRC = resolve(ROOT, 'plugins');
const PLUGINS_BUILT = resolve(ROOT, 'app/plugins');

// Colors for console output
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// ============================================================================
// WebSocket Server for live reload
// ============================================================================

const WS_PORT = 3002;
let wsServer;
let clients = new Set();

function startWebSocketServer() {
    wsServer = new WebSocketServer({ port: WS_PORT });

    wsServer.on('connection', (ws) => {
        clients.add(ws);
        ws.on('close', () => clients.delete(ws));
    });

    console.log(`${green('✓')} Live reload server on ws://localhost:${WS_PORT}`);
}

function triggerReload() {
    const msg = JSON.stringify({ type: 'reload' });
    for (const client of clients) {
        if (client.readyState === 1) { // OPEN
            client.send(msg);
        }
    }
}

// ============================================================================
// esbuild setup (same as build.js but with watch hooks)
// ============================================================================

function createSolidPlugin() {
    return {
        name: 'solid',
        setup(build) {
            build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
                const source = readFileSync(args.path, 'utf8');
                const result = await transformAsync(source, {
                    filename: args.path,
                    presets: [[solidPreset, { generate: 'dom', hydratable: false }]],
                });
                return { contents: result.code, loader: 'js' };
            });
        },
    };
}

function createCssPlugin() {
    return {
        name: 'css',
        setup(build) {
            const cssFiles = new Map();

            build.onLoad({ filter: /\.css$/ }, async (args) => {
                const source = readFileSync(args.path, 'utf8');
                const result = await postcss([
                    tailwindcss(),
                    { postcssPlugin: 'remove-comments', Once(root) { root.walkComments(c => c.remove()); } }
                ]).process(source, { from: args.path });
                cssFiles.set(args.path, result.css);
                return { contents: `/* CSS: ${basename(args.path)} */`, loader: 'js' };
            });

            build.onEnd(async () => {
                if (cssFiles.size > 0) {
                    const combinedCss = Array.from(cssFiles.values()).join('\n');
                    mkdirSync(resolve(DIST, 'assets'), { recursive: true });
                    writeFileSync(resolve(DIST, 'assets/styles.css'), combinedCss);
                }
            });
        },
    };
}

let isBuilding = false;
let pendingBuild = false;

async function buildFrontend() {
    if (isBuilding) {
        pendingBuild = true;
        return;
    }

    isBuilding = true;
    const startTime = Date.now();

    try {
        // Clean dist
        mkdirSync(resolve(DIST, 'assets'), { recursive: true });

        const result = await esbuild.build({
            entryPoints: [resolve(SRC, 'entry-client.jsx')],
            bundle: true,
            outfile: resolve(DIST, 'assets', 'app.js'),
            format: 'esm',
            minify: false,
            sourcemap: false,
            metafile: true,
            target: ['es2020'],
            define: {
                'process.env.NODE_ENV': '"development"',
                'import.meta.env.DEV': 'true',
                'import.meta.env.PROD': 'false',
                '__DEV__': 'true',
            },
            alias: { '@': SRC },
            plugins: [createSolidPlugin(), createCssPlugin()],
            loader: {
                '.js': 'js', '.json': 'json',
                '.png': 'file', '.jpg': 'file', '.svg': 'file',
            },
            logLevel: 'warning',
        });

        // Process CSS
        const cssEntries = [resolve(SRC, 'index.css'), resolve(SRC, 'base.css')].filter(existsSync);
        if (cssEntries.length > 0) {
            let combinedCss = '';
            for (const cssFile of cssEntries) {
                const source = readFileSync(cssFile, 'utf8');
                const processed = await postcss([tailwindcss()]).process(source, { from: cssFile });
                combinedCss += processed.css + '\n';
            }
            writeFileSync(resolve(DIST, 'assets/styles.css'), combinedCss);
        }

        // Generate HTML with live reload script
        const outputs = Object.keys(result.metafile.outputs)
            .filter(f => f.endsWith('.js'))
            .map(f => relative(DIST, f).replace(/\\/g, '/'));
        const entryFile = outputs.find(f => f.includes('app')) || outputs[0];

        const liveReloadScript = `
    <script>
      (function() {
        const ws = new WebSocket('ws://localhost:${WS_PORT}');
        ws.onmessage = () => location.reload();
        ws.onclose = () => setTimeout(() => location.reload(), 1000);
      })();
    </script>`;

        const template = readFileSync(resolve(SRC, 'index.html'), 'utf8');
        const html = template
            .replace('<!--app-head-->', '<link rel="stylesheet" href="/assets/styles.css">')
            .replace('<!--app-html-->', '')
            .replace('</body>', `${liveReloadScript}\n    <script type="module" src="/${entryFile}"></script>\n  </body>`);
        writeFileSync(resolve(DIST, 'index.html'), html);

        const elapsed = Date.now() - startTime;
        console.log(`${green('✓')} Frontend rebuilt ${dim(`(${elapsed}ms)`)}`);

    } catch (err) {
        console.error(`${yellow('✗')} Build error:`, err.message);
    } finally {
        isBuilding = false;
        if (pendingBuild) {
            pendingBuild = false;
            buildFrontend();
        }
    }
}

// ============================================================================
// Plugin builder
// ============================================================================

async function buildPlugin(pluginId) {
    console.log(`${cyan('→')} Building plugin: ${pluginId}`);

    return new Promise((resolve) => {
        const proc = spawn('webarcade', ['build', pluginId], {
            cwd: ROOT,
            shell: true,
            stdio: 'inherit'
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`${green('✓')} Plugin built: ${pluginId}`);
            } else {
                console.log(`${yellow('✗')} Plugin build failed: ${pluginId}`);
            }
            resolve();
        });
    });
}

// ============================================================================
// File watchers
// ============================================================================

function startWatchers() {
    // Debounce helper
    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    // Watch src/ - rebuild frontend
    const srcWatcher = chokidar.watch(SRC, {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true,
    });

    const handleSrcChange = debounce(async (path) => {
        console.log(`${cyan('→')} Changed: ${relative(ROOT, path)}`);
        await buildFrontend();
        triggerReload();
    }, 100);

    srcWatcher.on('change', handleSrcChange);
    srcWatcher.on('add', handleSrcChange);
    console.log(`${green('✓')} Watching src/`);

    // Watch plugins/ source - rebuild plugin
    const pluginsSrcWatcher = chokidar.watch(PLUGINS_SRC, {
        ignored: /node_modules/,
        persistent: true,
        ignoreInitial: true,
        depth: 2,
    });

    const pluginBuildQueue = new Map();

    const handlePluginSrcChange = debounce(async (path) => {
        const relPath = relative(PLUGINS_SRC, path);
        const pluginId = relPath.split(/[/\\]/)[0];

        if (!pluginBuildQueue.has(pluginId)) {
            pluginBuildQueue.set(pluginId, true);
            console.log(`${cyan('→')} Plugin source changed: ${pluginId}`);
            await buildPlugin(pluginId);
            pluginBuildQueue.delete(pluginId);
            triggerReload();
        }
    }, 300);

    pluginsSrcWatcher.on('change', handlePluginSrcChange);
    pluginsSrcWatcher.on('add', handlePluginSrcChange);
    console.log(`${green('✓')} Watching plugins/`);

    // Watch app/plugins/ - just refresh (already built)
    const pluginsBuiltWatcher = chokidar.watch(PLUGINS_BUILT, {
        ignored: /\.dll$/,  // Ignore DLLs, they don't need refresh
        persistent: true,
        ignoreInitial: true,
    });

    const handleBuiltPluginChange = debounce((path) => {
        console.log(`${cyan('→')} Built plugin changed: ${basename(path)}`);
        triggerReload();
    }, 100);

    pluginsBuiltWatcher.on('change', handleBuiltPluginChange);
    pluginsBuiltWatcher.on('add', handleBuiltPluginChange);
    console.log(`${green('✓')} Watching app/plugins/`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    console.log();
    console.log(cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(cyan('  WebArcade Dev Server'));
    console.log(cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log();

    // Initial build
    console.log(`${cyan('→')} Initial build...`);
    await buildFrontend();
    console.log();

    // Start servers and watchers
    startWebSocketServer();
    startWatchers();

    console.log();
    console.log(`${green('✓')} Dev server ready - watching for changes`);
    console.log(dim('  Press Ctrl+C to stop'));
    console.log();
}

main().catch(console.error);
