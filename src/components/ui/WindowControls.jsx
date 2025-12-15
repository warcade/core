import { createSignal, Show } from 'solid-js';
import { IconMinus, IconSquare, IconX, IconCopy } from '@tabler/icons-solidjs';

const windowApi = () => window.__WEBARCADE__?.window;

/**
 * Standalone window control buttons (minimize, maximize, close)
 * Can be placed anywhere in the layout
 *
 * @example
 * <WindowControls />
 * <WindowControls showMinimize={false} />
 * <WindowControls vertical />
 */
export function WindowControls(props) {
    const [isMaximized, setIsMaximized] = createSignal(false);

    const checkMaximized = async () => {
        const api = windowApi();
        if (api?.isMaximized) {
            setIsMaximized(await api.isMaximized());
        }
    };

    const handleMinimize = () => windowApi()?.minimize?.();
    const handleMaximize = () => {
        windowApi()?.toggleMaximize?.();
        setTimeout(checkMaximized, 100);
    };
    const handleClose = () => windowApi()?.close?.();

    const showControls = () => !!windowApi();
    const showMin = () => props.showMinimize !== false;
    const showMax = () => props.showMaximize !== false;
    const showClose = () => props.showClose !== false;

    const containerClass = () => props.vertical
        ? 'flex flex-col items-center'
        : 'flex items-center h-full';

    const buttonClass = () => props.vertical
        ? 'w-full py-2 px-3 hover:bg-base-300 transition-colors flex items-center justify-center'
        : 'h-full px-4 hover:bg-base-300 transition-colors flex items-center justify-center';

    const closeButtonClass = () => props.vertical
        ? 'w-full py-2 px-3 hover:bg-error hover:text-error-content transition-colors flex items-center justify-center'
        : 'h-full px-4 hover:bg-error hover:text-error-content transition-colors flex items-center justify-center';

    return (
        <Show when={showControls()}>
            <div class={`${containerClass()} ${props.class || ''}`}>
                <Show when={showMin()}>
                    <button
                        class={buttonClass()}
                        onClick={handleMinimize}
                        title="Minimize"
                    >
                        <IconMinus size={14} />
                    </button>
                </Show>
                <Show when={showMax()}>
                    <button
                        class={buttonClass()}
                        onClick={handleMaximize}
                        title={isMaximized() ? "Restore" : "Maximize"}
                    >
                        {isMaximized() ? <IconCopy size={12} /> : <IconSquare size={12} />}
                    </button>
                </Show>
                <Show when={showClose()}>
                    <button
                        class={closeButtonClass()}
                        onClick={handleClose}
                        title="Close"
                    >
                        <IconX size={14} />
                    </button>
                </Show>
            </div>
        </Show>
    );
}

export default WindowControls;
