import { splitProps, children as resolveChildren } from 'solid-js';

/**
 * Horizontal flex container
 *
 * @example
 * <Row>
 *   <Slot name="sidebar" size="250px" />
 *   <Slot name="main" flex={1} />
 * </Row>
 */
export function Row(props) {
    const [local, others] = splitProps(props, ['children', 'class', 'flex', 'size', 'gap']);
    const resolved = resolveChildren(() => local.children);

    const style = () => {
        const s = {};
        if (local.flex !== undefined) s.flex = local.flex;
        if (local.size) {
            s.width = local.size;
            s['flex-shrink'] = 0;
        }
        if (local.gap) s.gap = local.gap;
        return s;
    };

    return (
        <div
            class={`flex flex-row ${local.class || ''}`}
            style={style()}
            {...others}
        >
            {resolved()}
        </div>
    );
}

export default Row;
