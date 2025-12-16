import { splitProps } from 'solid-js';

/**
 * Tooltip - Hover hint
 *
 * @example
 * <Tooltip content="Hello!">
 *   <button>Hover me</button>
 * </Tooltip>
 *
 * <Tooltip content="On the left" position="left">
 *   <span>Left tooltip</span>
 * </Tooltip>
 */
export function Tooltip(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'content',
        'position',
        'variant',
        'open'
    ]);

    const positions = {
        top: 'tooltip-top',
        bottom: 'tooltip-bottom',
        left: 'tooltip-left',
        right: 'tooltip-right'
    };

    const variants = {
        default: '',
        primary: 'tooltip-primary',
        secondary: 'tooltip-secondary',
        accent: 'tooltip-accent',
        info: 'tooltip-info',
        success: 'tooltip-success',
        warning: 'tooltip-warning',
        error: 'tooltip-error'
    };

    const tooltipClass = () => {
        let cls = 'tooltip';
        cls += ` ${positions[local.position] || positions.top}`;
        cls += ` ${variants[local.variant] || variants.default}`;
        if (local.open) cls += ' tooltip-open';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class={tooltipClass()} data-tip={local.content} {...others}>
            {local.children}
        </div>
    );
}

export default Tooltip;
