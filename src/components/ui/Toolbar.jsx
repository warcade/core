import { splitProps, createMemo, Show, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { componentRegistry, ComponentType } from '@/api/plugin/registry';

/**
 * Toolbar renders toolbar items from the registry
 *
 * @example
 * <Toolbar use={['save-btn', 'undo-btn', 'redo-btn']} />
 * <Toolbar /> // renders all type: 'toolbar' components
 */
export function Toolbar(props) {
    const [local, others] = splitProps(props, ['use', 'exclude', 'class', 'children']);

    // Get toolbar items from registry
    const items = createMemo(() => {
        let components;

        if (local.use) {
            // Explicit list
            components = componentRegistry.getMany(local.use);
        } else {
            // Auto-pull all toolbar type
            components = componentRegistry.getByType(ComponentType.TOOLBAR);
        }

        // Apply exclusions
        if (local.exclude) {
            components = components.filter(c => !local.exclude.includes(c.fullId));
        }

        // Sort by order, then group
        return components.sort((a, b) => {
            if (a.group !== b.group) return (a.group || '').localeCompare(b.group || '');
            return (a.order || 0) - (b.order || 0);
        });
    });

    // Group items
    const groupedItems = createMemo(() => {
        const groups = new Map();
        items().forEach(item => {
            const group = item.group || 'default';
            if (!groups.has(group)) groups.set(group, []);
            groups.get(group).push(item);
        });
        return Array.from(groups.entries());
    });

    return (
        <div
            class={`flex items-center bg-base-200 border-b border-base-300 h-9 px-2 gap-1 ${local.class || ''}`}
            {...others}
        >
            <For each={groupedItems()}>
                {([groupName, groupItems], groupIndex) => (
                    <>
                        <Show when={groupIndex() > 0}>
                            <div class="w-px h-5 bg-base-300 mx-1" />
                        </Show>
                        <For each={groupItems}>
                            {(item) => (
                                <>
                                    <Show when={item.component}>
                                        <Dynamic component={item.component} />
                                    </Show>
                                    <Show when={!item.component && item.icon}>
                                        <button
                                            class={`p-1.5 rounded transition-colors ${
                                                typeof item.active === 'function' && item.active()
                                                    ? 'bg-primary/20 text-primary'
                                                    : 'hover:bg-base-300 text-base-content/70 hover:text-base-content'
                                            } ${typeof item.disabled === 'function' && item.disabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={() => item.onClick?.()}
                                            disabled={typeof item.disabled === 'function' && item.disabled()}
                                            title={item.tooltip}
                                        >
                                            <Dynamic component={item.icon} class="w-4 h-4" />
                                        </button>
                                    </Show>
                                    <Show when={item.separator}>
                                        <div class="w-px h-5 bg-base-300 mx-1" />
                                    </Show>
                                </>
                            )}
                        </For>
                    </>
                )}
            </For>

            {/* Allow additional children (like DragRegion, WindowControls) */}
            {local.children}
        </div>
    );
}

export default Toolbar;
