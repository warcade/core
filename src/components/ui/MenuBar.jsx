import { splitProps, createMemo, createSignal, Show, For } from 'solid-js';
import { componentRegistry, ComponentType } from '@/api/plugin/registry';
import { IconMinus, IconSquare, IconX } from '@tabler/icons-solidjs';

// Window control functions
const windowApi = () => window.__WEBARCADE__?.window;

/**
 * MenuBar renders menu items from the registry
 * Includes window drag region and window controls for frameless windows
 *
 * @example
 * <MenuBar use={['file-menu', 'edit-menu', 'view-menu']} />
 * <MenuBar /> // renders all type: 'menu' components
 */
export function MenuBar(props) {
    const [local, others] = splitProps(props, ['use', 'exclude', 'class', 'children', 'showWindowControls']);

    const [openMenu, setOpenMenu] = createSignal(null);
    const [isMaximized, setIsMaximized] = createSignal(false);

    // Check maximized state
    const checkMaximized = async () => {
        const api = windowApi();
        if (api?.isMaximized) {
            setIsMaximized(await api.isMaximized());
        }
    };

    // Window control handlers
    const handleMinimize = () => windowApi()?.minimize?.();
    const handleMaximize = () => {
        windowApi()?.toggleMaximize?.();
        setTimeout(checkMaximized, 100);
    };
    const handleClose = () => windowApi()?.close?.();

    // Get menu items from registry
    const menus = createMemo(() => {
        let components;

        if (local.use) {
            components = componentRegistry.getMany(local.use);
        } else {
            components = componentRegistry.getByType(ComponentType.MENU);
        }

        if (local.exclude) {
            components = components.filter(c => !local.exclude.includes(c.fullId));
        }

        return components.sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    const handleMenuClick = (menuId) => {
        setOpenMenu(prev => prev === menuId ? null : menuId);
    };

    const handleItemClick = (action) => {
        action?.();
        setOpenMenu(null);
    };

    const handleMouseEnter = (menuId) => {
        if (openMenu()) setOpenMenu(menuId);
    };

    // Close menu when clicking outside
    const handleBackdropClick = () => {
        setOpenMenu(null);
    };

    const showControls = () => local.showWindowControls !== false && !!windowApi();

    return (
        <>
            <div
                class={`flex items-center bg-base-200 border-b border-base-300 h-8 ${local.class || ''}`}
                {...others}
            >
                {/* Menu items */}
                <div class="flex items-center px-1 gap-0.5">
                    <For each={menus()}>
                        {(menu) => (
                            <div class="relative">
                                <button
                                    class={`px-3 py-1 text-sm rounded transition-colors ${
                                        openMenu() === menu.fullId
                                            ? 'bg-base-300'
                                            : 'hover:bg-base-300/50'
                                    }`}
                                    onClick={() => handleMenuClick(menu.fullId)}
                                    onMouseEnter={() => handleMouseEnter(menu.fullId)}
                                >
                                    {menu.label}
                                </button>

                                <Show when={openMenu() === menu.fullId && menu.submenu?.length}>
                                    <div class="absolute top-full left-0 mt-0.5 bg-base-100 border border-base-300 rounded shadow-lg min-w-48 py-1 z-50">
                                        <For each={menu.submenu}>
                                            {(item) => (
                                                <Show
                                                    when={!item.divider}
                                                    fallback={<div class="h-px bg-base-300 my-1" />}
                                                >
                                                    <button
                                                        class="w-full px-3 py-1.5 text-sm text-left hover:bg-base-200 flex items-center justify-between"
                                                        onClick={() => handleItemClick(item.action)}
                                                    >
                                                        <span>{item.label}</span>
                                                        <Show when={item.shortcut}>
                                                            <span class="text-xs text-base-content/50 ml-4">
                                                                {item.shortcut}
                                                            </span>
                                                        </Show>
                                                    </button>
                                                </Show>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>

                    {/* Allow additional children (like Spacer, custom elements) */}
                    {local.children}
                </div>

                {/* Drag region - fills remaining space */}
                <div
                    class="flex-1 h-full"
                    data-drag-region="true"
                />

                {/* Window controls */}
                <Show when={showControls()}>
                    <div class="flex items-center h-full">
                        <button
                            class="h-full px-4 hover:bg-base-300 transition-colors flex items-center justify-center"
                            onClick={handleMinimize}
                            title="Minimize"
                        >
                            <IconMinus size={14} />
                        </button>
                        <button
                            class="h-full px-4 hover:bg-base-300 transition-colors flex items-center justify-center"
                            onClick={handleMaximize}
                            title={isMaximized() ? "Restore" : "Maximize"}
                        >
                            <IconSquare size={12} />
                        </button>
                        <button
                            class="h-full px-4 hover:bg-error hover:text-error-content transition-colors flex items-center justify-center"
                            onClick={handleClose}
                            title="Close"
                        >
                            <IconX size={14} />
                        </button>
                    </div>
                </Show>
            </div>

            {/* Backdrop to close menu */}
            <Show when={openMenu()}>
                <div
                    class="fixed inset-0 z-40"
                    onClick={handleBackdropClick}
                />
            </Show>
        </>
    );
}

export default MenuBar;
