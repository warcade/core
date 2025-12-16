import { splitProps, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

/**
 * Drawer - Slide-out panel from edge
 *
 * @example
 * <Drawer open={isOpen()} onClose={() => setOpen(false)} side="left">
 *   <h2>Drawer Content</h2>
 * </Drawer>
 *
 * <Drawer open={open()} onClose={close} side="right" size="lg">
 *   <nav>Navigation menu</nav>
 * </Drawer>
 */
export function Drawer(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'open',
        'onClose',
        'side',
        'size',
        'overlay',
        'title'
    ]);

    const sizes = {
        sm: 'w-64',
        md: 'w-80',
        lg: 'w-96',
        xl: 'w-[28rem]',
        full: 'w-screen'
    };

    // Handle escape key
    createEffect(() => {
        if (!local.open) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') local.onClose?.();
        };
        document.addEventListener('keydown', handleEscape);
        onCleanup(() => document.removeEventListener('keydown', handleEscape));
    });

    const isLeft = () => local.side !== 'right';
    const sizeClass = () => sizes[local.size] || sizes.md;

    const drawerClass = () => {
        let cls = `fixed top-0 h-full bg-base-200 shadow-xl z-50 transition-transform duration-300 ${sizeClass()}`;

        if (isLeft()) {
            cls += ' left-0';
            cls += local.open ? ' translate-x-0' : ' -translate-x-full';
        } else {
            cls += ' right-0';
            cls += local.open ? ' translate-x-0' : ' translate-x-full';
        }

        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <Portal>
            {/* Overlay */}
            <Show when={local.overlay !== false && local.open}>
                <div
                    class="fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={() => local.onClose?.()}
                />
            </Show>

            {/* Drawer panel */}
            <div class={drawerClass()} {...others}>
                <div class="flex flex-col h-full">
                    <Show when={local.title}>
                        <div class="flex items-center justify-between p-4 border-b border-base-300">
                            <h2 class="text-lg font-bold">{local.title}</h2>
                            <button
                                class="btn btn-ghost btn-sm btn-square"
                                onClick={() => local.onClose?.()}
                            >
                                ✕
                            </button>
                        </div>
                    </Show>
                    <div class="flex-1 overflow-auto p-4">
                        {local.children}
                    </div>
                </div>
            </div>
        </Portal>
    );
}

export default Drawer;
