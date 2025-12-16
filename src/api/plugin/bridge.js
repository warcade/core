import { createSignal, createEffect, batch } from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';

// HTTP API Configuration
export const BRIDGE_API = 'http://localhost:3001';
export const WEBARCADE_WS = 'ws://localhost:3002';

/**
 * HTTP API helper for backend communication
 */
export async function api(path, options = {}) {
    const url = `${BRIDGE_API}/${path}`;
    return fetch(url, options);
}

// WebSocket instance
let wsInstance = null;

/**
 * Get or create WebSocket connection
 */
export function ws() {
    if (!wsInstance || wsInstance.readyState === WebSocket.CLOSED || wsInstance.readyState === WebSocket.CLOSING) {
        wsInstance = new WebSocket(WEBARCADE_WS);
    }
    return wsInstance;
}

/**
 * Plugin Bridge - Inter-plugin communication system
 *
 * Provides three communication patterns:
 * 1. Services - Share objects/functions between plugins
 * 2. Messages - Pub/sub with guaranteed delivery (queues messages until listener ready)
 * 3. Store - Shared reactive state using SolidJS store for granular updates
 */
class PluginBridge {
    constructor() {
        // Services registry
        this.services = new Map();
        this.serviceWaiters = new Map();

        // Message bus
        this.channels = new Map();
        this.messageQueue = new Map();
        this.channelOptions = new Map();

        // Shared store - using SolidJS createStore for granular reactivity
        const [store, setStore] = createStore({});
        this._store = store;
        this._setStore = setStore;

        // Store subscribers (for non-SolidJS usage)
        this.storeSubscribers = new Map();
    }

    // ==================== SERVICES ====================

    /**
     * Register a service that other plugins can use
     * @param {string} name - Service name
     * @param {any} service - The service object/function
     */
    provide(name, service) {
        this.services.set(name, service);
        console.log(`[Bridge] Service provided: ${name}`);

        // Resolve any plugins waiting for this service
        const waiters = this.serviceWaiters.get(name);
        if (waiters) {
            waiters.forEach(resolve => resolve(service));
            this.serviceWaiters.delete(name);
        }
    }

    /**
     * Get a service (waits if not yet available)
     * @param {string} name - Service name
     * @param {number} timeout - Max wait time in ms (default 10000)
     * @returns {Promise<any>} The service
     */
    async use(name, timeout = 10000) {
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                const waiters = this.serviceWaiters.get(name);
                if (waiters) {
                    waiters.delete(wrappedResolve);
                }
                reject(new Error(`[Bridge] Timeout waiting for service: ${name}`));
            }, timeout);

            const wrappedResolve = (service) => {
                clearTimeout(timeoutId);
                resolve(service);
            };

            if (!this.serviceWaiters.has(name)) {
                this.serviceWaiters.set(name, new Set());
            }
            this.serviceWaiters.get(name).add(wrappedResolve);
        });
    }

    /**
     * Check if a service exists (non-blocking)
     */
    hasService(name) {
        return this.services.has(name);
    }

    /**
     * Get a service if it exists, otherwise return null (non-blocking)
     */
    tryUse(name) {
        return this.services.get(name) || null;
    }

    /**
     * Remove a service
     */
    unprovide(name) {
        this.services.delete(name);
        console.log(`[Bridge] Service removed: ${name}`);
    }

    // ==================== MESSAGE BUS ====================

    /**
     * Create or configure a channel
     * @param {string} channel - Channel name
     * @param {object} options - { replay: number } - how many messages to replay to new subscribers
     */
    createChannel(channel, options = {}) {
        this.channelOptions.set(channel, options);
        if (options.replay && !this.messageQueue.has(channel)) {
            this.messageQueue.set(channel, []);
        }
    }

    /**
     * Subscribe to a channel
     * @param {string} channel - Channel name
     * @param {function} callback - Called with (data, meta) when message received
     * @returns {function} Unsubscribe function
     */
    subscribe(channel, callback) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        this.channels.get(channel).add(callback);

        // Replay queued messages if channel has replay enabled
        const options = this.channelOptions.get(channel);
        if (options?.replay) {
            const queue = this.messageQueue.get(channel) || [];
            queue.forEach(({ data, meta }) => {
                try {
                    callback(data, meta);
                } catch (err) {
                    console.error(`[Bridge] Error in replay callback for ${channel}:`, err);
                }
            });
        }

        return () => {
            const subs = this.channels.get(channel);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    /**
     * Publish a message to a channel
     * @param {string} channel - Channel name
     * @param {any} data - Message data
     * @param {object} meta - Optional metadata
     */
    publish(channel, data, meta = {}) {
        const fullMeta = {
            ...meta,
            timestamp: Date.now(),
            channel
        };

        // Queue message if replay is enabled
        const options = this.channelOptions.get(channel);
        if (options?.replay) {
            if (!this.messageQueue.has(channel)) {
                this.messageQueue.set(channel, []);
            }
            const queue = this.messageQueue.get(channel);
            queue.push({ data, meta: fullMeta });
            while (queue.length > options.replay) {
                queue.shift();
            }
        }

        // Deliver to subscribers
        const subs = this.channels.get(channel);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(data, fullMeta);
                } catch (err) {
                    console.error(`[Bridge] Error in subscriber for ${channel}:`, err);
                }
            });
        }
    }

    /**
     * One-time subscription
     */
    once(channel, callback) {
        const unsubscribe = this.subscribe(channel, (data, meta) => {
            unsubscribe();
            callback(data, meta);
        });
        return unsubscribe;
    }

    /**
     * Wait for a message (Promise-based)
     */
    waitFor(channel, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                unsubscribe();
                reject(new Error(`[Bridge] Timeout waiting for message on: ${channel}`));
            }, timeout);

            const unsubscribe = this.once(channel, (data, meta) => {
                clearTimeout(timeoutId);
                resolve({ data, meta });
            });
        });
    }

    // ==================== SHARED STORE (SolidJS) ====================

    /**
     * Get the raw SolidJS store (for direct access in components)
     * @returns {Store} The reactive store
     */
    getStore() {
        return this._store;
    }

    /**
     * Set a value using dot-notation path
     * Supports: 'player.health', 'settings.audio.volume', etc.
     * @param {string} path - Dot-notation path
     * @param {any} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const oldValue = this.get(path);

        this._setStore(
            produce((store) => {
                let current = store;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    if (current[key] === undefined) {
                        current[key] = {};
                    }
                    current = current[key];
                }
                current[keys[keys.length - 1]] = value;
            })
        );

        // Notify manual subscribers
        this._notifySubscribers(path, value, oldValue);
    }

    /**
     * Get a value using dot-notation path
     * @param {string} path - Dot-notation path
     * @param {any} defaultValue - Default if path doesn't exist
     * @returns {any}
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let current = this._store;

        for (const key of keys) {
            if (current === undefined || current === null) {
                return defaultValue;
            }
            current = current[key];
        }

        return current !== undefined ? current : defaultValue;
    }

    /**
     * Update a value using a function (for immutable updates)
     * @param {string} path - Dot-notation path
     * @param {function} updater - Function that receives old value and returns new value
     */
    update(path, updater) {
        const oldValue = this.get(path);
        const newValue = updater(oldValue);
        this.set(path, newValue);
    }

    /**
     * Merge an object into a path (shallow merge)
     * @param {string} path - Dot-notation path
     * @param {object} obj - Object to merge
     */
    merge(path, obj) {
        const current = this.get(path, {});
        this.set(path, { ...current, ...obj });
    }

    /**
     * Subscribe to store changes at a specific path
     * @param {string} path - Dot-notation path to watch
     * @param {function} callback - Called with (newValue, oldValue, path)
     * @returns {function} Unsubscribe function
     */
    watch(path, callback) {
        if (!this.storeSubscribers.has(path)) {
            this.storeSubscribers.set(path, new Set());
        }
        this.storeSubscribers.get(path).add(callback);

        return () => {
            const subs = this.storeSubscribers.get(path);
            if (subs) {
                subs.delete(callback);
            }
        };
    }

    /**
     * Create a SolidJS effect that tracks a path
     * Use this inside components for automatic reactivity
     * @param {string} path - Dot-notation path
     * @param {function} callback - Called when value changes
     * @returns {function} Cleanup function
     */
    createEffect(path, callback) {
        const cleanup = createEffect(() => {
            const value = this.get(path);
            callback(value);
        });
        return cleanup;
    }

    /**
     * Get a reactive selector for use in SolidJS components
     * Returns a signal accessor that automatically tracks the store value
     * @param {string} path - Dot-notation path
     * @param {any} defaultValue - Default value
     * @returns {function} Signal accessor function
     */
    selector(path, defaultValue = undefined) {
        // Create a signal that tracks the store value
        const [value, setValue] = createSignal(this.get(path, defaultValue));

        // Watch for changes and update the signal
        this.watch(path, (newValue) => {
            setValue(newValue !== undefined ? newValue : defaultValue);
        });

        return value;
    }

    /**
     * Delete a path from the store
     * @param {string} path - Dot-notation path
     */
    delete(path) {
        const keys = path.split('.');
        const oldValue = this.get(path);

        if (keys.length === 1) {
            this._setStore(
                produce((store) => {
                    delete store[keys[0]];
                })
            );
        } else {
            this._setStore(
                produce((store) => {
                    let current = store;
                    for (const k of keys.slice(0, -1)) {
                        if (current[k] === undefined) return;
                        current = current[k];
                    }
                    delete current[keys[keys.length - 1]];
                })
            );
        }

        this._notifySubscribers(path, undefined, oldValue);
    }

    /**
     * Check if a path exists in the store
     */
    has(path) {
        return this.get(path) !== undefined;
    }

    /**
     * Get all top-level keys in the store
     */
    keys() {
        return Object.keys(this._store);
    }

    /**
     * Reset a path to an initial value (or delete if no value provided)
     */
    reset(path, initialValue = undefined) {
        if (initialValue !== undefined) {
            this.set(path, initialValue);
        } else {
            this.delete(path);
        }
    }

    /**
     * Batch multiple store updates for better performance
     * @param {function} fn - Function containing multiple set() calls
     */
    batch(fn) {
        batch(fn);
    }

    // Private: notify manual subscribers
    _notifySubscribers(path, newValue, oldValue) {
        // Notify exact path subscribers
        const subs = this.storeSubscribers.get(path);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (err) {
                    console.error(`[Bridge] Error in store subscriber for ${path}:`, err);
                }
            });
        }

        // Also notify parent path subscribers
        const keys = path.split('.');
        for (let i = keys.length - 1; i > 0; i--) {
            const parentPath = keys.slice(0, i).join('.');
            const parentSubs = this.storeSubscribers.get(parentPath);
            if (parentSubs) {
                const parentValue = this.get(parentPath);
                parentSubs.forEach(callback => {
                    try {
                        callback(parentValue, undefined, parentPath);
                    } catch (err) {
                        console.error(`[Bridge] Error in store subscriber for ${parentPath}:`, err);
                    }
                });
            }
        }
    }

    // ==================== CLEANUP ====================

    /**
     * Clean up resources for a specific plugin
     */
    cleanupPlugin(pluginId) {
        // Plugins should clean up their own subscriptions
        // This can be extended to track plugin-specific resources
    }

    /**
     * Reset all state
     */
    resetAll() {
        this.services.clear();
        this.serviceWaiters.clear();
        this.channels.clear();
        this.messageQueue.clear();
        this.channelOptions.clear();
        this._setStore(reconcile({}));
        this.storeSubscribers.clear();
    }
}

// Singleton instance
export const bridge = new PluginBridge();

export default bridge;
