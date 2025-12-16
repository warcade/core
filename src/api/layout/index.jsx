import { createSignal, createMemo, createRoot } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

let layouts, setLayouts;
let activeLayoutId, setActiveLayoutId;
let layoutHistory, setLayoutHistory;

createRoot(() => {
    // Registered layouts: { [id]: { component, name, icon, slots } }
    [layouts, setLayouts] = createStore({});

    // Currently active layout
    [activeLayoutId, setActiveLayoutId] = createSignal(null);

    // Layout history for back/forward navigation
    [layoutHistory, setLayoutHistory] = createSignal([]);
});

/**
 * Layout Manager API
 *
 * Register layouts and switch between them at runtime.
 * Each layout defines its own structure and slot assignments.
 *
 * @example
 * // Register layouts
 * layoutManager.register('engine', {
 *     name: 'Engine',
 *     component: EngineLayout,
 *     icon: IconEngine
 * });
 *
 * layoutManager.register('material-editor', {
 *     name: 'Material Editor',
 *     component: MaterialEditorLayout,
 *     icon: IconPalette
 * });
 *
 * // Switch layouts
 * layoutManager.setActive('material-editor');
 *
 * // Go back to previous layout
 * layoutManager.back();
 */
export const layoutManager = {
    /**
     * Register a layout
     * @param {string} id - Unique layout ID
     * @param {object} config - Layout configuration
     * @param {Component} config.component - The layout component (uses Row, Column, Slot, etc.)
     * @param {string} config.name - Display name
     * @param {Component} [config.icon] - Optional icon component
     * @param {object} [config.slots] - Default slot assignments (can be overridden)
     */
    register(id, config) {
        setLayouts(id, {
            id,
            component: config.component,
            name: config.name || id,
            description: config.description || '',
            icon: config.icon || null,
            slots: config.slots || {},
            order: config.order || 0
        });

        // If this is the first layout, activate it
        if (!activeLayoutId()) {
            setActiveLayoutId(id);
        }

        return id;
    },

    /**
     * Unregister a layout
     */
    unregister(id) {
        setLayouts(produce(state => {
            delete state[id];
        }));

        // If we removed the active layout, switch to another
        if (activeLayoutId() === id) {
            const remaining = Object.keys(layouts);
            if (remaining.length > 0) {
                setActiveLayoutId(remaining[0]);
            } else {
                setActiveLayoutId(null);
            }
        }
    },

    /**
     * Set active layout
     */
    setActive(id, addToHistory = true) {
        if (!layouts[id]) {
            console.warn(`[LayoutManager] Layout "${id}" not found`);
            return false;
        }

        const previousId = activeLayoutId();

        // Add to history for back navigation
        if (addToHistory && previousId && previousId !== id) {
            setLayoutHistory(prev => [...prev, previousId]);
        }

        setActiveLayoutId(id);

        // Emit layout change event
        document.dispatchEvent(new CustomEvent('layout:change', {
            detail: { from: previousId, to: id }
        }));

        return true;
    },

    /**
     * Get active layout ID
     */
    getActiveId() {
        return activeLayoutId();
    },

    /**
     * Get active layout config
     */
    getActive() {
        return layouts[activeLayoutId()];
    },

    /**
     * Get active layout component
     */
    getActiveComponent() {
        return layouts[activeLayoutId()]?.component;
    },

    /**
     * Get a layout by ID
     */
    get(id) {
        return layouts[id];
    },

    /**
     * Get all registered layouts
     */
    getAll() {
        return Object.values(layouts).sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    /**
     * Go back to previous layout
     */
    back() {
        const history = layoutHistory();
        if (history.length === 0) return false;

        const previousId = history[history.length - 1];
        setLayoutHistory(prev => prev.slice(0, -1));

        return this.setActive(previousId, false);
    },

    /**
     * Check if we can go back
     */
    canGoBack() {
        return layoutHistory().length > 0;
    },

    /**
     * Update slot assignments for a layout
     */
    setSlots(layoutId, slots) {
        if (!layouts[layoutId]) return false;

        setLayouts(layoutId, 'slots', slots);
        return true;
    },

    /**
     * Get slot assignments for a layout
     */
    getSlots(layoutId) {
        return layouts[layoutId]?.slots || {};
    },

    /**
     * Get reactive signals for use in components
     */
    signals: {
        activeId: activeLayoutId,
        layouts: () => layouts,
        history: layoutHistory,
        canGoBack: () => layoutHistory().length > 0
    }
};

// Export signals for reactive access
export { layouts, activeLayoutId, layoutHistory };

export default layoutManager;
