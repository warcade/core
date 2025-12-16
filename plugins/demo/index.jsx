import { plugin } from '@/api/plugin';
import { createSignal, For, Show } from 'solid-js';
import { IconBook, IconBrandGithub, IconComponents, IconCode, IconLayout, IconServer } from '@tabler/icons-solidjs';

// ============================================================================
// SIDEBAR NAVIGATION
// ============================================================================

const [activeSection, setActiveSection] = createSignal('welcome');

const sections = [
    { id: 'welcome', label: 'Welcome', icon: IconBook },
    { id: 'components', label: 'UI Components', icon: IconComponents },
    { id: 'plugin-tutorial', label: 'Create a Plugin', icon: IconCode },
    { id: 'layout-tutorial', label: 'Create a Layout', icon: IconLayout },
    { id: 'backend-tutorial', label: 'Backend Plugins', icon: IconServer },
];

function Sidebar() {
    return (
        <div class="h-full flex flex-col bg-base-200 border-r border-base-300">
            <div class="p-3 border-b border-base-300">
                <h2 class="font-bold text-sm">Getting Started</h2>
            </div>
            <nav class="flex-1 p-2">
                <For each={sections}>
                    {(section) => (
                        <button
                            class={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeSection() === section.id
                                    ? 'bg-primary text-primary-content'
                                    : 'hover:bg-base-300'
                            }`}
                            onClick={() => setActiveSection(section.id)}
                        >
                            <section.icon size={16} />
                            <span>{section.label}</span>
                        </button>
                    )}
                </For>
            </nav>
        </div>
    );
}

// ============================================================================
// WELCOME SECTION
// ============================================================================

function WelcomeSection() {
    return (
        <div class="h-full flex items-center justify-center p-8">
            <div class="max-w-lg text-center">
                <h1 class="text-4xl font-bold mb-4">Welcome to WebArcade</h1>
                <p class="text-base-content/70 mb-8">
                    A plugin-first framework for building desktop applications with web technologies.
                </p>

                <div class="flex flex-col gap-3">
                    <a href="https://warcade.github.io/docs/" target="_blank" class="btn btn-primary gap-2">
                        <IconBook size={18} />
                        Read the Documentation
                    </a>
                    <a href="https://github.com/warcade/core" target="_blank" class="btn btn-outline gap-2">
                        <IconBrandGithub size={18} />
                        View on GitHub
                    </a>
                </div>

                <p class="mt-8 text-xs text-base-content/40">
                    Remove this demo by deleting <code class="text-base-content/60">plugins/demo</code> and <code class="text-base-content/60">src/layouts/WelcomeLayout.jsx</code>
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// UI COMPONENTS DEMO
// ============================================================================

function ComponentsSection() {
    const [count, setCount] = createSignal(0);
    const [checked, setChecked] = createSignal(false);
    const [range, setRange] = createSignal(50);

    return (
        <div class="h-full overflow-auto p-6">
            <h1 class="text-2xl font-bold mb-6">UI Components</h1>
            <p class="text-base-content/70 mb-8">
                WebArcade includes 50+ pre-built UI components based on DaisyUI. Here are some examples:
            </p>

            <div class="grid gap-8">
                {/* Buttons */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Buttons</h2>
                    <div class="flex flex-wrap gap-2">
                        <button class="btn btn-primary">Primary</button>
                        <button class="btn btn-secondary">Secondary</button>
                        <button class="btn btn-accent">Accent</button>
                        <button class="btn btn-ghost">Ghost</button>
                        <button class="btn btn-outline">Outline</button>
                    </div>
                </section>

                {/* Badges */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Badges</h2>
                    <div class="flex flex-wrap gap-2">
                        <span class="badge">Default</span>
                        <span class="badge badge-primary">Primary</span>
                        <span class="badge badge-secondary">Secondary</span>
                        <span class="badge badge-accent">Accent</span>
                        <span class="badge badge-success">Success</span>
                        <span class="badge badge-warning">Warning</span>
                        <span class="badge badge-error">Error</span>
                    </div>
                </section>

                {/* Interactive */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Interactive</h2>
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex items-center gap-2">
                            <button class="btn btn-sm" onClick={() => setCount(c => c - 1)}>-</button>
                            <span class="text-xl font-mono w-12 text-center">{count()}</span>
                            <button class="btn btn-sm" onClick={() => setCount(c => c + 1)}>+</button>
                        </div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                class="checkbox checkbox-primary"
                                checked={checked()}
                                onChange={(e) => setChecked(e.target.checked)}
                            />
                            <span>Checkbox</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                class="toggle toggle-primary"
                                checked={checked()}
                                onChange={(e) => setChecked(e.target.checked)}
                            />
                            <span>Toggle</span>
                        </label>
                    </div>
                </section>

                {/* Range */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Range: {range()}</h2>
                    <input
                        type="range"
                        class="range range-primary w-full max-w-xs"
                        min="0"
                        max="100"
                        value={range()}
                        onInput={(e) => setRange(parseInt(e.target.value))}
                    />
                </section>

                {/* Cards */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Cards</h2>
                    <div class="flex gap-4">
                        <div class="card bg-base-100 shadow-md w-64">
                            <div class="card-body">
                                <h3 class="card-title">Card Title</h3>
                                <p class="text-sm text-base-content/70">Card content goes here.</p>
                                <div class="card-actions justify-end">
                                    <button class="btn btn-primary btn-sm">Action</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Alerts */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Alerts</h2>
                    <div class="flex flex-col gap-2 max-w-md">
                        <div class="alert alert-info"><span>Info alert message</span></div>
                        <div class="alert alert-success"><span>Success alert message</span></div>
                        <div class="alert alert-warning"><span>Warning alert message</span></div>
                        <div class="alert alert-error"><span>Error alert message</span></div>
                    </div>
                </section>

                {/* Loading */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Loading</h2>
                    <div class="flex gap-4">
                        <span class="loading loading-spinner loading-md"></span>
                        <span class="loading loading-dots loading-md"></span>
                        <span class="loading loading-ring loading-md"></span>
                        <span class="loading loading-bars loading-md"></span>
                    </div>
                </section>

                {/* Progress */}
                <section>
                    <h2 class="text-lg font-semibold mb-3">Progress</h2>
                    <div class="flex flex-col gap-2 max-w-xs">
                        <progress class="progress progress-primary" value="25" max="100"></progress>
                        <progress class="progress progress-secondary" value="50" max="100"></progress>
                        <progress class="progress progress-accent" value="75" max="100"></progress>
                    </div>
                </section>
            </div>
        </div>
    );
}

// ============================================================================
// PLUGIN TUTORIAL
// ============================================================================

function PluginTutorial() {
    return (
        <div class="h-full overflow-auto p-6">
            <h1 class="text-2xl font-bold mb-6">Create a Plugin</h1>
            <p class="text-base-content/70 mb-8">
                Plugins are the building blocks of WebArcade. Here's how to create one:
            </p>

            <div class="space-y-8">
                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">1</span>
                        Create the plugin file
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Create a new folder in <code class="bg-base-300 px-1 rounded">plugins/</code> with an <code class="bg-base-300 px-1 rounded">index.jsx</code> file:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// plugins/my-plugin/index.jsx
import { plugin } from '@/api/plugin';

function MyPanel() {
    return (
        <div class="p-4">
            <h1>Hello from my plugin!</h1>
        </div>
    );
}

export default plugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',

    start(api) {
        // Register a panel
        api.register('my-panel', {
            type: 'panel',
            component: MyPanel,
            label: 'My Panel'
        });
    },

    stop() {}
});`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">2</span>
                        Register components
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Use <code class="bg-base-300 px-1 rounded">api.register()</code> to add panels, toolbar buttons, menus, and status items:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// Panel
api.register('my-panel', {
    type: 'panel',
    component: MyPanel,
    label: 'My Panel'
});

// Toolbar button
api.register('my-button', {
    type: 'toolbar',
    icon: IconStar,
    tooltip: 'Do something',
    onClick: () => console.log('Clicked!')
});

// Menu
api.register('my-menu', {
    type: 'menu',
    label: 'My Menu',
    submenu: [
        { label: 'Option 1', action: () => {} },
        { label: 'Option 2', action: () => {} }
    ]
});

// Status bar item
api.register('my-status', {
    type: 'status',
    component: () => <span>Ready</span>,
    align: 'right'
});`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">3</span>
                        Build and test
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Build your plugin and run the app:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`# Build the plugin
webarcade build my-plugin

# Or rebuild everything
bun run build`}</code></pre>
                </section>
            </div>
        </div>
    );
}

// ============================================================================
// LAYOUT TUTORIAL
// ============================================================================

function LayoutTutorial() {
    return (
        <div class="h-full overflow-auto p-6">
            <h1 class="text-2xl font-bold mb-6">Create a Layout</h1>
            <p class="text-base-content/70 mb-8">
                Layouts define the structure of your application. They use the <code class="bg-base-300 px-1 rounded">use</code> prop to inject plugin components.
            </p>

            <div class="space-y-8">
                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">1</span>
                        Create a layout component
                    </h2>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// src/layouts/MyLayout.jsx
import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls } from '@/components/ui';

export function MyLayout() {
    return (
        <Column class="h-screen bg-base-100">
            {/* Toolbar with plugin buttons */}
            <Toolbar use={['my-plugin:my-button']}>
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>

            {/* Main content area */}
            <Row flex={1}>
                {/* Resizable sidebar */}
                <Resizable direction="horizontal" side="end" defaultSize={250}>
                    <Slot
                        name="sidebar"
                        use={['my-plugin:my-panel']}
                    />
                </Resizable>

                {/* Main viewport */}
                <Slot
                    name="main"
                    flex={1}
                    use={['other-plugin:viewport']}
                />
            </Row>

            {/* Footer with status items */}
            <Footer use={['my-plugin:my-status']} />
        </Column>
    );
}`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">2</span>
                        Register the layout
                    </h2>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`// src/layouts/index.jsx
import { layoutManager } from '@/api/layout';
import { MyLayout } from './MyLayout';

export function registerLayouts() {
    layoutManager.register('my-layout', {
        name: 'My Layout',
        description: 'Custom layout',
        component: MyLayout,
        icon: 'dashboard'
    });
}

export { MyLayout };`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">3</span>
                        The magic of <code class="bg-base-300 px-1 rounded">use</code>
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        The <code class="bg-base-300 px-1 rounded">use</code> prop connects layouts to plugins. Format: <code class="bg-base-300 px-1 rounded">plugin-id:component-id</code>
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`{/* Single component */}
<Slot use={['demo:welcome']} />

{/* Multiple components (creates tabs) */}
<Slot use={[
    'editor:code',
    'editor:preview',
    'terminal:console'
]} />

{/* Toolbar buttons from multiple plugins */}
<Toolbar use={[
    'file:save-button',
    'edit:undo-button',
    'view:zoom-controls'
]} />`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">4</span>
                        Layout tab bar
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Add a horizontal tab bar to switch between layouts:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`import { LayoutTabs } from '@/components/ui';

// Basic usage
<LayoutTabs />

// With add button
<LayoutTabs
    showAdd={true}
    onAdd={() => createNewLayout()}
/>

// With close buttons
<LayoutTabs
    closable={true}
    onClose={(id) => layoutManager.unregister(id)}
/>`}</code></pre>
                </section>
            </div>
        </div>
    );
}

// ============================================================================
// BACKEND PLUGINS TUTORIAL
// ============================================================================

function BackendTutorial() {
    return (
        <div class="h-full overflow-auto p-6">
            <h1 class="text-2xl font-bold mb-6">Backend Plugins</h1>
            <p class="text-base-content/70 mb-8">
                Full-stack plugins combine a SolidJS frontend with a Rust backend for performance-critical tasks. The CLI handles all the configuration automatically.
            </p>

            <div class="space-y-8">
                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">1</span>
                        Plugin structure
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        A full-stack plugin contains these files:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`plugins/my-plugin/
├── index.jsx      # Frontend UI
├── Cargo.toml     # Routes & dependencies
├── mod.rs         # Plugin metadata
└── router.rs      # HTTP handlers`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">2</span>
                        Define routes in Cargo.toml
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Map HTTP endpoints to handler functions:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`[routes]
"GET /hello" = "handle_hello"
"POST /users" = "handle_create_user"
"GET /users/:id" = "handle_get_user"
"PUT /todos/:id/toggle" = "handle_toggle"`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">3</span>
                        Write handlers in router.rs
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Async functions that receive <code class="bg-base-300 px-1 rounded">HttpRequest</code> and return <code class="bg-base-300 px-1 rounded">HttpResponse</code>:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`pub async fn handle_hello(_req: HttpRequest) -> HttpResponse {
    json_response(&json!({
        "message": "Hello from Rust!"
    }))
}

pub async fn handle_get_user(req: HttpRequest) -> HttpResponse {
    let id = req.path_params.get("id").unwrap();
    // ... fetch user
    json_response(&user)
}

pub async fn handle_create_user(req: HttpRequest) -> HttpResponse {
    let body: CreateUser = req.body_json().unwrap();
    // ... create user
    json_response(&new_user)
}`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">4</span>
                        Call from frontend
                    </h2>
                    <p class="text-sm text-base-content/70 mb-3">
                        Use the <code class="bg-base-300 px-1 rounded">api()</code> helper to call your backend:
                    </p>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`import { api } from '@/api/plugin';

// GET request
const res = await api('my-plugin/hello');
const data = await res.json();

// POST request
const res = await api('my-plugin/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'John' })
});`}</code></pre>
                </section>

                <section>
                    <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span class="badge badge-primary">5</span>
                        Build
                    </h2>
                    <pre class="bg-base-300 p-4 rounded-lg text-sm overflow-x-auto"><code>{`webarcade build my-plugin`}</code></pre>
                    <p class="text-sm text-base-content/70 mt-3">
                        This compiles the Rust backend and bundles the JS frontend.
                    </p>
                </section>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN CONTENT PANEL
// ============================================================================

function MainContent() {
    return (
        <div class="h-full bg-base-100">
            <Show when={activeSection() === 'welcome'}>
                <WelcomeSection />
            </Show>
            <Show when={activeSection() === 'components'}>
                <ComponentsSection />
            </Show>
            <Show when={activeSection() === 'plugin-tutorial'}>
                <PluginTutorial />
            </Show>
            <Show when={activeSection() === 'layout-tutorial'}>
                <LayoutTutorial />
            </Show>
            <Show when={activeSection() === 'backend-tutorial'}>
                <BackendTutorial />
            </Show>
        </div>
    );
}

// ============================================================================
// PLUGIN EXPORT
// ============================================================================

export default plugin({
    id: 'demo',
    name: 'Welcome',
    version: '1.0.0',
    description: 'Welcome screen and tutorials for WebArcade',
    author: 'WebArcade',

    start(api) {
        api.register('sidebar', {
            type: 'panel',
            component: Sidebar,
            label: 'Navigation'
        });

        api.register('content', {
            type: 'panel',
            component: MainContent,
            label: 'Content'
        });

        api.register('help-menu', {
            type: 'menu',
            label: 'Help',
            order: 100,
            submenu: [
                { label: 'Documentation', action: () => window.open('https://warcade.github.io/docs/') },
                { label: 'GitHub', action: () => window.open('https://github.com/warcade/core') }
            ]
        });
    },

    stop() {}
});
