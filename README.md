# WebArcade

WebArcade is an **open-source platform** that lets you create native plugins using **SolidJS** (frontend) and **Rust** (backend). Build custom features, widgets, and functionality to extend the WebArcade ecosystem.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Plugin Development](#plugin-development)
  - [Using the Developer IDE](#using-the-developer-ide-recommended)
  - [Manual Plugin Development](#manual-plugin-development)
- [Installing Plugins](#installing-plugins)
- [Plugin Structure](#plugin-structure)
- [Frontend Development](#frontend-development)
- [Backend Development](#backend-development)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Security](#security)
- [Contributing](#contributing)

## Features

- **Plugin System**: Extend functionality with custom plugins
- **Full-Stack Development**: SolidJS frontend + Rust backend
- **Built-in IDE**: Develop plugins directly within WebArcade
- **Dashboard Widgets**: Create draggable, resizable dashboard components
- **Real-time Events**: WebSocket-based event system for inter-plugin communication
- **Database Access**: SQLite database with JSON parameter binding
- **HTTP Routing**: Simple route registration with automatic request handling
- **Sandboxed API**: Safe, secure plugin environment

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/webarcade.git
cd webarcade

# Install dependencies
bun install

# Build the application
cargo build --release

# Run in development mode
bun run dev
```

### Creating Your First Plugin

1. Open WebArcade and navigate to the **Developer** plugin
2. Click **"New Plugin"** in the toolbar
3. Choose a template (Basic, Widget, Backend, or Full-stack)
4. Fill in plugin details (ID, name, description, author)
5. Edit files in the built-in code editor
6. Click **"Build"** to compile your plugin

## Plugin Development

### Two Ways to Develop Plugins

#### Using the Developer IDE (Recommended)

WebArcade includes a built-in Developer IDE for creating and building plugins:

1. Open WebArcade and navigate to the **Developer** plugin from the menu
2. Click **"New Plugin"** in the toolbar
3. Choose a template:
   - **Basic**: Simple frontend-only plugin with viewport
   - **Widget**: Plugin with dashboard widget component
   - **Backend**: Rust backend with API routes
   - **Full-stack**: Complete plugin with frontend, backend, and widget
4. Fill in plugin details (ID, name, description, author)
5. The IDE will generate the plugin structure in `src/plugins/developer/projects/`
6. Edit files in the built-in code editor
7. Click **"Build"** to compile your plugin into a distributable `.zip`

**Development Directory**: `src/plugins/developer/projects/your-plugin-name/`

**Note**: Plugins in the projects directory are excluded from the main build and are only for development.

#### Manual Plugin Development

You can also create plugins manually for more control or when building outside WebArcade.

## Installing Plugins

The easiest way to install a plugin is to **drag and drop** a plugin `.zip` file anywhere in the WebArcade application window. The app will automatically:

1. Extract the plugin to the runtime plugins directory
2. Validate its structure and manifest
3. Install the plugin files
4. Prompt you to restart to load the plugin

### Plugin Installation Locations

**Runtime Plugins (Drag & Drop):**
- Windows: `%LOCALAPPDATA%\WebArcade\plugins\`
- Linux: `~/.local/share/WebArcade/plugins/`
- macOS: `~/Library/Application Support/WebArcade/plugins/`

**Development Plugins (IDE):**
- Located in `src/plugins/developer/projects/` (not compiled into main app)

## Plugin Structure

### Minimal Frontend-Only Plugin

```
my-plugin/
├── package.json          # Required: Plugin metadata and configuration
├── index.jsx             # Optional: Main plugin entry point
└── Widget.jsx            # Optional: A widget component
```

### Full-Stack Plugin with DLL Backend

```
my-plugin/
├── package.json          # Required: Plugin metadata, routes, and dependencies
├── plugin.js             # Frontend bundle (ES module)
├── my-plugin.dll         # Windows binary
├── libmy-plugin.so       # Linux binary
└── libmy-plugin.dylib    # macOS binary
```

**Note:** All files are in the root directory. Platform detection happens automatically based on filename extensions (`.dll`, `.so`, `.dylib`).

### package.json

Every plugin **must** include a `package.json` file with a `webarcade` section:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "A plugin that does amazing things",
  "author": "Your Name",
  "dependencies": {
    "canvas-confetti": "^1.9.2"
  },
  "webarcade": {
    "id": "my-plugin"
  }
}
```

#### Standard package.json Fields

- `name` (string): Package name
- `version` (string): Semantic version (e.g., "1.0.0")
- `description` (string): Brief description of the plugin
- `author` (string): Plugin author
- `dependencies` (object): npm dependencies for frontend code

#### WebArcade Configuration (`webarcade` section)

- `id` (string, required): Unique plugin identifier (alphanumeric, hyphens, underscores only)

**Auto-detected fields (set during build):**
- `has_frontend`: Auto-detected by checking for `index.jsx` or `index.js`
- `has_backend`: Auto-detected by checking for `mod.rs` or `Cargo.toml`
- `routes`: Auto-extracted from `router.rs` during build

## Frontend Development

### Plugin Entry Point (index.jsx)

Frontend plugins use the WebArcade Plugin API:

```jsx
import { createPlugin } from '@/api/plugin';
import { IconPlugin } from '@tabler/icons-solidjs';
import MyViewport from './MyViewport.jsx';
import MyWidget from './widgets/MyWidget.jsx';

export default createPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Does cool things',
  author: 'Your Name',

  async onStart(api) {
    console.log('[My Plugin] Starting...');

    // Register a viewport (main view)
    api.viewport('my-plugin-viewport', {
      label: 'My Plugin',
      component: MyViewport,
      icon: IconPlugin,
      description: 'Main plugin interface'
    });

    // Add menu item
    api.menu('my-plugin-menu', {
      label: 'My Plugin',
      icon: IconPlugin,
      onClick: () => {
        api.open('my-plugin-viewport', {
          label: 'My Plugin'
        });
      }
    });

    // Register a widget (dashboard component)
    api.widget('my-plugin-widget', {
      title: 'My Widget',
      component: MyWidget,
      icon: IconPlugin,
      description: 'A dashboard widget',
      defaultSize: { w: 2, h: 2 },
      minSize: { w: 1, h: 1 },
      maxSize: { w: 4, h: 4 }
    });
  },

  async onStop() {
    console.log('[My Plugin] Stopping...');
  }
});
```

### Creating Widgets

Widgets are draggable components that can be placed on the dashboard:

```jsx
// widgets/MyWidget.jsx
import { createSignal } from 'solid-js';
import { IconPlugin } from '@tabler/icons-solidjs';

export default function MyWidget() {
  const [count, setCount] = createSignal(0);

  return (
    <div class="card bg-gradient-to-br from-primary/20 to-primary/5 bg-base-100 shadow-lg h-full flex flex-col p-4">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <IconPlugin size={20} class="text-primary opacity-80" />
          <span class="text-sm font-medium opacity-70">My Widget</span>
        </div>
      </div>

      {/* Content */}
      <div class="flex-1 flex flex-col items-center justify-center">
        <div class="text-4xl font-bold text-primary mb-4">
          {count()}
        </div>
        <button
          class="btn btn-primary btn-sm"
          onClick={() => setCount(count() + 1)}
        >
          Increment
        </button>
      </div>

      {/* Footer */}
      <div class="text-xs opacity-50 text-center mt-2">
        Click to increment
      </div>
    </div>
  );
}
```

**Important**: Widgets must be imported and registered in `index.jsx` using `api.widget()` to be included in the build.

### Using Third-Party JavaScript Libraries

Add any npm package to your plugin by adding it to the `dependencies` section in `package.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "dependencies": {
    "canvas-confetti": "^1.9.2",
    "date-fns": "^3.0.0",
    "chart.js": "^4.4.0"
  },
  "webarcade": {
    "id": "my-plugin"
  }
}
```

Then use them in your plugin code:

```jsx
import confetti from 'canvas-confetti';
import { format } from 'date-fns';

export default function MyViewport() {
  const celebrate = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div>
      <p>Today is {format(new Date(), 'MMMM do, yyyy')}</p>
      <button onClick={celebrate}>Celebrate!</button>
    </div>
  );
}
```

**How it works:**
1. The plugin builder automatically detects dependencies in `package.json`
2. Runs `bun install` or `npm install` before bundling
3. Bundles the dependencies into your `plugin.js`
4. Dependencies are included in the final plugin package

**Note:** External dependencies increase your plugin size. Use them wisely!

### Calling Backend from Frontend

Use the `api` API to call backend routes:

```jsx
import { api } from '@/api/bridge';

async function fetchData() {
  try {
    // Calls /my-plugin/hello endpoint
    const response = await api('my-plugin/hello');
    const data = await response.json();
    console.log(data.message);
  } catch (err) {
    console.error('Failed to fetch:', err);
  }
}
```

## Backend Development

Backend plugins use the **api** crate, which provides a safe, sandboxed interface to the WebArcade core.

### Why Use the API Crate?

- ✅ **Security**: Sandboxed API prevents malicious plugins from accessing internal systems
- ✅ **Safety**: Type-safe boundaries with automatic memory management
- ✅ **Simplicity**: Clean abstractions hide FFI complexity
- ✅ **Maintainability**: Easy-to-use async functions instead of raw C exports

### Cargo.toml

Every backend plugin needs a `Cargo.toml` file. The minimal version is:

```toml
[package]
name = "my-plugin"
version = "1.0.0"
edition = "2021"

[dependencies]
# Add your custom dependencies here (if any)
reqwest = { version = "0.12", features = ["json"] }
some-other-crate = "1.0"

[profile.release]
opt-level = "z"      # Optimize for size
lto = true           # Link-time optimization
codegen-units = 1
strip = true         # Strip symbols
```

**Important Notes:**
- The `api` dependency is **automatically injected** by the plugin builder
- The `[lib]` section with `crate-type = ["cdylib"]` and `path = "lib.rs"` is **automatically added** during build
- A `lib.rs` file is **automatically generated** as the main module that exports your plugin
- You only need to define your plugin in `mod.rs` - the builder handles all FFI boilerplate
- You only need `[dependencies]` if you have custom dependencies beyond what the `api` crate provides

**Dependencies Provided by `api::core::*`:**
- **serde** (with Serialize, Deserialize)
- **serde_json** (with json! macro, Value)
- **anyhow** (with Result, Error, anyhow! macro)
- **async-trait** (with #[async_trait] macro)
- **log** (with info!, error!, warn!, debug! macros)
- **tokio** (async runtime with sync and time features)
- **hyper** (HTTP types)
- **chrono** (date and time utilities)
- **regex** (regular expressions)
- **uuid** (UUID generation with v4 and serde support)
- **base64** (base64 encoding/decoding)
- **rand** (random number generation)

These are re-exported from `api::core`, so you don't need to add them to your Cargo.toml!

**Example usage:**
```rust
use api::core::*;

// Generate a UUID
let id = uuid::Uuid::new_v4();

// Use regex
let re = regex::Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();

// Get current time
let now = chrono::Utc::now();

// Generate random number
let random_num = rand::random::<u32>();

// Base64 encode
let encoded = base64::encode("Hello, World!");
```

### mod.rs

```rust
mod router;

use api::core::*;
use std::sync::Arc;

pub struct MyPlugin;

#[async_trait]
impl Plugin for MyPlugin {
    plugin_metadata!(
        "my-plugin",
        "My Plugin",
        "1.0.0",
        "Does backend things",
        author: "Your Name"
    );

    async fn init(&self, ctx: &Context) -> Result<()> {
        log::info!("[My Plugin] Initializing...");

        // Database migrations (optional)
        ctx.migrate(&[
            r"
            CREATE TABLE IF NOT EXISTS my_plugin_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
            ",
        ])?;

        // Register API routes
        router::register_routes(ctx).await?;

        Ok(())
    }

    async fn start(&self, _ctx: Arc<Context>) -> Result<()> {
        log::info!("[My Plugin] Starting...");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[My Plugin] Stopping...");
        Ok(())
    }
}
```

### router.rs

```rust
use api::core::*;

pub async fn register_routes(ctx: &Context) -> Result<()> {
    let mut router = Router::new();

    // Register route handlers
    route!(router, GET "/hello" => handle_hello);
    route!(router, GET "/data" => handle_data);

    // Register the router with your plugin ID
    ctx.register_router("my-plugin", router).await;

    Ok(())
}

async fn handle_hello() -> HttpResponse {
    let response = json!({
        "message": "Hello from my plugin!"
    });

    json_response(&response)
}

#[derive(Serialize)]
struct DataResponse {
    timestamp: u64,
    value: String,
}

async fn handle_data() -> HttpResponse {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let data = DataResponse {
        timestamp,
        value: String::from("Data from Rust backend!"),
    };

    json_response(&data)
}
```

### Database Access

Use the Context to interact with the plugin database:

```rust
async fn save_data(value: String) -> Result<()> {
    let ctx = Context::global();
    let db = ctx.db();

    let params = json!({
        "value": value,
        "created_at": timestamp()
    });

    db.execute(
        "INSERT INTO my_plugin_data (value, created_at) VALUES (?1, ?2)",
        &params
    ).await?;

    Ok(())
}

async fn get_all_data() -> Result<Vec<MyData>> {
    let ctx = Context::global();
    let db = ctx.db();

    let results = db.query(
        "SELECT * FROM my_plugin_data ORDER BY created_at DESC",
        &json!({})
    ).await?;

    Ok(results)
}
```

## Events and WebSocket

WebArcade provides a powerful event system that allows plugins to communicate with each other and with the frontend via WebSocket.

### Backend: Emitting Events

Plugins can emit events from the Rust backend using the `ctx.emit()` method:

```rust
use api::core::*;

async fn handle_chat_message() -> HttpResponse {
    let ctx = Context::global();

    // Emit an event to all subscribers
    ctx.emit("twitch:chat_message", json!({
        "username": "john_doe",
        "message": "Hello, world!",
        "timestamp": timestamp()
    })).await;

    json_response(&json!({ "status": "ok" }))
}
```

Events are automatically broadcast to:
- The WebSocket server (port 3002 by default)
- All WebSocket clients connected to the frontend
- Other plugins subscribed to this event type

### Backend: Subscribing to Events

Plugins can subscribe to events emitted by other plugins:

```rust
use api::core::*;

async fn start_event_listener(ctx: Arc<Context>) {
    // Subscribe to a specific event type
    let mut rx = ctx.subscribe_to("twitch:chat_message").await;

    tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            log::info!("Received event: {:?}", event);

            // Deserialize the payload
            if let Ok(chat_msg) = serde_json::from_value::<ChatMessage>(event.payload) {
                // Process the event
                process_chat_message(chat_msg).await;
            }
        }
    });
}

// Or subscribe to ALL events
async fn listen_to_all_events(ctx: Arc<Context>) {
    let mut rx = ctx.subscribe_all();

    tokio::spawn(async move {
        while let Ok(event) = rx.recv().await {
            log::info!("Event from {}: {}", event.source_plugin, event.event_type);
        }
    });
}
```

### Frontend: Subscribing to Events via WebSocket

Frontend components can connect to the WebSocket server to receive real-time events:

```jsx
import { createSignal, createEffect, onCleanup } from 'solid-js';
import { ws } from '@/api/bridge';

export default function TwitchChatWidget() {
  const [messages, setMessages] = createSignal([]);
  const [connected, setConnected] = createSignal(false);

  createEffect(() => {
    // Get WebSocket connection (shared singleton)
    const socket = ws();

    const handleOpen = () => {
      console.log('Connected to WebSocket');
      setConnected(true);
    };

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check if this is a Twitch chat message event
        if (data.event_type === 'twitch:chat_message') {
          const { username, message, timestamp } = data.payload;

          setMessages(prev => [...prev, {
            username,
            message,
            timestamp
          }]);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    const handleClose = () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    };

    const handleError = (err) => {
      console.error('WebSocket error:', err);
    };

    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);

    // Cleanup - remove event listeners (don't close, it's shared!)
    onCleanup(() => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('close', handleClose);
      socket.removeEventListener('error', handleError);
    });
  });

  return (
    <div class="card">
      <div class="flex items-center gap-2">
        <div class={`w-2 h-2 rounded-full ${connected() ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>Chat {connected() ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div class="mt-4 space-y-2">
        <For each={messages()}>
          {(msg) => (
            <div class="text-sm">
              <span class="font-bold">{msg.username}:</span> {msg.message}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
```

### Event Structure

All events follow this structure:

```typescript
interface Event {
  source_plugin: string;  // Plugin that emitted the event (e.g., "twitch")
  event_type: string;     // Event identifier (e.g., "twitch:chat_message")
  timestamp: number;      // Unix timestamp (seconds)
  payload: any;          // Event data (JSON)
}
```

### WebSocket Connection Details

- **Port**: 3002 (default, configurable via `WS_PORT` environment variable)
- **URL**: `ws://127.0.0.1:3002`
- **Protocol**: WebSocket with JSON messages
- **Events**: All plugin events are broadcast to connected clients

### Event Naming Conventions

Use namespaced event names to avoid collisions:

- ✅ `twitch:chat_message`
- ✅ `auction:bid_placed`
- ✅ `spotify:track_changed`
- ❌ `message` (too generic)
- ❌ `update` (too vague)

## API Reference

### Frontend Plugin API

#### Plugin Registration

- `createPlugin(config)` - Create a new plugin

#### API Methods

- `api.viewport(id, config)` - Register a viewport tab
- `api.menu(id, config)` - Register a menu item
- `api.widget(id, config)` - Register a dashboard widget
- `api.open(viewportId, options)` - Open a viewport
- `api.showProps(visible)` - Show/hide properties panel
- `api.showMenu(visible)` - Show/hide menu
- `api.showFooter(visible)` - Show/hide footer
- `api.showTabs(visible)` - Show/hide tabs

### Backend API (Rust)

#### Core Module (`api::core::*`)

The core module imports everything you need for most plugins:

- **Core Types**: `Plugin`, `Context`, `Database`, `Router`
- **HTTP**: `HttpRequest`, `HttpResponse`, `StatusCode`
- **Utilities**: `time` module, `json!()` macro
- **Error Handling**: `Result`, `Error`, `anyhow!()`
- **Serialization**: `Serialize`, `Deserialize`
- **Logging**: `info!()`, `error!()`, `warn!()`, `debug!()`

#### Plugin Trait

```rust
pub trait Plugin: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn description(&self) -> &str;
    fn author(&self) -> Option<&str>;

    async fn init(&self, ctx: &Context) -> Result<()>;
    async fn start(&self, ctx: Arc<Context>) -> Result<()>;
    async fn stop(&self) -> Result<()>;
}
```

#### Context Methods

- `ctx.register_router(plugin_id, router)` - Register HTTP routes
- `ctx.migrate(migrations)` - Run database migrations
- `ctx.db()` - Access plugin database
- `ctx.emit(event_name, data)` - Emit events
- `ctx.subscribe_to(event_type)` - Subscribe to specific events
- `ctx.subscribe_all()` - Subscribe to all events
- `Context::global()` - Get global context from async handlers

#### Database Methods

```rust
// Query - returns Vec<T>
db.query::<T>(sql, params)?

// Execute - returns affected rows
db.execute(sql, params)?

// Get last inserted ID
db.last_insert_rowid()
```

#### Router Methods

- `route!(router, GET "/path" => handler)` - Register GET route
- `route!(router, POST "/path" => handler)` - Register POST route
- `route!(router, PUT "/path" => handler)` - Register PUT route
- `route!(router, DELETE "/path" => handler)` - Register DELETE route

#### Response Helpers

- `json_response(data)` - Create JSON response
- `error_response(status, message)` - Create error response

#### Time Module (`api::time`)

```rust
// Current Unix timestamp (seconds)
time::timestamp()

// Current Unix timestamp (milliseconds)
time::timestamp_millis()

// Format current time
time::format_now("%Y-%m-%d %H:%M:%S")

// Parse datetime
time::parse_rfc3339("2024-01-01T12:00:00Z")?

// From timestamp
time::from_timestamp(1704110400)
```

## Examples

### Complete Example: Notes Plugin

See `src/plugins/developer/projects/demo` for a complete fullstack example.

Check the `src/plugins/` directory for built-in examples:
- `dashboard` - Dashboard with widget grid
- `developer` - Developer IDE with project management
- `system` - System widgets (CPU, Memory, Clock, etc.)

### Complete Example: Chat Plugin

**Backend (router.rs):**
```rust
use api::core::*;

pub async fn register_routes(ctx: &Context) -> Result<()> {
    let mut router = Router::new();
    route!(router, POST "/send_message" => handle_send_message);
    ctx.register_router("chat", router).await;
    Ok(())
}

#[derive(Deserialize)]
struct SendMessageRequest {
    username: String,
    message: String,
}

async fn handle_send_message(body: String) -> HttpResponse {
    let ctx = Context::global();

    if let Ok(req) = serde_json::from_str::<SendMessageRequest>(&body) {
        // Emit event to WebSocket
        ctx.emit("chat:message", json!({
            "username": req.username,
            "message": req.message,
            "timestamp": timestamp()
        })).await;

        json_response(&json!({ "status": "sent" }))
    } else {
        error_response(400, "Invalid request")
    }
}
```

**Frontend Widget:**
```jsx
import { createSignal, createEffect, onCleanup, For } from 'solid-js';
import { ws } from '@/api/bridge';

export default function ChatWidget() {
  const [messages, setMessages] = createSignal([]);

  createEffect(() => {
    const socket = ws();

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event_type === 'chat:message') {
        setMessages(prev => [...prev, data.payload].slice(-50)); // Keep last 50
      }
    };

    socket.addEventListener('message', handleMessage);

    onCleanup(() => {
      socket.removeEventListener('message', handleMessage);
    });
  });

  return (
    <div class="h-full flex flex-col">
      <div class="flex-1 overflow-y-auto space-y-1">
        <For each={messages()}>
          {(msg) => (
            <div class="text-xs">
              <span class="font-bold text-primary">{msg.username}:</span>
              <span class="ml-1">{msg.message}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
```

## Building Plugins for Distribution

### Using the Developer IDE

1. Open the Developer IDE
2. Select your plugin from the dropdown
3. Click **"Build"** in the toolbar
4. The plugin will be compiled to `dist/plugins/your-plugin-name.zip`
5. Distribute the `.zip` file

### Manual Build

```bash
# Build Rust backend (if applicable)
cd src/plugins/developer/projects/my-plugin
cargo build --release

# Bundle frontend with rspack/webpack
npm run build:plugin

# Create zip
zip -r my-plugin.zip package.json plugin.js my-plugin.dll
```

## Security

Since WebArcade is **open-source**, developers have access to the codebase. To maintain security:

### For Plugin Developers

- ✅ **Use api wrapper**: Provides safe, sandboxed access to plugin APIs
- ✅ **Declare permissions clearly**: Document what your plugin accesses (database, network, filesystem)
- ✅ **Follow security best practices**: Validate inputs, sanitize outputs, use HTTPS for network calls
- ❌ **Avoid direct FFI**: Don't create manual `#[no_mangle]` exports to bypass the API wrapper

### For Users

- ✅ **Install trusted plugins**: Only install plugins from known developers or the official marketplace
- ✅ **Review source code**: Check the plugin's source if available
- ✅ **Check permissions**: Understand what APIs the plugin uses before installing
- ⚠️ **Understand risks**: Plugins have access to WebArcade's runtime environment

### Future Enhancements

- 🔐 **Plugin signing**: Cryptographic signatures for verified plugins
- 📋 **Permission system**: Plugins declare required permissions (database, network, filesystem)
- 🛡️ **Sandboxing**: Process isolation for untrusted plugins
- 🏪 **Plugin marketplace**: Curated, reviewed plugins with reputation scores

## Tips

- **Use unique IDs**: Plugin IDs must be unique across all plugins
- **Follow naming conventions**: Use kebab-case for IDs (e.g., `my-awesome-plugin`)
- **Test thoroughly**: Test your plugin before distributing
- **Keep it small**: Only include necessary files in the zip
- **Version properly**: Use semantic versioning (major.minor.patch)
- **Import widgets**: Always import and register widgets in index.jsx
- **Use api crate**: Stick to the safe API wrapper for backend code

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Documentation

- **Plugin Development**: See [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md) for detailed plugin development guide
- **API Documentation**: See [src-tauri/api/README.md](./src-tauri/api/README.md) for Rust API reference
- **API Design**: See [src-tauri/api/DESIGN.md](./src-tauri/api/DESIGN.md) for API architecture details

## Getting Help

- Check existing plugins in `src/plugins/` and `src/plugins/developer/projects/`
- Review the Plugin API in `src/api/plugin/`
- Review the API crate in `src-tauri/api/`
- Open an issue on GitHub for questions

## License

[Add your license information here]

---

Happy plugin development! 🚀
