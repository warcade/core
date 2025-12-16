import { For, Show, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { componentRegistry } from '@/api/plugin/registry';

/**
 * ActivityBar - Vertical icon menu (like VS Code's activity bar)
 *
 * Renders toolbar items vertically as icon-only buttons.
 */
export function ActivityBar(props) {
    const items = createMemo(() => {
        const ids = props.use || [];
        return ids
            .map(id => componentRegistry.get(id))
            .filter(Boolean);
    });

    return (
        <div class={`flex flex-col items-center py-2 bg-base-300 ${props.class || ''}`}>
            <For each={items()}>
                {(item) => (
                    <Show when={item.icon}>
                        <button
                            class={`p-2 rounded transition-colors mb-1 ${
                                typeof item.active === 'function' && item.active()
                                    ? 'bg-primary/20 text-primary'
                                    : 'hover:bg-base-100 text-base-content/70 hover:text-base-content'
                            } ${typeof item.disabled === 'function' && item.disabled() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => item.onClick?.()}
                            disabled={typeof item.disabled === 'function' && item.disabled()}
                            title={item.tooltip}
                        >
                            <Dynamic component={item.icon} class="w-5 h-5" />
                        </button>
                    </Show>
                )}
            </For>
            {props.children}
        </div>
    );
}

export default ActivityBar;
