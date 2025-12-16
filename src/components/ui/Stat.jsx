import { splitProps, Show } from 'solid-js';

/**
 * Stat - Statistics display
 *
 * @example
 * <Stat title="Downloads" value="31K" desc="+12% this month" />
 *
 * <Stat.Group>
 *   <Stat title="Revenue" value="$4,200" />
 *   <Stat title="Users" value="1,200" />
 * </Stat.Group>
 */
export function Stat(props) {
    const [local, others] = splitProps(props, [
        'class',
        'title',
        'value',
        'desc',
        'icon',
        'trend',
        'trendValue'
    ]);

    const trendClass = () => {
        if (!local.trend) return '';
        return local.trend === 'up' ? 'text-success' : 'text-error';
    };

    const trendIcon = () => {
        if (!local.trend) return null;
        return local.trend === 'up' ? '↑' : '↓';
    };

    return (
        <div class={`stat ${local.class || ''}`} {...others}>
            <Show when={local.icon}>
                <div class="stat-figure text-primary">
                    {local.icon}
                </div>
            </Show>
            <div class="stat-title">{local.title}</div>
            <div class="stat-value">{local.value}</div>
            <Show when={local.desc || local.trendValue}>
                <div class={`stat-desc ${trendClass()}`}>
                    <Show when={local.trendValue}>
                        {trendIcon()} {local.trendValue}
                    </Show>
                    <Show when={local.desc && local.trendValue}> </Show>
                    {local.desc}
                </div>
            </Show>
        </div>
    );
}

// Stat Group
Stat.Group = function StatGroup(props) {
    return (
        <div class={`stats shadow ${props.class || ''}`} {...props}>
            {props.children}
        </div>
    );
};

export default Stat;
