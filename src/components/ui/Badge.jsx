import { splitProps, Show } from 'solid-js';

/**
 * Badge - Small status indicator
 *
 * @example
 * <Badge>Default</Badge>
 * <Badge variant="primary">Primary</Badge>
 * <Badge variant="success" outline>Success</Badge>
 * <Badge count={5} />
 * <Badge dot variant="error" />
 */
export function Badge(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'variant',
        'size',
        'outline',
        'count',
        'dot',
        'max'
    ]);

    const variants = {
        default: 'badge-neutral',
        primary: 'badge-primary',
        secondary: 'badge-secondary',
        accent: 'badge-accent',
        info: 'badge-info',
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error',
        ghost: 'badge-ghost'
    };

    const sizes = {
        xs: 'badge-xs',
        sm: 'badge-sm',
        md: '',
        lg: 'badge-lg'
    };

    const badgeClass = () => {
        let cls = 'badge';
        cls += ` ${variants[local.variant] || variants.default}`;
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.outline) cls += ' badge-outline';
        if (local.dot) cls += ' badge-xs p-0 w-2 h-2';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const displayCount = () => {
        if (local.count === undefined) return null;
        const max = local.max || 99;
        return local.count > max ? `${max}+` : local.count;
    };

    return (
        <span class={badgeClass()} {...others}>
            <Show when={!local.dot}>
                {local.count !== undefined ? displayCount() : local.children}
            </Show>
        </span>
    );
}

export default Badge;
