import { createSignal, createContext, useContext, onMount, onCleanup, createRoot } from 'solid-js';
import pluginStore, { PLUGIN_STATES, setPluginConfigs } from './store.jsx';

const PluginAPIContext = createContext();

// Plugin loader class
class PluginLoader {
    constructor(PluginAPI) {
        this.PluginAPI = PluginAPI;
        this.updateInterval = null;
    }

    async discoverPlugins() {
        const discovered = new Map();
        const plugins = await this.scanForPlugins();

        plugins.forEach(plugin => {
            discovered.set(plugin.id, plugin);
            this.setPluginState(plugin.id, PLUGIN_STATES.DISCOVERED);
        });

        return discovered;
    }

    async scanForPlugins() {
        const plugins = [];

        try {
            console.log('[PluginLoader] Fetching plugins from backend...');
            const response = await fetch('http://localhost:3001/api/plugins/list');

            if (response.ok) {
                const data = await response.json();

                for (const runtimePlugin of data.plugins) {
                    const hasFrontend = runtimePlugin.has_plugin_js !== false;

                    if (hasFrontend) {
                        const pluginConfig = {
                            id: runtimePlugin.id,
                            path: `/runtime/${runtimePlugin.id}`,
                            name: runtimePlugin.name || runtimePlugin.id,
                            version: runtimePlugin.version || '1.0.0',
                            description: runtimePlugin.description || `Plugin: ${runtimePlugin.name || runtimePlugin.id}`,
                            author: runtimePlugin.author || 'Plugin Developer',
                            main: 'plugin.js',
                            enabled: true,
                            priority: runtimePlugin.priority || 100,
                            has_backend: runtimePlugin.has_dll || false
                        };

                        setPluginConfigs(prev => new Map(prev.set(runtimePlugin.id, pluginConfig)));

                        plugins.push({
                            id: runtimePlugin.id,
                            path: `/runtime/${runtimePlugin.id}`,
                            enabled: true,
                            isCore: false,
                            isRuntime: true,
                            manifest: {
                                name: pluginConfig.name,
                                version: pluginConfig.version,
                                description: pluginConfig.description,
                                author: pluginConfig.author,
                                main: pluginConfig.main,
                                dependencies: [],
                                permissions: ['ui-core'],
                                apiVersion: '1.0.0',
                                priority: pluginConfig.priority
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[PluginLoader] Failed to fetch plugins:', error);
        }

        plugins.sort((a, b) => a.manifest.priority - b.manifest.priority);
        return plugins;
    }

    async loadPluginDynamic(id, path, mainFile) {
        const pluginId = path.replace('/runtime/', '');
        const pluginUrl = `http://localhost:3001/api/plugins/${pluginId}/${mainFile}`;

        console.log(`[PluginLoader] Loading plugin "${id}" from ${pluginUrl}`);
        const pluginModule = await import(/* webpackIgnore: true */ pluginUrl);
        return pluginModule;
    }

    async loadPlugin(pluginInfo) {
        const { id, path, manifest } = pluginInfo;

        try {
            this.setPluginState(id, PLUGIN_STATES.LOADING);

            let pluginModule = null;
            let pluginInstance = null;

            if (!manifest.main) {
                pluginInstance = {
                    id,
                    name: manifest.name,
                    version: manifest.version,
                    getId: () => id,
                    getName: () => manifest.name,
                    getVersion: () => manifest.version,
                };
            } else {
                pluginModule = await this.loadPluginDynamic(id, path, manifest.main);

                if (!pluginModule.default && !pluginModule.Plugin) {
                    throw new Error(`Plugin ${id} must export a default plugin function`);
                }

                const PluginFactory = pluginModule.default || pluginModule.Plugin;

                if (PluginFactory.prototype && PluginFactory.prototype.constructor) {
                    pluginInstance = new PluginFactory(this.PluginAPI);
                    if (!pluginInstance.getId) pluginInstance.getId = () => pluginInstance.id;
                    if (!pluginInstance.getName) pluginInstance.getName = () => pluginInstance.name;
                    if (!pluginInstance.getVersion) pluginInstance.getVersion = () => pluginInstance.version;
                    if (!pluginInstance.onInit) pluginInstance.onInit = () => pluginInstance.initialize();
                } else {
                    pluginInstance = PluginFactory(this.PluginAPI);
                }
            }

            pluginStore.setPluginInstance(id, pluginInstance, pluginModule);
            this.setPluginState(id, PLUGIN_STATES.LOADED);

            return pluginInstance;
        } catch (error) {
            this.setPluginError(id, error);
            this.setPluginState(id, PLUGIN_STATES.ERROR);
            throw error;
        }
    }

    async initializePlugin(pluginId) {
        const pluginData = pluginStore.getPluginInstance(pluginId);
        const pluginConfig = pluginStore.getPluginConfig(pluginId);

        if (!pluginData || !pluginData.instance) {
            throw new Error(`Plugin ${pluginId} not loaded`);
        }

        try {
            this.setPluginState(pluginId, PLUGIN_STATES.INITIALIZING);

            if (typeof pluginData.instance.onInit === 'function') {
                await pluginData.instance.onInit();
            }

            this.setPluginState(pluginId, PLUGIN_STATES.INITIALIZED);
        } catch (error) {
            this.setPluginError(pluginId, error);
            this.setPluginState(pluginId, PLUGIN_STATES.ERROR);
            throw error;
        }
    }

    async startPlugin(pluginId) {
        const pluginData = pluginStore.getPluginInstance(pluginId);

        if (!pluginData || !pluginData.instance) {
            throw new Error(`Plugin ${pluginId} not loaded`);
        }

        try {
            this.setPluginState(pluginId, PLUGIN_STATES.STARTING);

            if (typeof pluginData.instance.onStart === 'function') {
                await new Promise((resolve, reject) => {
                    createRoot(async (dispose) => {
                        try {
                            await pluginData.instance.onStart(this.PluginAPI);
                            pluginData.instance._dispose = dispose;
                            resolve();
                        } catch (error) {
                            dispose();
                            reject(error);
                        }
                    });
                });
            }

            this.setPluginState(pluginId, PLUGIN_STATES.RUNNING);
        } catch (error) {
            this.setPluginError(pluginId, error);
            this.setPluginState(pluginId, PLUGIN_STATES.ERROR);
            throw error;
        }
    }

    async loadAllPlugins() {
        const discovered = await this.discoverPlugins();

        for (const [id, pluginInfo] of discovered) {
            if (!pluginInfo.enabled) {
                this.setPluginState(id, PLUGIN_STATES.DISABLED);
                continue;
            }

            try {
                await this.loadPlugin(pluginInfo);
                await this.initializePlugin(id);
                await this.startPlugin(id);
            } catch (error) {
                console.error(`[PluginLoader] Failed to load plugin ${id}:`, error);
            }
        }
    }

    setPluginState(pluginId, state) {
        pluginStore.setPluginState(pluginId, state);
    }

    setPluginError(pluginId, error) {
        pluginStore.setPluginError(pluginId, error);
    }

    getAllPlugins() {
        return pluginStore.getAllPlugins();
    }

    getStats() {
        return pluginStore.getStats();
    }
}

// Simplified Plugin API
export class PluginAPI {
    constructor() {
        this.id = 'plugin-api';
        this.version = '1.0.0';
        this.pluginLoader = new PluginLoader(this);
        this.initialized = false;

        // Keyboard shortcuts API
        this.shortcut = this.createShortcutAPI();

        // Context menu API
        this.context = this.createContextAPI();
    }

    createShortcutAPI() {
        const handlers = [];
        let disabled = false;
        let listenerAttached = false;

        const isInputFocused = () => {
            const el = document.activeElement;
            if (!el) return false;
            const tag = el.tagName.toLowerCase();
            if (['input', 'textarea', 'select'].includes(tag)) return true;
            if (el.contentEditable === 'true') return true;
            if (el.closest('.monaco-editor') || el.closest('[contenteditable]')) return true;
            return false;
        };

        const handleKeyDown = (event) => {
            if (disabled || isInputFocused()) return;
            handlers.forEach(handler => {
                try { handler(event); } catch (e) { console.error('[ShortcutAPI]', e); }
            });
        };

        const attachListener = () => {
            if (listenerAttached) return;
            document.addEventListener('keydown', handleKeyDown);
            listenerAttached = true;
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachListener);
        } else {
            attachListener();
        }

        return {
            register: (handler) => {
                if (typeof handler !== 'function') return;
                handlers.push(handler);
                return () => {
                    const idx = handlers.indexOf(handler);
                    if (idx > -1) handlers.splice(idx, 1);
                };
            },
            matches: (event, pattern) => {
                const parts = pattern.toLowerCase().split('+');
                const key = parts.pop();
                const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
                const needsAlt = parts.includes('alt');
                const needsShift = parts.includes('shift');
                if (needsCtrl !== (event.ctrlKey || event.metaKey)) return false;
                if (needsAlt !== event.altKey) return false;
                if (needsShift !== event.shiftKey) return false;
                const eventKey = event.key.toLowerCase();
                const eventCode = event.code?.toLowerCase();
                return eventKey === key || eventCode === key || eventCode === `key${key}`;
            },
            disable: () => { disabled = true; },
            enable: () => { disabled = false; }
        };
    }

    createContextAPI() {
        const registry = new Map();
        let idCounter = 0;

        return {
            register: (config) => {
                const id = `ctx-${++idCounter}`;
                registry.set(id, { id, ...config });
                return () => registry.delete(id);
            },
            getItems: (context) => {
                const items = [];
                for (const [id, item] of registry) {
                    if (!context || item.context === context || item.context === 'global') {
                        items.push(item);
                    }
                }
                return items.sort((a, b) => (a.order || 100) - (b.order || 100));
            },
            clear: () => registry.clear()
        };
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await this.pluginLoader.loadAllPlugins();
            this.initialized = true;
            this.emit('api-initialized', { pluginStats: this.pluginLoader.getStats() });
        } catch (error) {
            throw error;
        }
    }

    async dispose() {
        if (!this.initialized) return;
        this.initialized = false;
    }

    // Window controls
    async fullscreen(enabled = true) {
        if (window.__WEBARCADE__) {
            await window.__WEBARCADE__.window.setFullscreen(enabled);
        }
    }

    async exit() {
        if (window.__WEBARCADE__) {
            await window.__WEBARCADE__.window.close();
        }
    }

    // Events
    emit(eventType, data) {
        document.dispatchEvent(new CustomEvent(`plugin:${eventType}`, { detail: data }));
    }

    on(eventType, callback) {
        const handler = (event) => callback(event.detail);
        document.addEventListener(`plugin:${eventType}`, handler);
        return () => document.removeEventListener(`plugin:${eventType}`, handler);
    }

    getInfo() {
        return { id: this.id, version: this.version };
    }
}

export const pluginAPI = new PluginAPI();

export function PluginAPIProvider(props) {
    return (
        <PluginAPIContext.Provider value={pluginAPI}>
            {props.children}
        </PluginAPIContext.Provider>
    );
}

export function usePluginAPI() {
    const api = useContext(PluginAPIContext);
    if (!api) throw new Error('usePluginAPI must be used within a PluginAPIProvider');
    return api;
}

export function Engine(props) {
    onMount(async () => {
        try {
            await pluginAPI.initialize();
        } catch (error) {
            console.error('Failed to start engine:', error);
        }
    });

    onCleanup(async () => {
        await pluginAPI.dispose();
    });

    return (
        <PluginAPIProvider>
            {props.children}
        </PluginAPIProvider>
    );
}

// Exports
export { createPlugin, plugin } from './Plugin.jsx';
export { bridge, api, ws, BRIDGE_API, WEBARCADE_WS } from './bridge.js';
export { componentRegistry, registry, contractIndex, ComponentType } from './registry.jsx';
export { layoutManager, layouts, activeLayoutId } from '@/api/layout';
export { PLUGIN_STATES } from './store.jsx';
export { VERSION, VERSION_NAME, VERSION_FULL } from '@/version';
