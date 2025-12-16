import { splitProps, For, Show } from 'solid-js';

/**
 * ButtonGroup - Group buttons together
 *
 * @example
 * <ButtonGroup>
 *   <button class="btn">Left</button>
 *   <button class="btn">Center</button>
 *   <button class="btn">Right</button>
 * </ButtonGroup>
 *
 * <ButtonGroup
 *   buttons={[
 *     { label: 'Edit', onClick: edit },
 *     { label: 'Delete', onClick: del, variant: 'error' }
 *   ]}
 * />
 */
export function ButtonGroup(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'buttons',
        'size',
        'vertical'
    ]);

    const sizes = {
        xs: 'btn-xs',
        sm: 'btn-sm',
        md: '',
        lg: 'btn-lg'
    };

    const variants = {
        default: '',
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        accent: 'btn-accent',
        info: 'btn-info',
        success: 'btn-success',
        warning: 'btn-warning',
        error: 'btn-error',
        ghost: 'btn-ghost',
        outline: 'btn-outline'
    };

    const groupClass = () => {
        let cls = 'join';
        if (local.vertical) cls += ' join-vertical';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const sizeClass = sizes[local.size] || sizes.md;

    return (
        <div class={groupClass()} {...others}>
            <Show when={local.buttons} fallback={local.children}>
                <For each={local.buttons}>
                    {(btn) => (
                        <button
                            class={`btn join-item ${sizeClass} ${variants[btn.variant] || variants.default}`}
                            onClick={btn.onClick}
                            disabled={btn.disabled}
                        >
                            {btn.icon && <span class="mr-1">{btn.icon}</span>}
                            {btn.label}
                        </button>
                    )}
                </For>
            </Show>
        </div>
    );
}

export default ButtonGroup;
