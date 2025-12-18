# WebArcade

A lightweight plugin platform for building native desktop applications with **SolidJS** (frontend) and **Rust** (backend). Build once, distribute plugins as simple JS/DLL files.

**Key Features:**
- ~2.5 MB binary (uses system WebView)
- Dynamic plugin loading at runtime
- Optional Rust backend per plugin (DLL)
- Component Registry + Layout Manager architecture
- Cross-plugin component sharing

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Modes](#plugin-modes)
3. [App Configuration](#app-configuration)
4. [Project Structure](#project-structure)
5. [Plugin Development](#plugin-development)
6. [Plugin API Reference](#plugin-api-reference)
7. [Layout System](#layout-system)
8. [Bridge API Reference](#bridge-api-reference)
9. [CLI Reference](#cli-reference)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

1. **Rust** - https://rustup.rs/
2. **Bun** - https://bun.sh/

### Installation

```bash
# Install the CLI
cargo install webarcade

# Create a new project
webarcade init my-app
cd my-app
```

### Running the App

```bash
# Development - build frontend and run app
webarcade dev

# Build production app with installer
webarcade app

# Build locked app (plugins embedded in binary)
webarcade app --locked
```

### Available Commands

| Command | Description |
|---------|-------------|
| `webarcade init <name>` | Initialize a new project |
| `webarcade dev` | Build frontend and run app |
| `webarcade app` | Build production app with installer |
| `webarcade app --locked` | Build app with embedded plugins |
| `webarcade new <id>` | Create a new plugin |
| `webarcade build <id>` | Build a plugin |
| `webarcade build --all` | Build all plugins |
| `webarcade install <user/repo>` | Install a plugin from GitHub |
| `webarcade list` | List available plugins |
| `webarcade package` | Package app (interactive) |

---

## Plugin Modes

### Unlocked Mode (Default)

```bash
webarcade app
```

- Plugins loaded from `plugins/` folder
- Users can add/remove plugins after installation

### Locked Mode

```bash
webarcade app --locked
```

- All plugins embedded in binary
- Single executable, no external files

---

## App Configuration

### Customizing the App

Edit `app/Cargo.toml`:

```toml
[package]
name = "MyApp"              # Executable filename
version = "1.0.0"
description = "My App"

[package.metadata.packager]
product-name = "My App"
identifier = "com.myapp"
icons = ["icon.ico", "icon.png"]
```

### App Icon

Place `icon.png` in `app/` directory - the build script converts it to `icon.ico` automatically.

---

## Project Structure

```
webarcade/
├── src/                    # Frontend (SolidJS)
│   ├── api/               # Plugin API, Layout Manager, Bridge
│   │   ├── plugin/        # Plugin system & Component Registry
│   │   └── layout/        # Layout Manager
│   ├── components/        # UI and layout components
│   │   ├── layout/        # Row, Column, Slot, Resizable
│   │   └── ui/            # Toolbar, Footer, WindowControls, etc.
│   └── layouts/           # Layout definitions
├── app/                    # Desktop runtime (Rust)
│   ├── src/               # Runtime source
│   ├── dist/              # Built frontend
│   └── plugins/           # Production plugins
└── plugins/               # Plugin source code
```

---

## Plugin Development

### Quick Start

```bash
# Create a frontend-only plugin
webarcade new my-plugin --frontend-only

# Create a full-stack plugin (with Rust backend)
webarcade new my-plugin

# Build the plugin
webarcade build my-plugin
```

### Plugin Structure

**Frontend-only plugin:**
```
plugins/my-plugin/
├── index.jsx           # Plugin entry (required)
└── components.jsx      # Components (optional)
```
→ Builds to: `build/plugins/my-plugin.js`

**Full-stack plugin:**
```
plugins/my-plugin/
├── index.jsx           # Frontend entry
├── components.jsx      # Components
├── Cargo.toml          # Routes & dependencies
├── mod.rs              # Plugin metadata
└── router.rs           # HTTP handlers
```
→ Builds to: `build/plugins/my-plugin.dll`

### Basic Plugin Example

```jsx
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
        // Register a panel component
        api.register('my-panel', {
            type: 'panel',
            component: MyPanel,
            label: 'My Panel'
        });

        // Register a toolbar button
        api.register('save-btn', {
            type: 'toolbar',
            icon: IconSave,
            tooltip: 'Save file',
            onClick: () => saveFile()
        });

        // Register a menu
        api.register('file-menu', {
            type: 'menu',
            label: 'File',
            order: 1,
            submenu: [
                { label: 'New', action: () => {} },
                { label: 'Open', action: () => {} }
            ]
        });

        // Register a status bar item
        api.register('line-count', {
            type: 'status',
            component: () => <span>Line 1</span>,
            align: 'right'
        });
    },

    stop(api) {
        // Called when plugin is stopped/unloaded
    }
});
```

### Plugin Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│  Plugin Loaded                                              │
│    ↓                                                        │
│  start(api)  ─── Register components to the registry        │
│    ↓                                                        │
│  Components rendered in layouts via <Slot use={[...]} />    │
│    ↓                                                        │
│  stop(api)  ─── Plugin disabled/unloaded                   │
└─────────────────────────────────────────────────────────────┘
```

- **start**: Called once when plugin loads. Register all components here.
- **stop**: Called when plugin is disabled or app closes.

---

## Plugin API Reference

### The `api.register()` Method

Register components to the Component Registry:

```jsx
api.register('component-id', {
    type: 'panel' | 'toolbar' | 'menu' | 'status',
    component: MyComponent,      // SolidJS component (for panel/status)
    label: 'Display Label',      // Label for tabs/tooltips
    icon: IconComponent,         // Optional icon
    order: 0,                    // Sort order
    // Type-specific options below...
});
```

### Component Types

| Type | Description |
|------|-------------|
| `panel` | UI panels rendered in Slots |
| `toolbar` | Toolbar buttons |
| `menu` | Top menu items with submenus |
| `status` | Status bar items |

### Panel Configuration

```jsx
api.register('explorer', {
    type: 'panel',
    component: Explorer,
    label: 'Explorer',
    icon: IconFolder,
    closable: true,              // Can user close tab (default: true)
    onMount: () => {},           // Called when mounted
    onUnmount: () => {},         // Called when unmounted
    onFocus: () => {},           // Called when focused
    onBlur: () => {}             // Called when blurred
});
```

### Toolbar Configuration

```jsx
api.register('save-btn', {
    type: 'toolbar',
    icon: IconSave,
    tooltip: 'Save file',
    group: 'file-group',         // Group for organization
    order: 1,
    onClick: () => saveFile(),
    active: () => hasChanges(),  // Highlight when true
    disabled: () => isReadOnly(),// Disable when true
    separator: true              // Add separator after
});

// Or with a custom component
api.register('zoom-slider', {
    type: 'toolbar',
    component: ZoomSlider,
    group: 'view-group'
});
```

### Menu Configuration

```jsx
api.register('file-menu', {
    type: 'menu',
    label: 'File',
    order: 1,
    submenu: [
        { label: 'New', icon: IconFile, shortcut: 'Ctrl+N', action: () => {} },
        { label: 'Open', icon: IconFolder, shortcut: 'Ctrl+O', action: () => {} },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => {} },
        {
            label: 'Export',
            submenu: [  // Nested submenu
                { label: 'As PDF', action: () => {} },
                { label: 'As PNG', action: () => {} }
            ]
        }
    ]
});
```

### Status Bar Configuration

```jsx
api.register('line-count', {
    type: 'status',
    component: LineCounter,
    align: 'left' | 'right',     // Position in status bar
    priority: 0                   // Higher = closer to edge
});
```

### Slot Control

Control components within slots programmatically:

```jsx
api.slot('my-panel').show();     // Show the component
api.slot('my-panel').hide();     // Hide the component
api.slot('my-panel').toggle();   // Toggle visibility
api.slot('my-panel').focus();    // Focus/activate the component
```

### Layout Management

```jsx
api.layout.setActive('my-layout');   // Switch to a different layout
api.layout.getActiveId();            // Get current layout ID
api.layout.getAll();                 // Get all registered layouts
api.layout.back();                   // Go back to previous layout
api.layout.canGoBack();              // Check if can go back

api.layout.focus();                  // Focus current plugin
api.layout.reveal('panel-id');       // Reveal a component in layout
api.layout.fullscreen(true);         // Enter fullscreen
api.layout.hideAll();                // Hide all UI
api.layout.showAll();                // Show all UI

// Register a new layout (for plugins that provide layouts)
api.layout.register('custom-layout', {
    name: 'Custom Layout',
    component: CustomLayout,
    icon: 'dashboard'
});
```

### Keyboard Shortcuts

```jsx
// Register multiple shortcuts at once
const unregister = api.shortcut({
    'ctrl+s': (e) => save(),
    'ctrl+n': (e) => newFile(),
    'ctrl+shift+p': (e) => openCommandPalette()
});

// Or register a raw handler
const unregister = api.shortcut.register((event) => {
    if (api.shortcut.matches(event, 'ctrl+s')) {
        event.preventDefault();
        save();
    }
});

// Temporarily disable/enable shortcuts
api.shortcut.disable();
api.shortcut.enable();

// Clean up
unregister();
```

### Context Menus

```jsx
const unregister = api.context({
    target: '.file-item',  // CSS selector or element
    items: [
        { label: 'Open', action: (el) => open(el) },
        { label: 'Delete', action: (el) => delete(el) },
        { divider: true },
        { label: 'Properties', action: (el) => showProps(el) }
    ]
});
```

### Component Discovery

```jsx
// Unregister a component
api.unregister('my-panel');

// Get a component from any plugin
const component = api.getComponent('other-plugin:panel-id');

// Find components by contract
const editors = api.findByContract({ provides: 'editor' });
```

---

## Layout System

Layouts define the structure of your application. They use the `use` prop to inject plugin components.

### Creating a Layout

```jsx
// src/layouts/MyLayout.jsx
import { Row, Column, Slot, Resizable } from '@/components/layout';
import { Toolbar, Footer, DragRegion, WindowControls } from '@/components/ui';

export function MyLayout() {
    return (
        <Column class="h-screen bg-base-100">
            {/* Toolbar with plugin buttons */}
            <Toolbar use={['my-plugin:save-btn', 'my-plugin:undo-btn']}>
                <DragRegion class="flex-1 h-full" />
                <WindowControls />
            </Toolbar>

            {/* Main content area */}
            <Row flex={1}>
                {/* Resizable sidebar */}
                <Resizable direction="horizontal" side="end" defaultSize={250}>
                    <Slot
                        name="sidebar"
                        use={['my-plugin:explorer']}
                    />
                </Resizable>

                {/* Main viewport with tabs */}
                <Slot
                    name="main"
                    flex={1}
                    use={['editor:code', 'editor:preview']}
                />

                {/* Right sidebar */}
                <Resizable direction="horizontal" side="start" defaultSize={300}>
                    <Slot
                        name="properties"
                        use={['my-plugin:properties']}
                    />
                </Resizable>
            </Row>

            {/* Footer with status items */}
            <Footer use={['my-plugin:line-count', 'git:branch-status']} />
        </Column>
    );
}
```

### Registering Layouts

```jsx
// src/layouts/index.jsx
import { layout } from 'webarcade/layout';
import { MyLayout } from './MyLayout';

export function registerLayouts() {
    layout.register('my-layout', {
        name: 'My Layout',
        description: 'Custom layout for my app',
        component: MyLayout,
        icon: 'dashboard',
        order: 1
    });
}

export { MyLayout };
```

### The `use` Prop

The `use` prop connects layouts to plugin components. Format: `plugin-id:component-id`

```jsx
{/* Single component */}
<Slot use={['demo:welcome']} />

{/* Multiple components (creates tabs) */}
<Slot use={[
    'editor:code',
    'editor:preview',
    'terminal:console'
]} />

{/* Hide tabs for single-component slots */}
<Slot use={['demo:sidebar']} showTabs={false} />

{/* Toolbar buttons from multiple plugins */}
<Toolbar use={[
    'file:save-button',
    'edit:undo-button',
    'view:zoom-controls'
]} />
```

### Layout Components

| Component | Description |
|-----------|-------------|
| `Row` | Horizontal flex container |
| `Column` | Vertical flex container |
| `Slot` | Renders plugin components (with optional tabs) |
| `Resizable` | Resizable container with drag handle |
| `Toolbar` | Top toolbar area |
| `Footer` | Bottom status bar |
| `DragRegion` | Window drag area (for borderless windows) |
| `WindowControls` | Minimize/maximize/close buttons |

---

## Bridge API Reference

The Bridge provides three inter-plugin communication patterns plus HTTP/WebSocket for backend communication.

### 1. Services - Share Objects Between Plugins

Services let plugins expose functionality that other plugins can use.

```jsx
// audio-plugin: Provide a service
start(api) {
    const audioService = {
        play: (sound) => { /* ... */ },
        stop: () => { /* ... */ },
        setVolume: (v) => { /* ... */ }
    };
    api.provide('audio', audioService);
}

// game-plugin: Use the service
start(api) {
    // Wait for service (async, with timeout)
    const audio = await api.use('audio');
    audio.play('bgm');

    // Or check synchronously
    const audio = api.tryUse('audio');
    if (audio) audio.play('bgm');

    // Check if service exists
    if (api.hasService('audio')) { /* ... */ }
}
```

| Method | Description |
|--------|-------------|
| `api.provide(name, service)` | Register a service |
| `api.use(name, timeout?)` | Get service (waits if not ready) |
| `api.tryUse(name)` | Get service or null (non-blocking) |
| `api.hasService(name)` | Check if service exists |
| `api.unprovide(name)` | Remove a service |

### 2. Message Bus - Pub/Sub Communication

Publish and subscribe to channels for event-driven communication.

```jsx
// Subscribe to messages
const unsubscribe = api.subscribe('player:death', (data, meta) => {
    console.log('Player died:', data.playerId);
    console.log('Timestamp:', meta.timestamp);
});

// Publish a message
api.publish('player:death', { playerId: 1, cause: 'fall' });

// One-time subscription
api.once('game:ready', (data) => {
    console.log('Game is ready!');
});

// Wait for message (Promise-based)
const { data } = await api.waitFor('game:ready', 5000);

// Create channel with replay (new subscribers get last N messages)
api.createChannel('chat:messages', { replay: 50 });

// Clean up
unsubscribe();
```

| Method | Description |
|--------|-------------|
| `api.subscribe(channel, callback)` | Subscribe to channel, returns unsubscribe fn |
| `api.publish(channel, data)` | Publish message to channel |
| `api.once(channel, callback)` | One-time subscription |
| `api.waitFor(channel, timeout?)` | Wait for message (Promise) |
| `api.createChannel(channel, options)` | Configure channel (e.g., replay) |

### 3. Shared Store - Reactive State

A SolidJS-powered reactive store for sharing state across plugins.

```jsx
// Set values (dot-notation paths)
api.set('player.health', 100);
api.set('player.position', { x: 0, y: 0, z: 0 });
api.set('settings.audio.volume', 0.8);

// Get values
const health = api.get('player.health');
const volume = api.get('settings.audio.volume', 1.0); // with default

// Update with function
api.update('player.health', (h) => Math.max(0, h - 10));

// Merge objects
api.merge('player', { score: 100, level: 2 });

// Watch for changes
const unwatch = api.watch('player.health', (newVal, oldVal, path) => {
    console.log(`Health: ${oldVal} -> ${newVal}`);
});

// Use in SolidJS components (reactive)
function HealthBar() {
    const health = api.selector('player.health', 100);
    return <div style={{ width: `${health()}%` }} />;
}

// Batch updates for performance
api.batch(() => {
    api.set('player.health', 100);
    api.set('player.mana', 50);
    api.set('player.stamina', 75);
});

// Delete and check
api.delete('player.tempBuff');
if (api.has('player.health')) { /* ... */ }
```

| Method | Description |
|--------|-------------|
| `api.set(path, value)` | Set value at path |
| `api.get(path, default?)` | Get value at path |
| `api.update(path, fn)` | Update with function |
| `api.merge(path, obj)` | Shallow merge object |
| `api.watch(path, callback)` | Watch for changes |
| `api.selector(path, default?)` | Get reactive selector for components |
| `api.delete(path)` | Delete path |
| `api.has(path)` | Check if path exists |
| `api.batch(fn)` | Batch multiple updates |
| `api.getStore()` | Get raw SolidJS store |

### 4. HTTP API - Backend Communication

```jsx
import { api } from '@/api/plugin';

// GET request
const response = await api('my-plugin/hello');
const data = await response.json();

// POST request
const response = await api('my-plugin/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'New Item' })
});
```

### Rust Backend

**Cargo.toml:**
```toml
[package]
name = "my-plugin"
version = "1.0.0"
edition = "2021"

[routes]
"GET /hello" = "handle_hello"
"POST /items" = "handle_create"
"GET /items/:id" = "handle_get_item"
```

**router.rs:**
```rust
use api::{HttpRequest, HttpResponse, json, json_response, error_response};

pub async fn handle_hello(_req: HttpRequest) -> HttpResponse {
    json_response(&json!({
        "message": "Hello from Rust!"
    }))
}

pub async fn handle_get_item(req: HttpRequest) -> HttpResponse {
    let id = req.path_params.get("id").cloned().unwrap_or_default();
    json_response(&json!({ "id": id }))
}
```

### HttpRequest Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `query("name")` | `Option<String>` | Get query parameter |
| `path_params.get("name")` | `Option<&String>` | Get path parameter |
| `header("name")` | `Option<&String>` | Get header |
| `body_json<T>()` | `Result<T>` | Parse body as JSON |

---

## CLI Reference

Install the CLI with `cargo install webarcade`.

```bash
# Initialize a new project
webarcade init my-app

# Development
webarcade dev                # Build frontend and run app

# Production builds
webarcade app                # Build app with installer
webarcade app --locked       # Build with embedded plugins

# Create plugins
webarcade new my-plugin
webarcade new my-plugin --frontend-only
webarcade new my-plugin --name "My Plugin" --author "You"

# Build plugins
webarcade build my-plugin    # Build specific plugin
webarcade build --all        # Build all plugins

# Install plugins from GitHub
webarcade install user/repo  # Install from GitHub
webarcade install user/repo -f  # Force reinstall

# List plugins
webarcade list

# Package app (interactive)
webarcade package
webarcade package --locked   # Embed plugins in binary
```

### Installing Plugins from GitHub

The `install` command lets you install plugins directly from GitHub repositories:

```bash
webarcade install username/repo
```

**How it works:**
1. Clones the repository from `https://github.com/username/repo`
2. Validates it contains a valid WebArcade plugin
3. Checks if already installed and compares versions
4. Prompts to update/reinstall if needed
5. Copies plugin source to your `plugins/` directory

**Version detection:** The CLI extracts version info from `package.json`, `Cargo.toml`, or `index.jsx`.

**Plugin repository structure:** The plugin can be at the repo root or in a subdirectory:

```
# Root-level plugin
my-plugin/
├── index.jsx
├── mod.rs
└── Cargo.toml

# Or in a subdirectory
my-plugin-repo/
├── README.md
└── plugin/
    ├── index.jsx
    ├── mod.rs
    └── Cargo.toml
```

**After installing:**
```bash
webarcade build my-plugin    # Build the installed plugin
webarcade dev                # Run the app
```

### Build Output

| Plugin Type | Build Output | Installed To |
|-------------|--------------|--------------|
| Frontend-only | `build/plugins/foo.js` | `app/plugins/foo.js` |
| Full-stack | `build/plugins/foo.dll` + `foo.js` | `app/plugins/foo.dll` |

**Note:** The CLI automatically installs built plugins to `app/plugins/` for the runtime to load.

---

## Troubleshooting

### Common Errors

**"Plugin not detected"**
- Ensure `index.jsx` exists in the plugin directory

**"Handler not found"**
- Check route names in `Cargo.toml` match function names
- Ensure handlers are `pub`

**"Build failed"**
- Check handler signature: `pub async fn name(req: HttpRequest) -> HttpResponse`

**"DLL won't reload"**
- Restart the app - DLLs are locked while loaded

### Development Tips

1. Set `RUST_LOG=debug` for detailed logs
2. Check browser DevTools for frontend errors
3. Plugin changes require rebuild: `webarcade build <name>`
4. Frontend-only plugins build in ~1s, full-stack ~10-30s

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WebArcade Runtime                       │
│                        (~2.5 MB)                            │
├─────────────────────────────────────────────────────────────┤
│  Rust Binary (tao + wry)                                    │
│  ├── Borderless window + IPC                                │
│  ├── Bridge server (HTTP localhost:3001)                    │
│  ├── WebSocket server (localhost:3002)                      │
│  └── Dynamic DLL loader                                     │
├─────────────────────────────────────────────────────────────┤
│  SolidJS Frontend (served from localhost:3000)              │
│  ├── Plugin API + Component Registry                        │
│  ├── Layout Manager + Slot-based rendering                  │
│  ├── Plugin Bridge (services, pub/sub, shared store)        │
│  └── 50+ UI components (DaisyUI-based)                      │
├─────────────────────────────────────────────────────────────┤
│  Plugins (loaded at runtime from app/plugins/)              │
│  ├── plugin.js   → UI components                            │
│  └── plugin.dll  → Rust backend (optional)                  │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Distribution

Plugins are self-contained and portable:

```
my-plugin/
├── my-plugin.js       # Frontend (required)
└── my-plugin.dll      # Backend (optional, Windows)
```

**Installing plugins:**
- From GitHub: `webarcade install username/repo`
- Manual: Copy plugin files to the `plugins/` directory

No npm, no compilation required for end users.

---

## License

MIT License
