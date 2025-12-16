import { splitProps, Show } from 'solid-js';

/**
 * EmptyState - Empty/placeholder state display
 *
 * @example
 * <EmptyState
 *   icon="📭"
 *   title="No messages"
 *   description="You don't have any messages yet"
 * />
 *
 * <EmptyState
 *   icon={<SearchIcon />}
 *   title="No results"
 *   description="Try adjusting your search"
 *   action={<button class="btn btn-primary">Clear filters</button>}
 * />
 */
export function EmptyState(props) {
    const [local, others] = splitProps(props, [
        'class',
        'icon',
        'title',
        'description',
        'action',
        'size'
    ]);

    const sizes = {
        sm: { icon: 'text-3xl', title: 'text-lg', desc: 'text-sm' },
        md: { icon: 'text-5xl', title: 'text-xl', desc: 'text-base' },
        lg: { icon: 'text-7xl', title: 'text-2xl', desc: 'text-lg' }
    };

    const size = sizes[local.size] || sizes.md;

    return (
        <div
            class={`flex flex-col items-center justify-center text-center p-8 ${local.class || ''}`}
            {...others}
        >
            <Show when={local.icon}>
                <div class={`${size.icon} mb-4 opacity-50`}>
                    {local.icon}
                </div>
            </Show>
            <Show when={local.title}>
                <h3 class={`${size.title} font-semibold mb-2`}>
                    {local.title}
                </h3>
            </Show>
            <Show when={local.description}>
                <p class={`${size.desc} opacity-60 max-w-sm`}>
                    {local.description}
                </p>
            </Show>
            <Show when={local.action}>
                <div class="mt-4">
                    {local.action}
                </div>
            </Show>
        </div>
    );
}

export default EmptyState;
