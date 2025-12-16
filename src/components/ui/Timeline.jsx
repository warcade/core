import { splitProps, For, Show } from 'solid-js';

/**
 * Timeline - Event timeline
 *
 * @example
 * <Timeline
 *   items={[
 *     { title: 'Started', description: 'Project began', time: '2024-01-01' },
 *     { title: 'Milestone 1', description: 'First release', time: '2024-02-01', variant: 'success' },
 *     { title: 'Current', description: 'Working on v2', active: true }
 *   ]}
 * />
 */
export function Timeline(props) {
    const [local, others] = splitProps(props, [
        'class',
        'items',
        'direction',
        'compact'
    ]);

    const variants = {
        default: 'bg-base-300',
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        accent: 'bg-accent',
        info: 'bg-info',
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-error'
    };

    const timelineClass = () => {
        let cls = 'timeline';
        if (local.direction === 'horizontal') cls += ' timeline-horizontal';
        else cls += ' timeline-vertical';
        if (local.compact) cls += ' timeline-compact';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <ul class={timelineClass()} {...others}>
            <For each={local.items || []}>
                {(item, index) => (
                    <li>
                        <Show when={index() > 0}>
                            <hr class={item.variant ? variants[item.variant] : ''} />
                        </Show>

                        <Show when={item.time}>
                            <div class="timeline-start text-sm opacity-60">
                                {item.time}
                            </div>
                        </Show>

                        <div class="timeline-middle">
                            <div class={`w-4 h-4 rounded-full ${
                                item.active
                                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-base-100 '
                                    : ''
                            }${variants[item.variant] || variants.default}`}>
                                <Show when={item.icon}>
                                    <span class="flex items-center justify-center w-full h-full text-xs">
                                        {item.icon}
                                    </span>
                                </Show>
                            </div>
                        </div>

                        <div class="timeline-end timeline-box">
                            <div class="font-medium">{item.title}</div>
                            <Show when={item.description}>
                                <div class="text-sm opacity-70">{item.description}</div>
                            </Show>
                            <Show when={item.content}>
                                {item.content}
                            </Show>
                        </div>

                        <Show when={index() < (local.items?.length || 0) - 1}>
                            <hr class={local.items?.[index() + 1]?.variant ? variants[local.items[index() + 1].variant] : ''} />
                        </Show>
                    </li>
                )}
            </For>
        </ul>
    );
}

export default Timeline;
