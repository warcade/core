import { splitProps } from 'solid-js';

/**
 * Makes an area draggable for window movement
 * Can wrap content or be used as an empty spacer
 *
 * @example
 * // Empty drag region (spacer)
 * <DragRegion class="flex-1 h-8" />
 *
 * // Wrap content to make it draggable
 * <DragRegion class="px-4 py-2">
 *     <span>App Title</span>
 * </DragRegion>
 *
 * // In a toolbar
 * <div class="flex items-center">
 *     <button>Menu</button>
 *     <DragRegion class="flex-1" />
 *     <WindowControls />
 * </div>
 */
export function DragRegion(props) {
    const [local, others] = splitProps(props, ['children', 'class']);

    return (
        <div
            class={local.class}
            data-drag-region="true"
            {...others}
        >
            {local.children}
        </div>
    );
}

export default DragRegion;
