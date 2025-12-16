import { splitProps, For, Show } from 'solid-js';

/**
 * Breadcrumb - Navigation path
 *
 * @example
 * <Breadcrumb
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Products', href: '/products' },
 *     { label: 'Item' }
 *   ]}
 * />
 *
 * <Breadcrumb>
 *   <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
 *   <Breadcrumb.Item href="/docs">Docs</Breadcrumb.Item>
 *   <Breadcrumb.Item>Current</Breadcrumb.Item>
 * </Breadcrumb>
 */
export function Breadcrumb(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'items',
        'separator'
    ]);

    // If items prop provided, render from data
    if (local.items) {
        return (
            <div class={`breadcrumbs text-sm ${local.class || ''}`} {...others}>
                <ul>
                    <For each={local.items}>
                        {(item, index) => (
                            <li>
                                <Show when={item.href && index() < local.items.length - 1} fallback={
                                    <span class={index() === local.items.length - 1 ? 'text-base-content' : ''}>
                                        {item.icon}{item.label}
                                    </span>
                                }>
                                    <a href={item.href} onClick={item.onClick}>
                                        {item.icon}{item.label}
                                    </a>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </div>
        );
    }

    // Otherwise render children
    return (
        <div class={`breadcrumbs text-sm ${local.class || ''}`} {...others}>
            <ul>
                {local.children}
            </ul>
        </div>
    );
}

// Breadcrumb Item
Breadcrumb.Item = function BreadcrumbItem(props) {
    const [local, others] = splitProps(props, ['children', 'href', 'onClick']);

    return (
        <li>
            <Show when={local.href} fallback={<span>{local.children}</span>}>
                <a href={local.href} onClick={local.onClick} {...others}>
                    {local.children}
                </a>
            </Show>
        </li>
    );
};

export default Breadcrumb;
