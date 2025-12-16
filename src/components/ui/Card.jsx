import { splitProps, Show } from 'solid-js';

/**
 * Card - Flexible content container
 *
 * @example
 * <Card>Simple content</Card>
 *
 * <Card title="My Card" subtitle="Description">
 *   Content here
 * </Card>
 *
 * <Card
 *   image="/path/to/image.jpg"
 *   title="Image Card"
 *   actions={<button class="btn btn-primary">Action</button>}
 * >
 *   Card content
 * </Card>
 */
export function Card(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'title',
        'subtitle',
        'image',
        'imageAlt',
        'actions',
        'compact',
        'bordered',
        'hoverable'
    ]);

    const cardClass = () => {
        let cls = 'card bg-base-200';
        if (local.bordered) cls += ' card-bordered';
        if (local.compact) cls += ' card-compact';
        if (local.hoverable) cls += ' hover:shadow-lg transition-shadow cursor-pointer';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class={cardClass()} {...others}>
            <Show when={local.image}>
                <figure>
                    <img src={local.image} alt={local.imageAlt || local.title || 'Card image'} />
                </figure>
            </Show>
            <div class="card-body">
                <Show when={local.title}>
                    <h2 class="card-title">{local.title}</h2>
                </Show>
                <Show when={local.subtitle}>
                    <p class="text-sm opacity-70">{local.subtitle}</p>
                </Show>
                {local.children}
                <Show when={local.actions}>
                    <div class="card-actions justify-end mt-2">
                        {local.actions}
                    </div>
                </Show>
            </div>
        </div>
    );
}

export default Card;
