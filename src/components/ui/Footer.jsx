import { splitProps, createMemo, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { componentRegistry, ComponentType } from '@/api/plugin/registry';
import { VERSION_FULL } from '@/version';

/**
 * Footer/status bar renders status items from the registry
 *
 * @example
 * <Footer use={['line-count', 'git-branch', 'errors']} />
 * <Footer /> // renders all type: 'status' components
 */
export function Footer(props) {
    const [local, others] = splitProps(props, ['use', 'exclude', 'class', 'children', 'showVersion']);

    // Get status items from registry
    const items = createMemo(() => {
        let components;

        if (local.use) {
            components = componentRegistry.getMany(local.use);
        } else {
            components = componentRegistry.getByType(ComponentType.STATUS);
        }

        if (local.exclude) {
            components = components.filter(c => !local.exclude.includes(c.fullId));
        }

        return components.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    });

    // Split by alignment
    const leftItems = createMemo(() => items().filter(i => i.align !== 'right'));
    const rightItems = createMemo(() => items().filter(i => i.align === 'right'));

    return (
        <div
            class={`flex items-center justify-between bg-base-200 border-t border-base-300 h-6 px-2 text-xs ${local.class || ''}`}
            {...others}
        >
            <div class="flex items-center gap-3">
                <For each={leftItems()}>
                    {(item) => (
                        <Dynamic component={item.component} />
                    )}
                </For>
            </div>

            {/* Allow additional children in the middle */}
            {local.children}

            <div class="flex items-center gap-3">
                <For each={rightItems()}>
                    {(item) => (
                        <Dynamic component={item.component} />
                    )}
                </For>
                <Show when={local.showVersion !== false}>
                    <span class="text-base-content/40 select-none">{VERSION_FULL}</span>
                </Show>
            </div>
        </div>
    );
}

export default Footer;
