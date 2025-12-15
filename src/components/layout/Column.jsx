import { splitProps, children as resolveChildren } from 'solid-js';

/**
 * Vertical flex container
 *
 * @example
 * <Column>
 *   <Slot name="editor" flex={1} />
 *   <Slot name="terminal" size="200px" />
 * </Column>
 */
export function Column(props) {
    const [local, others] = splitProps(props, ['children', 'class', 'flex', 'size', 'gap']);
    const resolved = resolveChildren(() => local.children);

    const style = () => {
        const s = {};
        if (local.flex !== undefined) s.flex = local.flex;
        if (local.size) {
            s.height = local.size;
            s['flex-shrink'] = 0;
        }
        if (local.gap) s.gap = local.gap;
        return s;
    };

    return (
        <div
            class={`flex flex-col ${local.class || ''}`}
            style={style()}
            {...others}
        >
            {resolved()}
        </div>
    );
}

export default Column;
