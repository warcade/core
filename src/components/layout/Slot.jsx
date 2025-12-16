import { splitProps, createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { componentRegistry, ComponentType } from '@/api/plugin/registry';

/**
 * A slot renders assigned components as tabs
 *
 * @example
 * <Slot name="sidebar" use={['explorer:tree', 'git:changes']} />
 * <Slot name="main" use={['editor:code']} size="flex" />
 */
export function Slot(props) {
    const [local, others] = splitProps(props, [
        'name',
        'use',
        'class',
        'flex',
        'size',
        'showTabs',
        'defaultTab'
    ]);

    // Get components from registry
    const components = createMemo(() => {
        const ids = local.use || [];
        return componentRegistry.getMany(ids).filter(c => c.type === ComponentType.PANEL);
    });

    // Active tab state
    const [activeTabId, setActiveTabId] = createSignal(local.defaultTab || local.use?.[0] || null);
    const [isVisible, setIsVisible] = createSignal(true);

    // Listen for slot control events
    onMount(() => {
        const ids = local.use || [];

        const handleFocus = (e) => {
            const { componentId } = e.detail;
            if (ids.includes(componentId)) {
                setActiveTabId(componentId);
                setIsVisible(true);
                // Call onFocus callback if defined
                const component = componentRegistry.get(componentId);
                component?.onFocus?.();
            }
        };

        const handleShow = (e) => {
            const { componentId } = e.detail;
            if (ids.includes(componentId)) {
                setIsVisible(true);
            }
        };

        const handleHide = (e) => {
            const { componentId } = e.detail;
            if (ids.includes(componentId)) {
                // Only hide if this is the active component
                if (activeTabId() === componentId) {
                    setIsVisible(false);
                }
            }
        };

        const handleToggle = (e) => {
            const { componentId } = e.detail;
            if (ids.includes(componentId)) {
                if (activeTabId() === componentId) {
                    setIsVisible(!isVisible());
                } else {
                    setActiveTabId(componentId);
                    setIsVisible(true);
                }
            }
        };

        document.addEventListener('slot:focus', handleFocus);
        document.addEventListener('slot:show', handleShow);
        document.addEventListener('slot:hide', handleHide);
        document.addEventListener('slot:toggle', handleToggle);

        onCleanup(() => {
            document.removeEventListener('slot:focus', handleFocus);
            document.removeEventListener('slot:show', handleShow);
            document.removeEventListener('slot:hide', handleHide);
            document.removeEventListener('slot:toggle', handleToggle);
        });
    });

    // Get active component
    const activeComponent = createMemo(() => {
        const id = activeTabId();
        if (!id) return components()[0];
        return components().find(c => c.fullId === id) || components()[0];
    });

    // Should show tabs (more than 1 component, or explicitly enabled)
    const shouldShowTabs = () => {
        if (local.showTabs === false) return false;
        if (local.showTabs === true) return true;
        return components().length > 1;
    };

    const containerStyle = () => {
        const s = { display: 'flex', 'flex-direction': 'column', overflow: 'hidden' };
        if (local.flex !== undefined) s.flex = local.flex;
        if (local.size) {
            s.width = local.size;
            s.height = local.size;
            s['flex-shrink'] = 0;
        }
        return s;
    };

    return (
        <div
            class={`slot slot-${local.name} ${local.class || ''}`}
            style={containerStyle()}
            data-slot={local.name}
            {...others}
        >
            {/* Tab bar */}
            <Show when={shouldShowTabs()}>
                <div class="flex bg-base-200 border-b border-base-300 h-8 items-center px-1 gap-0.5 flex-shrink-0">
                    <For each={components()}>
                        {(component) => (
                            <button
                                class={`px-3 py-1 text-xs rounded-t transition-colors ${
                                    activeTabId() === component.fullId
                                        ? 'bg-base-100 text-base-content'
                                        : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'
                                }`}
                                onClick={() => setActiveTabId(component.fullId)}
                            >
                                <Show when={component.icon}>
                                    <Dynamic component={component.icon} class="w-3.5 h-3.5 mr-1.5 inline-block" />
                                </Show>
                                {component.label}
                            </button>
                        )}
                    </For>
                </div>
            </Show>

            {/* Content */}
            <div class="flex-1 overflow-auto min-h-0 h-full">
                <Show when={activeComponent()}>
                    <Dynamic component={activeComponent().component} />
                </Show>
            </div>
        </div>
    );
}

export default Slot;
