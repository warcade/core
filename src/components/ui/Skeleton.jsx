import { splitProps, Show, For } from 'solid-js';

/**
 * Skeleton - Loading placeholder
 *
 * @example
 * <Skeleton width="100%" height="20px" />
 * <Skeleton variant="circle" size="48px" />
 * <Skeleton variant="text" lines={3} />
 * <Skeleton.Card />
 */
export function Skeleton(props) {
    const [local, others] = splitProps(props, [
        'class',
        'variant',
        'width',
        'height',
        'size',
        'lines',
        'animated'
    ]);

    const baseClass = () => {
        let cls = 'skeleton';
        if (local.animated !== false) cls += ' animate-pulse';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    // Text variant - multiple lines
    if (local.variant === 'text') {
        const lineCount = local.lines || 3;
        return (
            <div class="space-y-2" {...others}>
                <For each={Array(lineCount).fill(0)}>
                    {(_, i) => (
                        <div
                            class={baseClass()}
                            style={{
                                height: local.height || '1rem',
                                width: i() === lineCount - 1 ? '75%' : '100%'
                            }}
                        />
                    )}
                </For>
            </div>
        );
    }

    // Circle variant
    if (local.variant === 'circle') {
        const size = local.size || '48px';
        return (
            <div
                class={`${baseClass()} rounded-full`}
                style={{ width: size, height: size }}
                {...others}
            />
        );
    }

    // Default rectangle
    return (
        <div
            class={baseClass()}
            style={{
                width: local.width || '100%',
                height: local.height || '1rem'
            }}
            {...others}
        />
    );
}

// Pre-built skeleton patterns
Skeleton.Card = function SkeletonCard(props) {
    return (
        <div class={`card bg-base-200 ${props.class || ''}`}>
            <Skeleton height="200px" class="rounded-t-xl" />
            <div class="card-body">
                <Skeleton height="1.5rem" width="60%" />
                <Skeleton variant="text" lines={2} />
                <div class="card-actions justify-end mt-2">
                    <Skeleton width="80px" height="2.5rem" class="rounded-lg" />
                </div>
            </div>
        </div>
    );
};

Skeleton.Avatar = function SkeletonAvatar(props) {
    return (
        <div class={`flex items-center gap-3 ${props.class || ''}`}>
            <Skeleton variant="circle" size={props.size || '48px'} />
            <div class="flex-1">
                <Skeleton height="1rem" width="60%" />
                <Skeleton height="0.75rem" width="40%" class="mt-2" />
            </div>
        </div>
    );
};

Skeleton.Table = function SkeletonTable(props) {
    const rows = props.rows || 5;
    const cols = props.cols || 4;
    return (
        <div class={`space-y-2 ${props.class || ''}`}>
            <For each={Array(rows).fill(0)}>
                {() => (
                    <div class="flex gap-4">
                        <For each={Array(cols).fill(0)}>
                            {() => <Skeleton height="2rem" class="flex-1" />}
                        </For>
                    </div>
                )}
            </For>
        </div>
    );
};

export default Skeleton;
