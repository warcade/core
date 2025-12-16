import { splitProps, Show, For } from 'solid-js';

/**
 * Radio - Radio button group
 *
 * @example
 * <Radio
 *   label="Size"
 *   name="size"
 *   options={['Small', 'Medium', 'Large']}
 *   value={size()}
 *   onChange={setSize}
 * />
 *
 * <Radio
 *   name="plan"
 *   options={[
 *     { value: 'free', label: 'Free Plan' },
 *     { value: 'pro', label: 'Pro Plan' }
 *   ]}
 *   value={plan()}
 *   onChange={setPlan}
 *   direction="horizontal"
 * />
 */
export function Radio(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'name',
        'options',
        'value',
        'variant',
        'size',
        'direction',
        'onChange'
    ]);

    const variants = {
        default: 'radio-primary',
        primary: 'radio-primary',
        secondary: 'radio-secondary',
        accent: 'radio-accent',
        info: 'radio-info',
        success: 'radio-success',
        warning: 'radio-warning',
        error: 'radio-error'
    };

    const sizes = {
        xs: 'radio-xs',
        sm: 'radio-sm',
        md: '',
        lg: 'radio-lg'
    };

    const radioClass = () => {
        let cls = 'radio';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        return cls;
    };

    // Normalize options
    const normalizedOptions = () => {
        return (local.options || []).map(opt => {
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: opt, label: String(opt) };
            }
            return opt;
        });
    };

    const handleChange = (value) => {
        if (typeof local.onChange === 'function') {
            local.onChange(value);
        }
    };

    const containerClass = () => {
        let cls = local.direction === 'horizontal' ? 'flex flex-row gap-4' : 'flex flex-col';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class="form-control">
            <Show when={local.label}>
                <label class="label">
                    <span class="label-text font-medium">{local.label}</span>
                </label>
            </Show>
            <div class={containerClass()}>
                <For each={normalizedOptions()}>
                    {(opt) => (
                        <label class="label cursor-pointer justify-start gap-3">
                            <input
                                type="radio"
                                name={local.name}
                                class={radioClass()}
                                value={opt.value}
                                checked={local.value === opt.value}
                                onChange={() => handleChange(opt.value)}
                                disabled={opt.disabled}
                            />
                            <span class="label-text">{opt.label}</span>
                        </label>
                    )}
                </For>
            </div>
        </div>
    );
}

export default Radio;
