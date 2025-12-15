import { splitProps, createMemo, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { componentRegistry, ComponentType } from '@/api/plugin/registry';

/**
 * TabBar renders tabs for a set of components
 * Can be used standalone or linked to a Slot
 *
 * @example
 * <TabBar use={['editor:file1', 'editor:file2']} activeTab={activeTab()} onTabChange={setActiveTab} />
 */
export function TabBar(props) {
    const [local, others] = splitProps(props, [
        'use',
        'class',
        'activeTab',
        'onTabChange',
        'closable',
        'onClose'
    ]);

    // Get components from registry
    const tabs = createMemo(() => {
        const ids = local.use || [];
        return componentRegistry.getMany(ids).filter(c => c.type === ComponentType.PANEL);
    });

    const handleTabClick = (fullId) => {
        local.onTabChange?.(fullId);
    };

    const handleClose = (e, fullId) => {
        e.stopPropagation();
        local.onClose?.(fullId);
    };

    return (
        <div
            class={`flex bg-base-200 border-b border-base-300 h-8 items-center px-1 gap-0.5 overflow-x-auto ${local.class || ''}`}
            {...others}
        >
            <For each={tabs()}>
                {(tab) => {
                    const isActive = () => local.activeTab === tab.fullId;
                    const canClose = () => local.closable !== false && tab.closable !== false;

                    return (
                        <button
                            class={`group flex items-center px-3 py-1 text-xs rounded-t transition-colors whitespace-nowrap ${
                                isActive()
                                    ? 'bg-base-100 text-base-content'
                                    : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'
                            }`}
                            onClick={() => handleTabClick(tab.fullId)}
                        >
                            <Show when={tab.icon}>
                                <Dynamic component={tab.icon} class="w-3.5 h-3.5 mr-1.5" />
                            </Show>
                            <span>{tab.label}</span>
                            <Show when={canClose()}>
                                <span
                                    class="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-base-300"
                                    onClick={(e) => handleClose(e, tab.fullId)}
                                >
                                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </span>
                            </Show>
                        </button>
                    );
                }}
            </For>
        </div>
    );
}

export default TabBar;
