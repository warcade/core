import { plugin } from '@/api/plugin';
import { createSignal, For, Show } from 'solid-js';

// Use global API to share layout state with main app
const { layout, activeLayoutId } = window.WebArcadeAPI;
import {
    IconLayout,
    IconLayoutDashboard,
    IconLayoutSidebar,
    IconLayoutBottombar,
    IconArrowLeft,
    IconChevronDown
} from '@tabler/icons-solidjs';

// Layout Switcher Dropdown for toolbar/status bar
function LayoutSwitcher() {
    const [open, setOpen] = createSignal(false);

    const allLayouts = () => {
        const all = layout.getAll();
        return all.length > 0 ? all : [];
    };

    const currentLayout = () => {
        const id = activeLayoutId();
        if (!id) return { name: 'No Layout' };
        const layout = layout.get(id);
        return layout || { name: 'Unknown' };
    };

    const handleSwitch = (layoutId) => {
        layout.setActive(layoutId);
        setOpen(false);
    };

    return (
        <div class="relative">
            <button
                class="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-base-300 transition-colors"
                onClick={() => setOpen(!open())}
            >
                <IconLayout size={14} />
                <span>{currentLayout().name}</span>
                <IconChevronDown size={12} class={`transition-transform ${open() ? 'rotate-180' : ''}`} />
            </button>

            <Show when={open()}>
                <div class="absolute top-full left-0 mt-1 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 min-w-48">
                    <div class="p-1">
                        <For each={allLayouts()}>
                            {(layout) => (
                                <button
                                    class={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                                        activeLayoutId() === layout.id
                                            ? 'bg-primary/20 text-primary'
                                            : 'hover:bg-base-200'
                                    }`}
                                    onClick={() => handleSwitch(layout.id)}
                                >
                                    <LayoutIcon type={layout.icon} />
                                    <div class="text-left">
                                        <div class="font-medium">{layout.name}</div>
                                        <Show when={layout.description}>
                                            <div class="text-xs text-base-content/50">{layout.description}</div>
                                        </Show>
                                    </div>
                                </button>
                            )}
                        </For>
                    </div>
                </div>

                {/* Backdrop */}
                <div
                    class="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            </Show>
        </div>
    );
}

function LayoutIcon(props) {
    switch (props.type) {
        case 'dashboard':
            return <IconLayoutDashboard size={16} />;
        case 'sidebar':
            return <IconLayoutSidebar size={16} />;
        case 'bottombar':
            return <IconLayoutBottombar size={16} />;
        default:
            return <IconLayout size={16} />;
    }
}

// Back button for layout history
function LayoutBackButton() {
    const canGoBack = () => layout.canGoBack?.() ?? false;

    return (
        <Show when={canGoBack()}>
            <button
                class="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-base-300 transition-colors"
                onClick={() => layout.back()}
                title="Go back to previous layout"
            >
                <IconArrowLeft size={14} />
                <span>Back</span>
            </button>
        </Show>
    );
}

// Layout panel showing all available layouts with previews
function LayoutPanel() {
    const allLayouts = () => layout.getAll();

    return (
        <div class="h-full flex flex-col bg-base-200">
            <div class="px-3 py-2 border-b border-base-300 text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Layouts
            </div>
            <div class="flex-1 overflow-auto p-2">
                <div class="grid gap-2">
                    <For each={allLayouts()}>
                        {(layout) => (
                            <button
                                class={`p-3 rounded-lg border-2 transition-all text-left ${
                                    activeLayoutId() === layout.id
                                        ? 'border-primary bg-primary/10'
                                        : 'border-base-300 hover:border-base-content/30 hover:bg-base-300'
                                }`}
                                onClick={() => layout.setActive(layout.id)}
                            >
                                <div class="flex items-center gap-2 mb-1">
                                    <LayoutIcon type={layout.icon} />
                                    <span class="font-medium text-sm">{layout.name}</span>
                                </div>
                                <Show when={layout.description}>
                                    <p class="text-xs text-base-content/60">{layout.description}</p>
                                </Show>
                            </button>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}

// Status bar layout indicator
function LayoutIndicator() {
    const currentName = () => {
        const id = activeLayoutId();
        if (!id) return 'No Layout';
        const layout = layout.get(id);
        return layout?.name || 'Unknown';
    };

    return (
        <div class="flex items-center gap-1 text-base-content/60">
            <IconLayout size={12} />
            <span>{currentName()}</span>
        </div>
    );
}

// Status bar layout dropdown - allows switching layouts from footer
function LayoutStatusDropdown() {
    const [open, setOpen] = createSignal(false);

    const allLayouts = () => {
        const all = layout.getAll();
        return all.length > 0 ? all : [];
    };

    const currentLayout = () => {
        const id = activeLayoutId();
        if (!id) return { name: 'No Layout' };
        const layout = layout.get(id);
        return layout || { name: 'Unknown' };
    };

    const handleSwitch = (layoutId) => {
        layout.setActive(layoutId);
        setOpen(false);
    };

    return (
        <div class="relative">
            <button
                class="flex items-center gap-1.5 px-2 py-0.5 text-xs rounded hover:bg-base-content/10 transition-colors"
                onClick={() => setOpen(!open())}
            >
                <IconLayout size={12} />
                <span>{currentLayout().name}</span>
                <IconChevronDown size={10} class={`transition-transform ${open() ? 'rotate-180' : ''}`} />
            </button>

            <Show when={open()}>
                {/* Dropdown menu - opens upward from status bar */}
                <div class="absolute bottom-full left-0 mb-1 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50 min-w-48 max-h-96 overflow-auto p-1">
                    <For each={allLayouts()}>
                        {(layout) => (
                            <button
                                class={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                                    activeLayoutId() === layout.id
                                        ? 'bg-primary/20 text-primary'
                                        : 'hover:bg-base-200'
                                }`}
                                onClick={() => handleSwitch(layout.id)}
                            >
                                <LayoutIcon type={layout.icon} />
                                <span class="flex-1 text-left">{layout.name}</span>
                                <Show when={activeLayoutId() === layout.id}>
                                    <span class="text-xs text-primary">●</span>
                                </Show>
                            </button>
                        )}
                    </For>
                </div>

                {/* Backdrop */}
                <div
                    class="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            </Show>
        </div>
    );
}

export default plugin({
    id: 'layout-tools',
    name: 'Layout Tools',
    version: '1.0.0',
    description: 'Layout switching and management tools',
    author: 'WebArcade',

    start(api) {
        console.log('[Layout Tools] Starting...');

        // Register toolbar components
        api.register('layout-switcher', {
            type: 'toolbar',
            component: LayoutSwitcher,
            group: 'layout',
            order: 1
        });

        api.register('layout-back', {
            type: 'toolbar',
            component: LayoutBackButton,
            group: 'layout',
            order: 2
        });

        // Register panel for layout selection
        api.register('layout-panel', {
            type: 'panel',
            component: LayoutPanel,
            label: 'Layouts',
            icon: IconLayout
        });

        // Register status bar indicator (simple text)
        api.register('layout-indicator', {
            type: 'status',
            component: LayoutIndicator,
            align: 'right',
            priority: 50
        });

        // Register status bar dropdown (with layout switching)
        api.register('layout-dropdown', {
            type: 'status',
            component: LayoutStatusDropdown,
            align: 'left',
            priority: 10
        });

        console.log('[Layout Tools] Started');
    },

    stop(api) {
        console.log('[Layout Tools] Stopped');
    }
});
