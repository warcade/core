import { componentRegistry, ComponentType } from './registry';
import { bridge } from './bridge';
import { layoutManager } from '@/api/layout';

/**
 * Create a plugin with the new unified API
 *
 * @example
 * export default plugin({
 *     id: 'my-plugin',
 *     name: 'My Plugin',
 *     version: '1.0.0',
 *
 *     start(api) {
 *         // Register panel components
 *         api.register('explorer', {
 *             type: 'panel',
 *             component: Explorer,
 *             label: 'Explorer',
 *             icon: IconFolder
 *         });
 *
 *         // Register toolbar items
 *         api.register('save-btn', {
 *             type: 'toolbar',
 *             icon: IconSave,
 *             label: 'Save',
 *             onClick: () => save()
 *         });
 *
 *         // Register menu
 *         api.register('file-menu', {
 *             type: 'menu',
 *             label: 'File',
 *             submenu: [...]
 *         });
 *
 *         // Register status bar item
 *         api.register('line-count', {
 *             type: 'status',
 *             component: LineCounter,
 *             align: 'right'
 *         });
 *     },
 *
 *     stop(api) {
 *         // Cleanup
 *     }
 * });
 */
export function plugin(config) {
    const {
        id,
        name,
        version,
        description = '',
        author = '',
        start = async () => {},
        stop = async () => {}
    } = config;

    if (!id) throw new Error('Plugin must have an id');
    if (!name) throw new Error('Plugin must have a name');
    if (!version) throw new Error('Plugin must have a version');

    return function Plugin(engineAPI) {
        let initialized = false;
        let started = false;

        // Create plugin-scoped API
        const api = {
            /**
             * Register a component
             * @param {string} componentId - Unique ID within this plugin
             * @param {object} config - Component configuration
             */
            register(componentId, config) {
                return componentRegistry.register(id, componentId, config);
            },

            /**
             * Unregister a component
             */
            unregister(componentId) {
                componentRegistry.unregister(`${id}:${componentId}`);
            },

            /**
             * Get a component from the registry
             */
            getComponent(fullId) {
                return componentRegistry.get(fullId);
            },

            /**
             * Find components by contract
             */
            findByContract(query) {
                return componentRegistry.findByContract(query);
            },

            /**
             * Get the slot containing a component and control it
             */
            slot(componentId) {
                const fullId = `${id}:${componentId}`;
                return {
                    show: () => document.dispatchEvent(new CustomEvent('slot:show', { detail: { componentId: fullId } })),
                    hide: () => document.dispatchEvent(new CustomEvent('slot:hide', { detail: { componentId: fullId } })),
                    toggle: () => document.dispatchEvent(new CustomEvent('slot:toggle', { detail: { componentId: fullId } })),
                    focus: () => document.dispatchEvent(new CustomEvent('slot:focus', { detail: { componentId: fullId } }))
                };
            },

            /**
             * Layout management
             */
            layout: {
                // Switch to a different layout
                setActive: (layoutId) => layoutManager.setActive(layoutId),

                // Get current layout ID
                getActiveId: () => layoutManager.getActiveId(),

                // Get all registered layouts
                getAll: () => layoutManager.getAll(),

                // Go back to previous layout
                back: () => layoutManager.back(),

                // Check if can go back
                canGoBack: () => layoutManager.canGoBack(),

                // Register a new layout (for plugins that provide layouts)
                register: (layoutId, config) => layoutManager.register(layoutId, config),

                // Intents
                focus: () => document.dispatchEvent(new CustomEvent('layout:focus', { detail: { pluginId: id } })),
                reveal: (componentId) => document.dispatchEvent(new CustomEvent('layout:reveal', { detail: { componentId: `${id}:${componentId}` } })),
                fullscreen: (enabled = true) => engineAPI?.fullscreen?.(enabled),
                hideAll: () => document.dispatchEvent(new CustomEvent('layout:hideAll')),
                showAll: () => document.dispatchEvent(new CustomEvent('layout:showAll'))
            },

            // ==================== BRIDGE: SERVICES ====================

            provide: (name, service) => bridge.provide(name, service),
            use: (name, timeout) => bridge.use(name, timeout),
            tryUse: (name) => bridge.tryUse(name),
            hasService: (name) => bridge.hasService(name),
            unprovide: (name) => bridge.unprovide(name),

            // ==================== BRIDGE: MESSAGE BUS ====================

            subscribe: (channel, callback) => bridge.subscribe(channel, callback),
            publish: (channel, data) => bridge.publish(channel, data),
            once: (channel, callback) => bridge.once(channel, callback),
            waitFor: (channel, timeout) => bridge.waitFor(channel, timeout),
            createChannel: (channel, options) => bridge.createChannel(channel, options),

            // ==================== BRIDGE: SHARED STORE ====================

            getStore: () => bridge.getStore(),
            set: (path, value) => bridge.set(path, value),
            get: (path, defaultValue) => bridge.get(path, defaultValue),
            update: (path, updater) => bridge.update(path, updater),
            merge: (path, obj) => bridge.merge(path, obj),
            watch: (path, callback) => bridge.watch(path, callback),
            selector: (path, defaultValue) => bridge.selector(path, defaultValue),
            delete: (path) => bridge.delete(path),
            has: (path) => bridge.has(path),
            batch: (fn) => bridge.batch(fn),

            // ==================== SHORTCUTS & CONTEXT ====================

            /**
             * Keyboard shortcuts API
             * - shortcut.register(handler) - Register a keydown handler, returns unregister fn
             * - shortcut.matches(event, pattern) - Check if event matches pattern like 'ctrl+s'
             * - shortcut.disable() / shortcut.enable() - Temporarily disable/enable shortcuts
             * - shortcut({ 'ctrl+s': fn, 'ctrl+n': fn }) - Convenience: register multiple at once
             */
            shortcut: Object.assign(
                // Convenience function: api.shortcut({ 'ctrl+s': save, 'ctrl+n': newFile })
                (shortcuts) => {
                    if (!engineAPI?.shortcut) return () => {};
                    const handler = (event) => {
                        for (const [key, callback] of Object.entries(shortcuts)) {
                            if (engineAPI.shortcut.matches(event, key)) {
                                event.preventDefault();
                                event.stopPropagation();
                                callback(event);
                                break;
                            }
                        }
                    };
                    return engineAPI.shortcut.register(handler);
                },
                // Pass through the full shortcut API
                {
                    register: (handler) => engineAPI?.shortcut?.register(handler) || (() => {}),
                    matches: (event, pattern) => engineAPI?.shortcut?.matches(event, pattern) || false,
                    disable: () => engineAPI?.shortcut?.disable?.(),
                    enable: () => engineAPI?.shortcut?.enable?.()
                }
            ),

            context: (config) => {
                return engineAPI?.context?.register({ ...config, plugin: id }) || (() => {});
            },

            // ==================== EVENTS ====================

            emit: (eventType, data) => engineAPI?.emit?.(`${id}:${eventType}`, data),
            on: (eventType, callback) => engineAPI?.on?.(eventType, callback) || (() => {}),

            // ==================== WINDOW CONTROLS ====================

            fullscreen: (enabled = true) => engineAPI?.fullscreen?.(enabled),
            exit: () => engineAPI?.exit?.(),

            // ==================== PLUGIN INFO ====================

            getPluginId: () => id,
            getPluginName: () => name,
            getPluginVersion: () => version
        };

        const pluginInstance = {
            getId: () => id,
            getName: () => name,
            getVersion: () => version,
            getDescription: () => description,
            getAuthor: () => author,

            async onInit() {
                if (initialized) return;
                initialized = true;
            },

            async onStart() {
                if (!initialized) throw new Error('Plugin must be initialized before starting');
                if (started) return;

                await start(api);
                started = true;
            },

            async onStop() {
                if (!started) return;
                await stop(api);
                started = false;
            },

            async onDispose() {
                if (started) await pluginInstance.onStop();

                // Unregister all components
                componentRegistry.unregisterPlugin(id);
                initialized = false;
            },

            getStatus: () => ({
                id,
                name,
                version,
                initialized,
                started
            }),

            api
        };

        return pluginInstance;
    };
}

export const createPlugin = plugin;
