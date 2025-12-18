import { createSignal, createEffect, createMemo, onCleanup, createContext, useContext, untrack } from 'solid-js';
import { bridge } from './bridge.js';

/**
 * Plugin Hooks - Generic reactive patterns for plugin development
 *
 * These hooks are FRAMEWORK-LEVEL utilities that work with ANY plugin.
 * They reduce boilerplate and provide consistent patterns for:
 * - Service access with automatic ready-state handling
 * - Event subscriptions with auto-cleanup
 * - Store access with reactivity
 *
 * NOTE: Plugin-specific hooks (like useEngine, useBabylon) should be
 * defined IN THE PLUGIN ITSELF, not here. This keeps the framework generic.
 */

// ============================================================================
// SERVICE HOOKS (Generic)
// ============================================================================

/**
 * Use a required service - throws if not available after timeout
 * Use this when your component CANNOT function without the service
 *
 * @example
 * const myService = useService('my-plugin-service');
 */
export function useService(serviceName, timeout = 5000) {
    const [service, setService] = createSignal(null);
    const [error, setError] = createSignal(null);

    createEffect(() => {
        let cancelled = false;

        bridge.use(serviceName, timeout)
            .then(svc => {
                if (!cancelled) setService(svc);
            })
            .catch(err => {
                if (!cancelled) setError(err);
            });

        onCleanup(() => { cancelled = true; });
    });

    // Return a getter that throws if service not ready
    return () => {
        const err = error();
        if (err) throw err;
        const svc = service();
        if (!svc) throw new Error(`Service '${serviceName}' not ready yet`);
        return svc;
    };
}

/**
 * Use an optional service - returns null if not available
 * Use this when your component can function without the service
 *
 * @example
 * const optionalService = useOptionalService('optional-plugin');
 * if (optionalService()) { ... }
 */
export function useOptionalService(serviceName) {
    const [service, setService] = createSignal(bridge.tryUse(serviceName));

    createEffect(() => {
        // Check periodically until service is available
        const check = () => {
            const svc = bridge.tryUse(serviceName);
            if (svc && !service()) {
                setService(svc);
            }
        };

        check();
        const interval = setInterval(check, 100);

        // Also listen for service provision
        const unsub = bridge.subscribe(`service:${serviceName}:provided`, () => {
            setService(bridge.tryUse(serviceName));
        });

        onCleanup(() => {
            clearInterval(interval);
            unsub();
        });
    });

    return service;
}

/**
 * Wait for a service to be ready, then run a callback
 * Returns a signal indicating ready state
 *
 * @example
 * const ready = useServiceReady('my-service', (service) => {
 *     console.log('Service ready!', service);
 * });
 */
export function useServiceReady(serviceName, onReady) {
    const [ready, setReady] = createSignal(false);

    createEffect(() => {
        let cancelled = false;

        const check = () => {
            const svc = bridge.tryUse(serviceName);
            if (svc && !cancelled) {
                setReady(true);
                onReady?.(svc);
                return true;
            }
            return false;
        };

        if (!check()) {
            const interval = setInterval(() => {
                if (check()) clearInterval(interval);
            }, 100);

            onCleanup(() => {
                cancelled = true;
                clearInterval(interval);
            });
        }
    });

    return ready;
}

/**
 * Use any service with automatic reactivity
 *
 * This is the recommended way to access services from other plugins.
 * Returns a proxy that:
 * - Automatically waits for the service to be available
 * - Forwards all property access to the underlying service
 * - Maintains reactivity for signal properties
 *
 * @example
 * const engine = useReactiveService('renzoraEngineCore');
 *
 * // In JSX - automatically reactive
 * <div>{engine.meshes().length} meshes</div>
 * <div>Selected: {engine.selectedObject()?.name}</div>
 *
 * // Call methods
 * engine.select(someMesh);
 *
 * @param {string} serviceName - The service name to use
 * @returns {Proxy} A reactive proxy to the service
 */
export function useReactiveService(serviceName) {
    const [service, setService] = createSignal(bridge.tryUse(serviceName));

    createEffect(() => {
        if (service()) return;

        // Poll until service is available
        const check = () => {
            const svc = bridge.tryUse(serviceName);
            if (svc) {
                setService(svc);
                return true;
            }
            return false;
        };

        const interval = setInterval(() => {
            if (check()) clearInterval(interval);
        }, 50);

        onCleanup(() => clearInterval(interval));
    });

    // Return a proxy that forwards all access to the service
    return new Proxy({}, {
        get(_, prop) {
            // Access service() inside the getter - this creates reactivity
            // When service changes from null to available, SolidJS re-runs
            const svc = service();
            if (!svc) {
                // Return a no-op function for missing service
                // This prevents errors when service isn't ready yet
                return () => undefined;
            }

            const value = svc[prop];

            // If it's a function (signal getter, method, or class)
            if (typeof value === 'function') {
                // Check if it's likely a class constructor.
                // We need to detect classes because:
                // 1. Class constructors cannot be invoked without 'new'
                // 2. Binding a class loses static methods/properties
                const proto = value.prototype;
                if (proto && proto.constructor === value) {
                    const protoKeys = Object.getOwnPropertyNames(proto);
                    const staticKeys = Object.getOwnPropertyNames(value);
                    // Likely a class if:
                    // - Has instance methods (prototype has more than constructor)
                    // - Has static properties/methods (more than length, name, prototype)
                    // - Has name starting with uppercase (convention)
                    const hasInstanceMethods = protoKeys.length > 1;
                    const hasStaticMembers = staticKeys.length > 3; // length, name, prototype are default
                    const startsWithUppercase = value.name && /^[A-Z]/.test(value.name);

                    if (hasInstanceMethods || hasStaticMembers || startsWithUppercase) {
                        return value; // Return class directly, don't bind
                    }
                }
                // Regular functions and signals - bind to service context
                return value.bind(svc);
            }

            // For non-function properties, wrap in a getter for consistency
            // This allows consumers to always use () pattern
            return () => value;
        },

        // Support checking if service is ready
        has(_, prop) {
            if (prop === 'ready') return true;
            const svc = service();
            return svc ? prop in svc : false;
        }
    });
}

// ============================================================================
// EVENT HOOKS (Generic)
// ============================================================================

/**
 * Subscribe to an event channel with auto-cleanup
 *
 * @example
 * useEvent('engine:selectionChanged', (data) => {
 *     console.log('Selection changed:', data.mesh);
 * });
 */
export function useEvent(channel, callback) {
    createEffect(() => {
        const unsub = bridge.subscribe(channel, callback);
        onCleanup(unsub);
    });
}

/**
 * Publish to an event channel
 * Returns a function that publishes
 *
 * @example
 * const publish = usePublish('my:event');
 * publish({ foo: 'bar' });
 */
export function usePublish(channel) {
    return (data, meta) => bridge.publish(channel, data, meta);
}

// ============================================================================
// STORE HOOKS
// ============================================================================

/**
 * Use a value from the shared store with reactivity
 *
 * @example
 * const [theme, setTheme] = useStore('settings.theme', 'dark');
 */
export function useStore(path, defaultValue) {
    const [value, setValue] = createSignal(bridge.get(path, defaultValue));

    createEffect(() => {
        const unsub = bridge.watch(path, (newValue) => {
            setValue(newValue !== undefined ? newValue : defaultValue);
        });
        onCleanup(unsub);
    });

    const setter = (newValue) => {
        bridge.set(path, newValue);
    };

    return [value, setter];
}

/**
 * Create a derived/computed value from store
 *
 * @example
 * const fullName = useStoreSelector(
 *     (store) => `${store.user?.firstName} ${store.user?.lastName}`
 * );
 */
export function useStoreSelector(selector) {
    return createMemo(() => selector(bridge.getStore()));
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Create a debounced version of a function
 */
export function useDebounce(fn, delay = 300) {
    let timeoutId;

    onCleanup(() => clearTimeout(timeoutId));

    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Create a throttled version of a function
 */
export function useThrottle(fn, delay = 100) {
    let lastCall = 0;
    let timeoutId;

    onCleanup(() => clearTimeout(timeoutId));

    return (...args) => {
        const now = Date.now();
        const remaining = delay - (now - lastCall);

        if (remaining <= 0) {
            lastCall = now;
            fn(...args);
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                fn(...args);
            }, remaining);
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    useService,
    useOptionalService,
    useServiceReady,
    useReactiveService,
    useEvent,
    usePublish,
    useStore,
    useStoreSelector,
    useDebounce,
    useThrottle,
};
