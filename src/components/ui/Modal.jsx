import { splitProps, Show, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

/**
 * Modal - Dialog/popup window
 *
 * @example
 * <Modal open={isOpen()} onClose={() => setOpen(false)}>
 *   <h3>Modal Title</h3>
 *   <p>Modal content</p>
 * </Modal>
 *
 * <Modal
 *   open={isOpen()}
 *   onClose={close}
 *   title="Confirm"
 *   actions={
 *     <>
 *       <button class="btn" onClick={close}>Cancel</button>
 *       <button class="btn btn-primary" onClick={confirm}>OK</button>
 *     </>
 *   }
 * >
 *   Are you sure?
 * </Modal>
 */
export function Modal(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'open',
        'onClose',
        'title',
        'actions',
        'size',
        'closeOnBackdrop',
        'closeOnEscape',
        'showClose'
    ]);

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-full mx-4'
    };

    // Handle escape key
    createEffect(() => {
        if (!local.open) return;
        if (local.closeOnEscape === false) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') local.onClose?.();
        };
        document.addEventListener('keydown', handleEscape);
        onCleanup(() => document.removeEventListener('keydown', handleEscape));
    });

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && local.closeOnBackdrop !== false) {
            local.onClose?.();
        }
    };

    const modalBoxClass = () => {
        let cls = 'modal-box';
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <Portal>
            <dialog
                class={`modal ${local.open ? 'modal-open' : ''}`}
                onClick={handleBackdropClick}
                {...others}
            >
                <div class={modalBoxClass()}>
                    <Show when={local.showClose !== false}>
                        <button
                            class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                            onClick={() => local.onClose?.()}
                        >
                            ✕
                        </button>
                    </Show>
                    <Show when={local.title}>
                        <h3 class="font-bold text-lg mb-4">{local.title}</h3>
                    </Show>
                    <div class="py-2">{local.children}</div>
                    <Show when={local.actions}>
                        <div class="modal-action">
                            {local.actions}
                        </div>
                    </Show>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button onClick={() => local.onClose?.()}>close</button>
                </form>
            </dialog>
        </Portal>
    );
}

export default Modal;
