import { splitProps, Show } from 'solid-js';

/**
 * Input - Text input field
 *
 * @example
 * <Input placeholder="Enter name" />
 * <Input label="Email" type="email" required />
 * <Input label="Password" type="password" error="Too short" />
 * <Input label="Bio" multiline rows={3} />
 */
export function Input(props) {
    const [local, others] = splitProps(props, [
        'class',
        'label',
        'error',
        'hint',
        'variant',
        'size',
        'multiline',
        'rows',
        'leftIcon',
        'rightIcon',
        'leftAddon',
        'rightAddon'
    ]);

    const variants = {
        default: 'input-bordered',
        ghost: 'input-ghost',
        primary: 'input-primary',
        secondary: 'input-secondary',
        accent: 'input-accent',
        info: 'input-info',
        success: 'input-success',
        warning: 'input-warning',
        error: 'input-error'
    };

    const sizes = {
        xs: 'input-xs',
        sm: 'input-sm',
        md: '',
        lg: 'input-lg'
    };

    const inputClass = () => {
        let cls = local.multiline ? 'textarea textarea-bordered' : 'input';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.error) cls += ' input-error';
        if (local.leftIcon || local.leftAddon) cls += ' pl-10';
        if (local.rightIcon || local.rightAddon) cls += ' pr-10';
        cls += ' w-full';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class="form-control w-full">
            <Show when={local.label}>
                <label class="label">
                    <span class="label-text">{local.label}</span>
                </label>
            </Show>
            <div class="relative">
                <Show when={local.leftIcon}>
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50">
                        {local.leftIcon}
                    </span>
                </Show>
                <Show when={local.leftAddon}>
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-base-content/70">
                        {local.leftAddon}
                    </span>
                </Show>
                <Show when={local.multiline} fallback={
                    <input class={inputClass()} {...others} />
                }>
                    <textarea class={inputClass()} rows={local.rows || 3} {...others} />
                </Show>
                <Show when={local.rightIcon}>
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50">
                        {local.rightIcon}
                    </span>
                </Show>
                <Show when={local.rightAddon}>
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-base-content/70">
                        {local.rightAddon}
                    </span>
                </Show>
            </div>
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

export default Input;
