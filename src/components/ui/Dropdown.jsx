import { splitProps, Show, For, createSignal, onMount, onCleanup } from 'solid-js';

/**
 * Dropdown - Dropdown menu
 *
 * @example
 * <Dropdown
 *   trigger={<button class="btn">Open</button>}
 *   items={[
 *     { label: 'Edit', onClick: () => {} },
 *     { label: 'Delete', onClick: () => {}, variant: 'error' },
 *     { divider: true },
 *     { label: 'Cancel' }
 *   ]}
 * />
 *
 * // Custom content
 * <Dropdown trigger={<button>Menu</button>}>
 *   <div class="p-4">Custom content</div>
 * </Dropdown>
 */
export function Dropdown(props) {
    const [local, others] = splitProps(props, [
        'children',
        'class',
        'trigger',
        'items',
        'position',
        'align',
        'hover',
        'open',
        'onOpenChange'
    ]);

    const [internalOpen, setInternalOpen] = createSignal(false);
    let dropdownRef;

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
            if (dropdownRef && !dropdownRef.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        onCleanup(() => document.removeEventListener('click', handleClickOutside));
    });

    const positions = {
        bottom: 'dropdown-bottom',
        top: 'dropdown-top',
        left: 'dropdown-left',
        right: 'dropdown-right'
    };

    const aligns = {
        start: 'dropdown-start',
        end: 'dropdown-end'
    };

    const dropdownClass = () => {
        let cls = 'dropdown';
        cls += ` ${positions[local.position] || ''}`;
        cls += ` ${aligns[local.align] || ''}`;
        if (local.hover) cls += ' dropdown-hover';
        if (isOpen()) cls += ' dropdown-open';
        if (local.class) cls += ` ${local.class}`;
        return cls;
    };

    const handleItemClick = (item) => {
        item.onClick?.();
        if (!item.keepOpen) {
            setOpen(false);
        }
    };

    return (
        <div class={dropdownClass()} ref={dropdownRef} {...others}>
            <div
                tabindex="0"
                role="button"
                onClick={() => !local.hover && setOpen(!isOpen())}
            >
                {local.trigger}
            </div>
            <div tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box min-w-52">
                <Show when={local.items} fallback={local.children}>
                    <ul class="menu">
                        <For each={local.items}>
                            {(item) => (
                                <Show when={!item.divider} fallback={<li class="divider my-1" />}>
                                    <li class={item.disabled ? 'disabled' : ''}>
                                        <a
                                            class={item.variant === 'error' ? 'text-error' : ''}
                                            onClick={() => !item.disabled && handleItemClick(item)}
                                        >
                                            {item.icon && <span>{item.icon}</span>}
                                            {item.label}
                                            {item.shortcut && (
                                                <span class="text-xs opacity-60 ml-auto">{item.shortcut}</span>
                                            )}
                                        </a>
                                    </li>
                                </Show>
                            )}
                        </For>
                    </ul>
                </Show>
            </div>
        </div>
    );
}

export default Dropdown;
