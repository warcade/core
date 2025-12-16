import { splitProps, For } from 'solid-js';

/**
 * Stack - Stack elements on top of each other
 *
 * @example
 * <Stack>
 *   <img src="/card1.jpg" />
 *   <img src="/card2.jpg" />
 *   <img src="/card3.jpg" />
 * </Stack>
 *
 * <Stack items={cards} renderItem={(card) => <Card {...card} />} />
 */
export function Stack(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'items',
        'renderItem'
    ]);

    const stackClass = () => {
        let cls = 'stack';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <div class={stackClass()} {...others}>
            {local.items ? (
                <For each={local.items}>
                    {(item, index) => local.renderItem?.(item, index()) || item}
                </For>
            ) : (
                local.children
            )}
        </div>
    );
}

export default Stack;
