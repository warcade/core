import { splitProps, Show } from 'solid-js';

/**
 * Avatar - User profile image/placeholder
 *
 * @example
 * <Avatar src="/user.jpg" alt="John" />
 * <Avatar initials="JD" />
 * <Avatar src="/user.jpg" size="lg" status="online" />
 * <Avatar.Group>
 *   <Avatar src="/user1.jpg" />
 *   <Avatar src="/user2.jpg" />
 * </Avatar.Group>
 */
export function Avatar(props) {
    const [local, others] = splitProps(props, [
        'class',
        'src',
        'alt',
        'initials',
        'size',
        'shape',
        'status',
        'placeholder'
    ]);

    const sizes = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-12 h-12',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl'
    };

    const shapes = {
        circle: 'rounded-full',
        square: 'rounded-lg',
        squircle: 'mask mask-squircle'
    };

    const statusColors = {
        online: 'bg-success',
        offline: 'bg-base-300',
        busy: 'bg-error',
        away: 'bg-warning'
    };

    const containerClass = () => {
        let cls = 'avatar';
        if (local.status) cls += ' online';
        if (local.placeholder && !local.src) cls += ' placeholder';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const innerClass = () => {
        let cls = sizes[local.size] || sizes.md;
        cls += ` ${shapes[local.shape] || shapes.circle}`;
        if (!local.src) cls += ' bg-neutral text-neutral-content';
        return cls;
    };

    return (
        <div class={containerClass()} {...others}>
            <div class={innerClass()}>
                <Show when={local.src} fallback={
                    <span>{local.initials || '?'}</span>
                }>
                    <img src={local.src} alt={local.alt || 'Avatar'} />
                </Show>
            </div>
            <Show when={local.status}>
                <span class={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 ${statusColors[local.status]}`} />
            </Show>
        </div>
    );
}

// Avatar Group
Avatar.Group = function AvatarGroup(props) {
    return (
        <div class={`avatar-group -space-x-4 ${props.class || ''}`}>
            {props.children}
        </div>
    );
};

export default Avatar;
