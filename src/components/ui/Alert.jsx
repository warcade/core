import { splitProps, Show } from 'solid-js';

/**
 * Alert - Static notification/message
 *
 * @example
 * <Alert>Default alert</Alert>
 * <Alert variant="success">Success!</Alert>
 * <Alert variant="error" title="Error" dismissible onDismiss={() => {}}>
 *   Something went wrong
 * </Alert>
 */
export function Alert(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'variant',
        'title',
        'icon',
        'dismissible',
        'onDismiss'
    ]);

    const variants = {
        default: 'alert',
        info: 'alert alert-info',
        success: 'alert alert-success',
        warning: 'alert alert-warning',
        error: 'alert alert-error'
    };

    const defaultIcons = {
        default: '💬',
        info: 'ℹ️',
        success: '✓',
        warning: '⚠️',
        error: '✕'
    };

    const alertClass = () => {
        let cls = variants[local.variant] || variants.default;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const icon = () => local.icon ?? defaultIcons[local.variant] ?? defaultIcons.default;

    return (
        <div class={alertClass()} role="alert" {...others}>
            <Show when={icon()}>
                <span class="text-lg">{icon()}</span>
            </Show>
            <div class="flex-1">
                <Show when={local.title}>
                    <h3 class="font-bold">{local.title}</h3>
                </Show>
                <div class={local.title ? 'text-sm' : ''}>{local.children}</div>
            </div>
            <Show when={local.dismissible}>
                <button
                    class="btn btn-sm btn-ghost"
                    onClick={() => local.onDismiss?.()}
                >
                    ✕
                </button>
            </Show>
        </div>
    );
}

export default Alert;
