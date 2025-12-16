import { splitProps, Show } from 'solid-js';

/**
 * Divider - Visual separator
 *
 * @example
 * <Divider />
 * <Divider>OR</Divider>
 * <Divider direction="horizontal">Section</Divider>
 * <Divider direction="vertical" />
 */
export function Divider(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'direction',
        'variant'
    ]);

    const variants = {
        default: '',
        primary: 'divider-primary',
        secondary: 'divider-secondary',
        accent: 'divider-accent',
        neutral: 'divider-neutral',
        info: 'divider-info',
        success: 'divider-success',
        warning: 'divider-warning',
        error: 'divider-error'
    };

    const dividerClass = () => {
        let cls = 'divider';
        if (local.direction === 'vertical') cls += ' divider-horizontal'; // DaisyUI naming is inverted
        cls += ` ${variants[local.variant] || variants.default}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class={dividerClass()} {...others}>
            {local.children}
        </div>
    );
}

export default Divider;
