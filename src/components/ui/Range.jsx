import { splitProps, Show } from 'solid-js';

/**
 * Range - Slider input
 *
 * @example
 * <Range value={50} onChange={setValue} />
 * <Range value={val} min={0} max={100} step={10} />
 * <Range value={val} variant="primary" showValue />
 */
export function Range(props) {
    const [local, others] = splitProps(props, [
        'class',
        'value',
        'min',
        'max',
        'step',
        'onChange',
        'variant',
        'size',
        'showValue',
        'showMinMax',
        'formatValue'
    ]);

    const variants = {
        default: 'range-primary',
        primary: 'range-primary',
        secondary: 'range-secondary',
        accent: 'range-accent',
        info: 'range-info',
        success: 'range-success',
        warning: 'range-warning',
        error: 'range-error'
    };

    const sizes = {
        xs: 'range-xs',
        sm: 'range-sm',
        md: '',
        lg: 'range-lg'
    };

    const rangeClass = () => {
        let cls = 'range';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const handleChange = (e) => {
        const value = parseFloat(e.target.value);
        local.onChange?.(value);
    };

    const formatValue = (val) => {
        if (local.formatValue) return local.formatValue(val);
        return val;
    };

    const min = () => local.min ?? 0;
    const max = () => local.max ?? 100;

    return (
        <div class="w-full">
            <Show when={local.showMinMax || local.showValue}>
                <div class="flex justify-between text-xs mb-1">
                    <Show when={local.showMinMax}>
                        <span>{formatValue(min())}</span>
                    </Show>
                    <Show when={local.showValue}>
                        <span class="font-medium">{formatValue(local.value ?? min())}</span>
                    </Show>
                    <Show when={local.showMinMax}>
                        <span>{formatValue(max())}</span>
                    </Show>
                </div>
            </Show>
            <input
                type="range"
                class={rangeClass()}
                min={min()}
                max={max()}
                step={local.step || 1}
                value={local.value ?? min()}
                onInput={handleChange}
                {...others}
            />
        </div>
    );
}

export default Range;
