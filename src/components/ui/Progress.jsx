import { splitProps, Show } from 'solid-js';

/**
 * Progress - Progress bar/indicator
 *
 * @example
 * <Progress value={50} />
 * <Progress value={75} max={100} variant="primary" />
 * <Progress value={30} showLabel />
 * <Progress indeterminate />
 */
export function Progress(props) {
    const [local, others] = splitProps(props, [
        'class',
        'value',
        'max',
        'variant',
        'size',
        'showLabel',
        'indeterminate'
    ]);

    const variants = {
        default: 'progress-primary',
        primary: 'progress-primary',
        secondary: 'progress-secondary',
        accent: 'progress-accent',
        info: 'progress-info',
        success: 'progress-success',
        warning: 'progress-warning',
        error: 'progress-error'
    };

    const progressClass = () => {
        let cls = 'progress';
        cls += ` ${variants[local.variant] || variants.default}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const percentage = () => {
        const max = local.max || 100;
        return Math.round((local.value / max) * 100);
    };

    return (
        <div class="flex items-center gap-2">
            <progress
                class={progressClass()}
                value={local.indeterminate ? undefined : local.value}
                max={local.max || 100}
                {...others}
            />
            <Show when={local.showLabel && !local.indeterminate}>
                <span class="text-sm tabular-nums">{percentage()}%</span>
            </Show>
        </div>
    );
}

/**
 * RadialProgress - Circular progress
 *
 * @example
 * <RadialProgress value={70} />
 */
export function RadialProgress(props) {
    const [local, others] = splitProps(props, [
        'class',
        'children',
        'value',
        'size',
        'thickness'
    ]);

    const size = local.size || '4rem';
    const thickness = local.thickness || '4px';

    return (
        <div
            class={`radial-progress ${local.class || ''}`}
            style={{
                '--value': local.value,
                '--size': size,
                '--thickness': thickness
            }}
            role="progressbar"
            {...others}
        >
            {local.children ?? `${local.value}%`}
        </div>
    );
}

export default Progress;
