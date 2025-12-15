import { createRoot } from 'solid-js';
import { createStore, produce } from 'solid-js/store';

// Component registry using SolidJS store for granular reactivity
let registry, setRegistry;
let contractIndex, setContractIndex;

createRoot(() => {
    // Main registry: { [fullId]: componentConfig }
    [registry, setRegistry] = createStore({});

    // Contract indexes for fast lookup
    [contractIndex, setContractIndex] = createStore({
        provides: {},  // { [contract]: [fullId, ...] }
        accepts: {},   // { [contract]: [fullId, ...] }
        emits: {}      // { [contract]: [fullId, ...] }
    });
});

/**
 * Component types
 */
export const ComponentType = {
    PANEL: 'panel',
    TOOLBAR: 'toolbar',
    MENU: 'menu',
    STATUS: 'status'
};

/**
 * Registry API
 */
export const componentRegistry = {
    /**
     * Register a component
     */
    register(pluginId, componentId, config) {
        const fullId = `${pluginId}:${componentId}`;

        const component = {
            id: componentId,
            fullId,
            pluginId,
            type: config.type || ComponentType.PANEL,
            component: config.component,
            label: config.label || componentId,
            icon: config.icon || null,
            order: config.order || 0,
            contracts: {
                provides: config.contracts?.provides || [],
                accepts: config.contracts?.accepts || [],
                emits: config.contracts?.emits || []
            },
            ...this._getTypeSpecificConfig(config)
        };

        // Add to registry
        setRegistry(fullId, component);

        // Index contracts
        this._indexContracts(fullId, component.contracts);

        return fullId;
    },

    /**
     * Unregister a component
     */
    unregister(fullId) {
        const component = registry[fullId];
        if (component) {
            this._removeContractIndexes(fullId, component.contracts);
            setRegistry(produce(state => {
                delete state[fullId];
            }));
        }
    },

    /**
     * Unregister all components for a plugin
     */
    unregisterPlugin(pluginId) {
        const toRemove = Object.keys(registry).filter(
            fullId => registry[fullId]?.pluginId === pluginId
        );
        toRemove.forEach(fullId => this.unregister(fullId));
    },

    /**
     * Get a component by full ID (reactive)
     */
    get(fullId) {
        return registry[fullId];
    },

    /**
     * Get all components as array
     */
    getAll() {
        return Object.values(registry);
    },

    /**
     * Get components by type
     */
    getByType(type) {
        return Object.values(registry).filter(c => c.type === type);
    },

    /**
     * Get components by plugin
     */
    getByPlugin(pluginId) {
        return Object.values(registry).filter(c => c.pluginId === pluginId);
    },

    /**
     * Get components by full IDs
     */
    getMany(fullIds) {
        return fullIds.map(id => registry[id]).filter(Boolean);
    },

    /**
     * Find components by contract
     */
    findByContract(query) {
        const results = new Set();

        if (query.provides && contractIndex.provides[query.provides]) {
            contractIndex.provides[query.provides].forEach(id => results.add(id));
        }

        if (query.accepts && contractIndex.accepts[query.accepts]) {
            contractIndex.accepts[query.accepts].forEach(id => results.add(id));
        }

        if (query.emits && contractIndex.emits[query.emits]) {
            contractIndex.emits[query.emits].forEach(id => results.add(id));
        }

        return Array.from(results).map(id => registry[id]).filter(Boolean);
    },

    /**
     * Check if a component accepts a contract
     */
    accepts(fullId, contract) {
        return registry[fullId]?.contracts.accepts.includes(contract) || false;
    },

    /**
     * Check if a component provides a contract
     */
    provides(fullId, contract) {
        return registry[fullId]?.contracts.provides.includes(contract) || false;
    },

    /**
     * Get the raw store for reactive access in components
     */
    getStore() {
        return registry;
    },

    // Private helpers

    _getTypeSpecificConfig(config) {
        switch (config.type) {
            case ComponentType.TOOLBAR:
                return {
                    tooltip: config.tooltip || config.label,
                    onClick: config.onClick,
                    disabled: config.disabled || (() => false),
                    active: config.active || (() => false),
                    separator: config.separator || false,
                    group: config.group || 'default'
                };

            case ComponentType.MENU:
                return {
                    submenu: config.submenu || [],
                    shortcut: config.shortcut
                };

            case ComponentType.STATUS:
                return {
                    align: config.align || 'left',
                    priority: config.priority || 0
                };

            case ComponentType.PANEL:
            default:
                return {
                    closable: config.closable !== false,
                    onMount: config.onMount,
                    onUnmount: config.onUnmount,
                    onFocus: config.onFocus,
                    onBlur: config.onBlur
                };
        }
    },

    _indexContracts(fullId, componentContracts) {
        setContractIndex(produce(index => {
            componentContracts.provides.forEach(contract => {
                if (!index.provides[contract]) index.provides[contract] = [];
                if (!index.provides[contract].includes(fullId)) {
                    index.provides[contract].push(fullId);
                }
            });

            componentContracts.accepts.forEach(contract => {
                if (!index.accepts[contract]) index.accepts[contract] = [];
                if (!index.accepts[contract].includes(fullId)) {
                    index.accepts[contract].push(fullId);
                }
            });

            componentContracts.emits.forEach(contract => {
                if (!index.emits[contract]) index.emits[contract] = [];
                if (!index.emits[contract].includes(fullId)) {
                    index.emits[contract].push(fullId);
                }
            });
        }));
    },

    _removeContractIndexes(fullId, componentContracts) {
        setContractIndex(produce(index => {
            componentContracts.provides.forEach(contract => {
                if (index.provides[contract]) {
                    const idx = index.provides[contract].indexOf(fullId);
                    if (idx > -1) index.provides[contract].splice(idx, 1);
                }
            });

            componentContracts.accepts.forEach(contract => {
                if (index.accepts[contract]) {
                    const idx = index.accepts[contract].indexOf(fullId);
                    if (idx > -1) index.accepts[contract].splice(idx, 1);
                }
            });

            componentContracts.emits.forEach(contract => {
                if (index.emits[contract]) {
                    const idx = index.emits[contract].indexOf(fullId);
                    if (idx > -1) index.emits[contract].splice(idx, 1);
                }
            });
        }));
    }
};

export { registry, contractIndex };
export default componentRegistry;
