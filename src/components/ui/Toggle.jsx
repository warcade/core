import { splitProps, Show } from 'solid-js';

/**
 * Toggle - Switch toggle
 *
 * @example
 * <Toggle label="Dark mode" checked={dark()} onChange={setDark} />
 * <Toggle label="Notifications" variant="success" />
 * <Toggle label="Disabled" disabled />
 */
export function Toggle(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'labelPosition',
        'variant',
        'size',
        'onChange'
    ]);

    const variants = {
        default: 'toggle-primary',
        primary: 'toggle-primary',
        secondary: 'toggle-secondary',
        accent: 'toggle-accent',
        info: 'toggle-info',
        success: 'toggle-success',
        warning: 'toggle-warning',
        error: 'toggle-error'
    };

    const sizes = {
        xs: 'toggle-xs',
        sm: 'toggle-sm',
        md: '',
        lg: 'toggle-lg'
    };

    const toggleClass = () => {
        let cls = 'toggle';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const handleChange = (e) => {
        if (typeof local.onChange === 'function') {
            local.onChange(e.target.checked, e);
        }
    };

    const labelLeft = local.labelPosition === 'left';

    return (
        <label class="label cursor-pointer justify-start gap-3">
            <Show when={local.label && labelLeft}>
                <span class="label-text">{local.label}</span>
            </Show>
            <input
                type="checkbox"
                class={toggleClass()}
                onChange={handleChange}
                {...others}
            />
            <Show when={local.label && !labelLeft}>
                <span class="label-text">{local.label}</span>
            </Show>
        </label>
    );
}

export default Toggle;
