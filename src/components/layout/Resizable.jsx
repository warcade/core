import { splitProps, createSignal, onMount, onCleanup } from 'solid-js';

/**
 * Wrapper that adds a resize handle to its child
 *
 * @example
 * <Row>
 *   <Resizable direction="horizontal" minSize={100} maxSize={500}>
 *     <Slot name="sidebar" size="250px" />
 *   </Resizable>
 *   <Slot name="main" flex={1} />
 * </Row>
 */
export function Resizable(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'direction',
        'minSize',
        'maxSize',
        'defaultSize',
        'onResize'
    ]);

    const isHorizontal = () => local.direction !== 'vertical';
    const [size, setSize] = createSignal(local.defaultSize || 250);
    const [isDragging, setIsDragging] = createSignal(false);

    let containerRef;

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = isHorizontal() ? 'col-resize' : 'row-resize';
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
        if (!isDragging() || !containerRef) return;

        const rect = containerRef.getBoundingClientRect();
        let newSize;

        if (isHorizontal()) {
            newSize = e.clientX - rect.left;
        } else {
            newSize = e.clientY - rect.top;
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

    const containerStyle = () => ({
        position: 'relative',
        [isHorizontal() ? 'width' : 'height']: `${size()}px`,
        'flex-shrink': 0
    });

    const handleStyle = () => ({
        position: 'absolute',
        [isHorizontal() ? 'right' : 'bottom']: '-2px',
        [isHorizontal() ? 'top' : 'left']: 0,
        [isHorizontal() ? 'bottom' : 'right']: 0,
        [isHorizontal() ? 'width' : 'height']: '4px',
        cursor: isHorizontal() ? 'col-resize' : 'row-resize',
        'z-index': 10
    });

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
