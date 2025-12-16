import { For, Show, createSignal } from 'solid-js';
import { layoutManager, activeLayoutId } from '@/api/layout';
import { IconPlus, IconX } from '@tabler/icons-solidjs';

/**
 * LayoutTabs - Horizontal tab bar for switching between layouts
 *
 * @example
 * <LayoutTabs />
 * <LayoutTabs showAdd={true} onAdd={() => createNewLayout()} />
 * <LayoutTabs closable={true} onClose={(id) => removeLayout(id)} />
 */
export function LayoutTabs(props) {
    const layouts = () => layoutManager.getAll();
    const currentId = activeLayoutId;

    const handleSwitch = (id) => {
        layoutManager.setActive(id);
    };

    return (
        <div class={`flex items-center bg-base-200 border-b border-base-300 h-9 px-1 gap-0.5 overflow-x-auto ${props.class || ''}`}>
            <For each={layouts()}>
                {(layout) => (
                    <button
                        class={`group flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t transition-colors whitespace-nowrap ${
                            currentId() === layout.id
                                ? 'bg-base-100 text-base-content border-t border-x border-base-300 -mb-px'
                                : 'text-base-content/60 hover:text-base-content hover:bg-base-300/50'
                        }`}
                        onClick={() => handleSwitch(layout.id)}
                    >
                        <span>{layout.name}</span>
                        <Show when={props.closable && currentId() !== layout.id}>
                            <span
                                class="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    props.onClose?.(layout.id);
                                }}
                            >
                                <IconX size={14} />
                            </span>
                        </Show>
                    </button>
                )}
            </For>

            <Show when={props.showAdd}>
                <button
                    class="flex items-center justify-center w-7 h-7 rounded hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
                    onClick={() => props.onAdd?.()}
                    title="Add new layout"
                >
                    <IconPlus size={16} />
                </button>
            </Show>
        </div>
    );
}

export default LayoutTabs;
