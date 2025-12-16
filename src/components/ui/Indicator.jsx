import { splitProps, Show } from 'solid-js';

/**
 * Indicator - Position indicator badge on element
 *
 * @example
 * <Indicator badge={<Badge>99+</Badge>}>
 *   <button class="btn">Inbox</button>
 * </Indicator>
 *
 * <Indicator badge="NEW" position="bottom-start" variant="secondary">
 *   <div class="card">...</div>
 * </Indicator>
 */
export function Indicator(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'badge',
        'position',
        'variant'
    ]);

    const positions = {
        'top-start': 'indicator-start indicator-top',
        'top-center': 'indicator-center indicator-top',
        'top-end': 'indicator-end indicator-top',
        'middle-start': 'indicator-start indicator-middle',
        'middle-center': 'indicator-center indicator-middle',
        'middle-end': 'indicator-end indicator-middle',
        'bottom-start': 'indicator-start indicator-bottom',
        'bottom-center': 'indicator-center indicator-bottom',
        'bottom-end': 'indicator-end indicator-bottom'
    };

    const variants = {
        default: 'badge-neutral',
        primary: 'badge-primary',
        secondary: 'badge-secondary',
        accent: 'badge-accent',
        info: 'badge-info',
        success: 'badge-success',
        warning: 'badge-warning',
        error: 'badge-error'
    };

    const indicatorClass = () => {
        let cls = 'indicator';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const itemClass = () => {
        let cls = 'indicator-item';
        cls += ` ${positions[local.position] || positions['top-end']}`;
        return cls;
    };

    const badgeClass = () => {
        let cls = 'badge';
        cls += ` ${variants[local.variant] || variants.default}`;
        return cls;
    };

    // If badge is a string/number, wrap in badge class
    const renderBadge = () => {
        if (typeof local.badge === 'string' || typeof local.badge === 'number') {
            return <span class={badgeClass()}>{local.badge}</span>;
        }
        return local.badge;
    };

    return (
        <div class={indicatorClass()} {...others}>
            <span class={itemClass()}>
                {renderBadge()}
            </span>
            {local.children}
        </div>
    );
}

export default Indicator;
