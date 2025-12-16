import { splitProps, For, Show } from 'solid-js';

/**
 * Kbd - Keyboard key display
 *
 * @example
 * <Kbd>Ctrl</Kbd>
 * <Kbd>⌘</Kbd> + <Kbd>S</Kbd>
 * <Kbd.Shortcut keys={['Ctrl', 'Shift', 'P']} />
 */
export function Kbd(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'size'
    ]);

    const sizes = {
        xs: 'kbd-xs',
        sm: 'kbd-sm',
        md: '',
        lg: 'kbd-lg'
    };

    const kbdClass = () => {
        let cls = 'kbd';
        cls += ` ${sizes[local.size] || sizes.md}`;
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    return (
        <kbd class={kbdClass()} {...others}>
            {local.children}
        </kbd>
    );
}

/**
 * Keyboard shortcut display
 */
Kbd.Shortcut = function KbdShortcut(props) {
    const [local, others] = splitProps(props, [
        'keys',
        'size',
        'separator'
    ]);

    const separator = local.separator ?? '+';

    return (
        <span class="inline-flex items-center gap-1" {...others}>
            <For each={local.keys || []}>
                {(key, index) => (
                    <>
                        <Kbd size={local.size}>{key}</Kbd>
                        <Show when={index() < local.keys.length - 1}>
                            <span class="text-xs opacity-60">{separator}</span>
                        </Show>
                    </>
                )}
            </For>
        </span>
    );
};

export default Kbd;
