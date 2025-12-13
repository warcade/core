# WebArcade

A lightweight plugin platform for building native desktop applications with **SolidJS** (frontend) and **Rust** (backend). Build once, distribute plugins as simple JS/DLL files.

**Key Features:**
- ~2.5 MB binary (uses system WebView)
- Dynamic plugin loading at runtime
- Optional Rust backend per plugin (DLL)
- Panel-based UI composition
- Cross-plugin component sharing

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Modes](#plugin-modes)
3. [App Configuration](#app-configuration)
4. [Project Structure](#project-structure)
5. [Plugin Development](#plugin-development)
6. [Plugin API Reference](#plugin-api-reference)
7. [Bridge API Reference](#bridge-api-reference)
8. [CLI Reference](#cli-reference)
9. [Troubleshooting](#troubleshooting)

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
│   ├── api/               # Plugin and Bridge APIs
│   ├── panels/            # Unified panel system
│   └── layout/            # Main layout
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
└── viewport.jsx        # Components (optional)
```
→ Builds to: `build/plugins/my-plugin.js`

**Full-stack plugin:**
```
plugins/my-plugin/
├── index.jsx           # Frontend entry
├── viewport.jsx        # Components
├── Cargo.toml          # Routes & dependencies
├── mod.rs              # Plugin metadata
└── router.rs           # HTTP handlers
```
→ Builds to: `build/plugins/my-plugin.dll`

### Basic Plugin Example

```jsx
import { plugin } from '@/api/plugin';

export default plugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',

    start(api) {
        // Register plugin tab (shows in main tab bar)
        api.add({
            panel: 'tab',
            label: 'My Plugin',
            icon: MyIcon,
        });

        // Register main viewport
        api.add({
            panel: 'viewport',
            id: 'main',
            component: MainView,
        });

        // Register left panel tab
        api.add({
            panel: 'left',
            id: 'explorer',
            label: 'Explorer',
            component: Explorer,
        });

        // Register right panel tab
        api.add({
            panel: 'right',
            id: 'properties',
            label: 'Properties',
            component: Properties,
        });

        // Register bottom panel tab
        api.add({
            panel: 'bottom',
            id: 'console',
            label: 'Console',
            component: Console,
        });
    },

    active(api) {
        // Called when plugin becomes active
    },

    inactive(api) {
        // Called when plugin becomes inactive
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
│  start(api)  ─── Register panels, toolbar, menu, footer    │
│    ↓                                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  User switches plugins (tab bar)                    │    │
│  │    ↓                    ↓                           │    │
│  │  active(api)        inactive(api)                   │    │
│  │  Show panels        (other plugin now active)       │    │
│  └─────────────────────────────────────────────────────┘    │
│    ↓                                                        │
│  stop(api)  ─── Plugin disabled/unloaded                   │
└─────────────────────────────────────────────────────────────┘
```

- **start**: Called once when plugin loads. Register all UI components here.
- **active**: Called each time user switches TO this plugin. Show/configure panels.
- **inactive**: Called each time user switches AWAY from this plugin.
- **stop**: Called when plugin is disabled or app closes.

---

## Plugin API Reference

### The `api.add()` Method

Register components to different panel locations:

```jsx
api.add({
    panel: 'tab' | 'viewport' | 'left' | 'right' | 'bottom',
    id: 'unique-id',           // Required for viewport/panels
    label: 'Display Label',    // Tab label
    icon: IconComponent,       // Optional icon
    component: MyComponent,    // SolidJS component
    visible: true,             // Initial visibility (default: true)
    shared: false,             // Allow other plugins to use (default: false)
    order: 0,                  // Sort order
    closable: true,            // Can user close tab (default: true)
    start: (api) => {},        // First time mounted
    active: (api) => {},       // Plugin became active
    inactive: (api) => {},     // Plugin became inactive
});
```

### Panel Types

| Panel | Description |
|-------|-------------|
| `tab` | Main plugin tab bar (one per plugin) |
| `viewport` | Main content area (supports multiple tabs) |
| `left` | Left sidebar (supports multiple tabs) |
| `right` | Right sidebar (supports multiple tabs) |
| `bottom` | Bottom panel (supports multiple tabs) |

### Panel Visibility

```jsx
api.showLeft(true);     // Show left panel
api.showRight(true);    // Show right panel
api.showBottom(true);   // Show bottom panel

api.hideLeft();         // Hide left panel
api.hideRight();        // Hide right panel
api.hideBottom();       // Hide bottom panel

api.toggleLeft();       // Toggle left panel
api.toggleRight();      // Toggle right panel
api.toggleBottom();     // Toggle bottom panel
```

### Shared Panels

Plugins can share components with other plugins:

```jsx
// Plugin A - registers a shared panel
api.add({
    panel: 'left',
    id: 'file-explorer',
    label: 'Files',
    component: FileExplorer,
    shared: true,  // Other plugins can use this
});

// Plugin B - add Plugin A's component to own panels
api.addShared('plugin-a:file-explorer', {
    panel: 'left',           // Can put in different panel
    label: 'My Files',       // Override label
    order: 1                 // Override order
});

// Or just get the config without adding
const sharedPanel = api.useShared('plugin-a:file-explorer');
```

### Remove Components

```jsx
api.remove('component-id');  // Remove by ID
```

### Toolbar & Menu

```jsx
// Register toolbar groups
api.toolbarGroup('file-group', { label: 'File', order: 1 });
api.toolbarGroup('edit-group', { label: 'Edit', order: 2 });

// Add toolbar buttons
api.toolbar('save', {
    icon: IconSave,
    tooltip: 'Save file',
    group: 'file-group',
    order: 1,
    onClick: () => saveFile(),
    active: () => hasChanges(),      // Highlight when active
    disabled: () => isReadOnly(),    // Disable conditionally
    separator: true,                  // Add separator after
});

// Add toolbar with custom component
api.toolbar('zoom-slider', {
    component: ZoomSlider,
    group: 'view-group',
});

// Register top menu with submenus
api.menu('file', {
    label: 'File',
    order: 1,
    submenu: [
        { id: 'new', label: 'New', icon: IconFile, shortcut: 'Ctrl+N', action: () => {} },
        { id: 'open', label: 'Open', icon: IconFolder, shortcut: 'Ctrl+O', action: () => {} },
        { divider: true },
        { id: 'save', label: 'Save', shortcut: 'Ctrl+S', action: () => {} },
        {
            id: 'export',
            label: 'Export',
            submenu: [  // Nested submenu
                { id: 'pdf', label: 'As PDF', action: () => {} },
                { id: 'png', label: 'As PNG', action: () => {} },
            ]
        },
    ]
});
```

### Footer

```jsx
// Add footer component
api.footer('status', {
    component: StatusIndicator,
    order: 1,
});
```

### UI Visibility

```jsx
api.showToolbar(true);      // Show/hide toolbar
api.showMenu(true);         // Show/hide top menu
api.showFooter(true);       // Show/hide footer
api.showTabs(true);         // Show/hide viewport tabs
api.showPluginTabs(true);   // Show/hide plugin tab bar

api.fullscreen(true);       // Enter fullscreen
api.toggleFullscreen();     // Toggle fullscreen
```

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
│  ├── Plugin API + Panel Store                               │
│  ├── Plugin Bridge (services, pub/sub, shared store)        │
│  └── Unified layout system                                  │
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
