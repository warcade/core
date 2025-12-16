import { splitProps, Show, For } from 'solid-js';

/**
 * Select - Dropdown select
 *
 * @example
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' }
 *   ]}
 *   value={country()}
 *   onChange={(e) => setCountry(e.target.value)}
 * />
 *
 * <Select
 *   label="Size"
 *   options={['Small', 'Medium', 'Large']}
 *   placeholder="Select size"
 * />
 */
export function Select(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'options',
        'placeholder',
        'error',
        'hint',
        'variant',
        'size'
    ]);

    const variants = {
        default: 'select-bordered',
        ghost: 'select-ghost',
        primary: 'select-primary',
        secondary: 'select-secondary',
        accent: 'select-accent',
        info: 'select-info',
        success: 'select-success',
        warning: 'select-warning',
        error: 'select-error'
    };

    const sizes = {
        xs: 'select-xs',
        sm: 'select-sm',
        md: '',
        lg: 'select-lg'
    };

    const selectClass = () => {
        let cls = 'select';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.error) cls += ' select-error';
        cls += ' w-full';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    // Normalize options to { value, label } format
    const normalizedOptions = () => {
        return (local.options || []).map(opt => {
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: opt, label: String(opt) };
            }
            return opt;
        });
    };

    return (
        <div class="form-control w-full">
            <Show when={local.label}>
                <label class="label">
                    <span class="label-text">{local.label}</span>
                </label>
            </Show>
            <select class={selectClass()} {...others}>
                <Show when={local.placeholder}>
                    <option disabled selected value="">
                        {local.placeholder}
                    </option>
                </Show>
                <For each={normalizedOptions()}>
                    {(opt) => (
                        <option value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    )}
                </For>
            </select>
            <Show when={local.error || local.hint}>
                <label class="label">
                    <span class={`label-text-alt ${local.error ? 'text-error' : ''}`}>
                        {local.error || local.hint}
                    </span>
                </label>
            </Show>
        </div>
    );
}

export default Select;
