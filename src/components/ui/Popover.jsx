import { splitProps, createSignal, onMount, onCleanup } from 'solid-js';

/**
 * Popover - Floating content panel
 *
 * @example
 * <Popover
 *   trigger={<button class="btn">Click me</button>}
 *   content={<div class="p-4">Popover content</div>}
 * />
 *
 * <Popover
 *   trigger={<span>Hover me</span>}
 *   content="Simple text content"
 *   triggerOn="hover"
 *   position="top"
 * />
 */
export function Popover(props) {
    const [local, others] = splitProps(props, [
        'class',
        'trigger',
        'content',
        'position',
        'triggerOn',
        'open',
        'onOpenChange'
    ]);

    const [internalOpen, setInternalOpen] = createSignal(false);
    let containerRef;

    const isOpen = () => local.open ?? internalOpen();

    const setOpen = (value) => {
        if (local.onOpenChange) {
            local.onOpenChange(value);
        } else {
            setInternalOpen(value);
        }
    };

    // Close on outside click
    onMount(() => {
        const handleClickOutside = (e) => {
            if (containerRef && !containerRef.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        onCleanup(() => document.removeEventListener('click', handleClickOutside));
    });

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const isHover = local.triggerOn === 'hover';

    const triggerProps = isHover
        ? {
            onMouseEnter: () => setOpen(true),
            onMouseLeave: () => setOpen(false)
        }
        : {
            onClick: (e) => {
                e.stopPropagation();
                setOpen(!isOpen());
            }
        };

    return (
        <div
            class={`relative inline-block ${local.class || ''}`}
            ref={containerRef}
            {...(isHover ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) } : {})}
            {...others}
        >
            <div {...(isHover ? {} : triggerProps)}>
                {local.trigger}
            </div>
            <div
                class={`absolute z-50 ${positions[local.position] || positions.bottom} ${
                    isOpen() ? 'opacity-100 visible' : 'opacity-0 invisible'
                } transition-opacity duration-150`}
            >
                <div class="bg-base-200 rounded-lg shadow-lg border border-base-300">
                    {local.content}
                </div>
            </div>
        </div>
    );
}

export default Popover;
