import { splitProps, Show } from 'solid-js';

/**
 * Checkbox - Checkbox input
 *
 * @example
 * <Checkbox label="Accept terms" checked={accepted()} onChange={setAccepted} />
 * <Checkbox label="Subscribe" variant="primary" />
 * <Checkbox label="Disabled" disabled />
 */
export function Checkbox(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'variant',
        'size',
        'onChange'
    ]);

    const variants = {
        default: 'checkbox-primary',
        primary: 'checkbox-primary',
        secondary: 'checkbox-secondary',
        accent: 'checkbox-accent',
        info: 'checkbox-info',
        success: 'checkbox-success',
        warning: 'checkbox-warning',
        error: 'checkbox-error'
    };

    const sizes = {
        xs: 'checkbox-xs',
        sm: 'checkbox-sm',
        md: '',
        lg: 'checkbox-lg'
    };

    const checkboxClass = () => {
        let cls = 'checkbox';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const handleChange = (e) => {
        if (typeof local.onChange === 'function') {
            // Support both (checked) => and (event) => patterns
            local.onChange(e.target.checked, e);
        }
    };

    return (
        <label class="label cursor-pointer justify-start gap-3">
            <input
                type="checkbox"
                class={checkboxClass()}
                onChange={handleChange}
                {...others}
            />
            <Show when={local.label}>
                <span class="label-text">{local.label}</span>
            </Show>
        </label>
    );
}

export default Checkbox;
