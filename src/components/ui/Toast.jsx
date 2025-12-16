import { createSignal, For, Show, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

/**
 * Toast - Notification system
 *
 * @example
 * // Use the toast function
 * import { toast } from '@/components/ui';
 *
 * toast('Hello!');
 * toast.success('Saved!');
 * toast.error('Failed!');
 * toast.info('FYI...');
 * toast.warning('Watch out!');
 *
 * // With options
 * toast('Custom', { duration: 5000, position: 'top-center' });
 */

// Toast store
const [toasts, setToasts] = createSignal([]);
let toastId = 0;

// Toast function
export function toast(message, options = {}) {
    const id = ++toastId;
    const duration = options.duration ?? 3000;
    const variant = options.variant || 'default';

    const newToast = {
        id,
        message,
        variant,
        position: options.position || 'bottom-right'
    };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }

    return id;
}

// Convenience methods
toast.success = (msg, opts) => toast(msg, { ...opts, variant: 'success' });
toast.error = (msg, opts) => toast(msg, { ...opts, variant: 'error' });
toast.info = (msg, opts) => toast(msg, { ...opts, variant: 'info' });
toast.warning = (msg, opts) => toast(msg, { ...opts, variant: 'warning' });
toast.dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));
toast.dismissAll = () => setToasts([]);

/**
 * ToastContainer - Renders all toasts
 * Add this once at your app root
 */
export function ToastContainer() {
    const variants = {
        default: 'alert',
        success: 'alert alert-success',
        error: 'alert alert-error',
        info: 'alert alert-info',
        warning: 'alert alert-warning'
    };

    const positions = {
        'top-left': 'toast-top toast-start',
        'top-center': 'toast-top toast-center',
        'top-right': 'toast-top toast-end',
        'bottom-left': 'toast-bottom toast-start',
        'bottom-center': 'toast-bottom toast-center',
        'bottom-right': 'toast-bottom toast-end'
    };

    // Group toasts by position
    const groupedToasts = () => {
        const groups = {};
        toasts().forEach(t => {
            const pos = t.position || 'bottom-right';
            if (!groups[pos]) groups[pos] = [];
            groups[pos].push(t);
        });
        return groups;
    };

    return (
        <Portal>
            <For each={Object.entries(groupedToasts())}>
                {([position, items]) => (
                    <div class={`toast ${positions[position] || positions['bottom-right']} z-50`}>
                        <For each={items}>
                            {(t) => (
                                <div
                                    class={`${variants[t.variant] || variants.default} shadow-lg cursor-pointer`}
                                    onClick={() => toast.dismiss(t.id)}
                                >
                                    <span>{t.message}</span>
                                </div>
                            )}
                        </For>
                    </div>
                )}
            </For>
        </Portal>
    );
}

export default toast;
