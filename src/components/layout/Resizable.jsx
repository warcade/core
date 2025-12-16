import { splitProps, createSignal, onMount, onCleanup } from 'solid-js';

/**
 * Wrapper that adds a resize handle to its child
 *
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {string} side - 'start' or 'end' (default: 'end')
 *   - For horizontal: 'start' = handle on left, 'end' = handle on right
 *   - For vertical: 'start' = handle on top, 'end' = handle on bottom
 *
 * @example
 * <Row>
 *   <Resizable direction="horizontal" side="end">
 *     <Slot name="left-sidebar" />
 *   </Resizable>
 *   <Slot name="main" flex={1} />
 *   <Resizable direction="horizontal" side="start">
 *     <Slot name="right-sidebar" />
 *   </Resizable>
 * </Row>
 */
export function Resizable(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'direction',
        'side',
        'minSize',
        'maxSize',
        'defaultSize',
        'width',
        'height',
        'flex',
        'onResize'
    ]);

    const isHorizontal = () => local.direction !== 'vertical';
    const isStart = () => local.side === 'start';
    const [size, setSize] = createSignal(local.defaultSize || 250);
    const [isDragging, setIsDragging] = createSignal(false);

    let containerRef;
    let startPos = 0;
    let startSize = 0;

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        startPos = isHorizontal() ? e.clientX : e.clientY;
        startSize = size();
        document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
        if (!isDragging() || !containerRef) return;

        const currentPos = isHorizontal() ? e.clientX : e.clientY;
        const delta = currentPos - startPos;

        let newSize;
        if (isStart()) {
            // Handle on start side - dragging left/up increases size
            newSize = startSize - delta;
        } else {
            // Handle on end side - dragging right/down increases size
            newSize = startSize + delta;
        }

        // Apply constraints
        if (local.minSize) newSize = Math.max(local.minSize, newSize);
        if (local.maxSize) newSize = Math.min(local.maxSize, newSize);

        setSize(newSize);
        local.onResize?.(newSize);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    onMount(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    onCleanup(() => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    });

    const containerStyle = () => {
        const styles = {
            position: 'relative',
            display: 'flex',
            // Use opposite flex-direction so children fill the resized dimension
            'flex-direction': isHorizontal() ? 'column' : 'row',
            'flex-shrink': 0
        };

        if (isHorizontal()) {
            // Horizontal: resize controls width
            styles.width = `${size()}px`;
            // Cross-axis (height): use prop, or flex, or default to auto (stretch)
            if (local.height) styles.height = local.height;
            else if (local.flex) styles.flex = local.flex;
        } else {
            // Vertical: resize controls height
            styles.height = `${size()}px`;
            // Cross-axis (width): use prop, or flex, or default to auto (stretch)
            if (local.width) styles.width = local.width;
            else if (local.flex) styles.flex = local.flex;
        }

        return styles;
    };

    const handleStyle = () => {
        const styles = {
            position: 'absolute',
            [isHorizontal() ? 'width' : 'height']: '6px',
            cursor: isHorizontal() ? 'col-resize' : 'row-resize',
            'z-index': 10
        };

        if (isHorizontal()) {
            styles.top = 0;
            styles.bottom = 0;
            if (isStart()) {
                styles.left = 0;
            } else {
                styles.right = 0;
            }
        } else {
            styles.left = 0;
            styles.right = 0;
            if (isStart()) {
                styles.top = 0;
            } else {
                styles.bottom = 0;
            }
        }

        return styles;
    };

    return (
        <div
            ref={containerRef}
            class={`${local.class || ''}`}
            style={containerStyle()}
            {...others}
        >
            {local.children}
            <div
                class={`bg-transparent hover:bg-primary/30 transition-colors ${isDragging() ? 'bg-primary/50' : ''}`}
                style={handleStyle()}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}

export default Resizable;
