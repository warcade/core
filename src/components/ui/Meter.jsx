import { splitProps, Show } from 'solid-js';

/**
 * Meter - Gauge/meter display
 *
 * @example
 * <Meter value={75} />
 * <Meter value={30} min={0} max={100} label="CPU" />
 * <Meter value={diskUsage} variant="warning" showValue suffix="GB" />
 */
export function Meter(props) {
    const [local, others] = splitProps(props, [
        'class',
        'value',
        'min',
        'max',
        'label',
        'variant',
        'showValue',
        'suffix',
        'size',
        'animate'
    ]);

    const min = () => local.min ?? 0;
    const max = () => local.max ?? 100;
    const percentage = () => {
        const range = max() - min();
        return Math.max(0, Math.min(100, ((local.value - min()) / range) * 100));
    };

    const variants = {
        default: 'bg-primary',
        primary: 'bg-primary',
        secondary: 'bg-secondary',
        accent: 'bg-accent',
        info: 'bg-info',
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-error'
    };

    // Auto variant based on value
    const autoVariant = () => {
        if (local.variant) return variants[local.variant];
        const pct = percentage();
        if (pct >= 90) return variants.error;
        if (pct >= 75) return variants.warning;
        if (pct >= 50) return variants.info;
        return variants.success;
    };

    const sizes = {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };

    const sizeClass = sizes[local.size] || sizes.md;

    return (
        <div class={`w-full ${local.class || ''}`} {...others}>
            <Show when={local.label || local.showValue}>
                <div class="flex justify-between text-sm mb-1">
                    <Show when={local.label}>
                        <span class="opacity-70">{local.label}</span>
                    </Show>
                    <Show when={local.showValue}>
                        <span class="font-medium">
                            {local.value}{local.suffix && ` ${local.suffix}`}
                        </span>
                    </Show>
                </div>
            </Show>
            <div class={`w-full bg-base-300 rounded-full overflow-hidden ${sizeClass}`}>
                <div
                    class={`h-full rounded-full ${autoVariant()} ${local.animate ? 'transition-all duration-500' : ''}`}
                    style={{ width: `${percentage()}%` }}
                />
            </div>
        </div>
    );
}

export default Meter;
