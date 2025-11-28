# WebArcade

WebArcade is an **open-source platform** for building native plugins using **SolidJS** (frontend) and **Rust** (backend). Create custom features, widgets, and functionality through a powerful plugin system with hot-reload support.

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Plugin Development](#plugin-development)
5. [Frontend Development](#frontend-development)
6. [Backend Development](#backend-development)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Building & Distribution](#building--distribution)
10. [Security](#security)
11. [Contributing](#contributing)

---

## Features

- **Plugin System**: Extend functionality with dynamic plugins loaded at runtime
- **Full-Stack Development**: SolidJS frontend + Rust backend
- **Flexible Panel Layout**: Left panel, right panel, bottom panel, and toolbar - all plugin-controlled
- **Hot Reload**: Build and reload plugins instantly during development
- **HTTP Routing**: Simple route registration with automatic request handling
- **Lightweight API**: Minimal Rust crate with fast compile times (~3-5 seconds)
- **Cross-Platform**: Compiles to `.dll` (Windows), `.so` (Linux), `.dylib` (macOS)

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/renzora/webarcade.git
cd webarcade

# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Creating Your First Plugin

1. Create a new plugin directory in `%LOCALAPPDATA%/WebArcade/projects/`
2. Add required files: `index.jsx` (frontend entry), `mod.rs` and `router.rs` (backend)
3. Define routes in `Cargo.toml`
4. Build and reload your plugin to see changes instantly

---

## Architecture

### Projects vs Plugins

WebArcade distinguishes between **projects** (source code you edit) and **plugins** (compiled packages ready to run).

| Aspect | Projects | Plugins |
|--------|----------|---------|
| Location | `%LOCALAPPDATA%/WebArcade/projects/` | `%LOCALAPPDATA%/WebArcade/plugins/` |
| Contents | Source files (.rs, .jsx, .toml) | Compiled files (.dll, .js, package.json) |
| Editable | Yes (source files) | No (read-only) |
| Purpose | Development | Runtime execution |

**Flow**: Project → Build → Plugin → Load

### Dynamic Plugin System

All plugins in WebArcade are loaded dynamically at runtime:
- Stored in `%LOCALAPPDATA%/WebArcade/projects/` (source)
- Installed to `%LOCALAPPDATA%/WebArcade/plugins/` (compiled)
- Can be built, installed, unloaded, and reloaded without restarting
- Backend compiled as `.dll` (Windows), `.so` (Linux), or `.dylib` (macOS)
- Frontend bundled as `plugin.js`

### Storage Locations

```
%LOCALAPPDATA%/WebArcade/
├── projects/              # Your plugin source code
│   ├── my-plugin/
│   │   ├── Cargo.toml     # Routes and metadata
│   │   ├── mod.rs         # Plugin entry point
│   │   ├── router.rs      # HTTP handlers
│   │   ├── index.jsx      # Frontend entry (required)
│   │   └── viewport.jsx   # UI components
│   └── another-plugin/
│       └── ...
│
└── plugins/               # Compiled plugins (installed)
    ├── my-plugin/
    │   ├── package.json   # Plugin manifest with routes
    │   ├── my-plugin.dll  # Compiled Rust backend
    │   └── plugin.js      # Bundled frontend
    └── another-plugin/
        └── ...
```

### File Requirements

| File | Required | Purpose |
|------|----------|---------|
| `index.jsx` | **Yes** | Frontend entry point - identifies plugin directories |
| `mod.rs` | For backend | Rust plugin entry point |
| `router.rs` | For backend | HTTP route handlers |
| `Cargo.toml` | For backend | Routes definition and Rust metadata |
| `package.json` | Optional | NPM dependencies for frontend |
| `viewport.jsx` | Optional | Main UI component |

**Important**: Without `index.jsx`, the directory will not be recognized as a plugin project.

---

## Plugin Development

### Plugin Structure

```
my-plugin/
├── Cargo.toml      # Routes and Rust metadata
├── mod.rs          # Plugin entry point
├── router.rs       # HTTP route handlers
├── index.jsx       # Frontend entry (required)
├── viewport.jsx    # UI component
└── package.json    # NPM dependencies (optional)
```

### Cargo.toml

Define your plugin metadata and routes:

```toml
[package]
name = "my-plugin"
version = "1.0.0"
edition = "2021"

# Define HTTP routes - maps "METHOD /path" to handler function
[routes]
"GET /hello" = "handle_hello"
"GET /items" = "handle_list_items"
"GET /items/:id" = "handle_get_item"
"POST /items" = "handle_create_item"
"PUT /items/:id" = "handle_update_item"
"DELETE /items/:id" = "handle_delete_item"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
```

**Route Patterns:**
- `:param` - Named parameter (e.g., `/items/:id` captures `id`)
- `*` - Wildcard (captures rest of path)

### mod.rs

```rust
pub mod router;

use api::{Plugin, PluginMetadata};

pub struct MyPlugin;

impl Plugin for MyPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "my-plugin".into(),
            name: "My Plugin".into(),
            version: "1.0.0".into(),
            description: "Does something cool".into(),
            author: "You".into(),
            dependencies: vec![],
        }
    }
}
```

### router.rs

```rust
use api::{HttpRequest, HttpResponse, json, json_response, error_response, Serialize, Deserialize};

pub async fn handle_hello(req: HttpRequest) -> HttpResponse {
    json_response(&json!({
        "message": "Hello from my plugin!"
    }))
}

pub async fn handle_get_item(req: HttpRequest) -> HttpResponse {
    let id = req.path_params.get("id").cloned().unwrap_or_default();

    if id.is_empty() {
        return error_response(400, "Missing item ID");
    }

    json_response(&json!({
        "id": id,
        "name": "Example Item"
    }))
}
```

### index.jsx

```jsx
import { createPlugin } from '@/api/plugin';
import MyViewport from './viewport';

export default createPlugin({
    id: 'my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Does something cool',
    author: 'You',

    async onStart(api) {
        console.log('[My Plugin] Starting...');

        api.viewport('my-plugin-viewport', {
            label: 'My Plugin',
            component: MyViewport,
            description: 'Main plugin interface'
        });
    },

    async onStop() {
        console.log('[My Plugin] Stopping...');
    }
});
```

---

## Frontend Development

### Frontend Plugin API

```jsx
import { createPlugin } from '@/api/plugin';

export default createPlugin({
    id: 'my-plugin',
    name: 'My Plugin',

    async onStart(api) {
        // Register a viewport (main view)
        api.viewport('my-viewport', {
            label: 'My Plugin',
            component: MyViewport,
            icon: IconPlugin,
            description: 'Main interface'
        });

        // Add menu item
        api.menu('my-menu', {
            label: 'My Plugin',
            icon: IconPlugin,
            onClick: () => api.open('my-viewport')
        });

        // Register left panel content
        api.leftPanel({
            component: MyLeftPanel
        });

        // Register right panel content
        api.rightPanel({
            component: MyRightPanel
        });

        // Register bottom panel tab
        api.bottomTab('my-console', {
            title: 'Console',
            component: MyConsole,
            icon: IconTerminal
        });

        // Register toolbar items
        api.toolbar('my-tool', {
            icon: IconTool,
            label: 'My Tool',
            tooltip: 'Do something',
            onClick: () => console.log('Clicked!'),
            group: 'tools',
            order: 10
        });

        // Control UI visibility
        api.showProps(true);        // Right panel
        api.showLeftPanel(true);    // Left panel
        api.showMenu(true);         // Top menu buttons
        api.showFooter(true);       // Footer bar
        api.showTabs(true);         // Viewport tabs
        api.showBottomPanel(true);  // Bottom panel
        api.showToolbar(true);      // Toolbar
    }
});
```

### Calling Backend from Frontend

```jsx
import { api } from '@/api/bridge';

// GET request
async function fetchData() {
    const response = await api('my-plugin/hello');
    return await response.json();
}

// POST request with JSON body
async function createItem(name) {
    const response = await api('my-plugin/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
    return await response.json();
}

// GET with query params
async function search(query) {
    const response = await api(`my-plugin/search?q=${encodeURIComponent(query)}`);
    return await response.json();
}

// PUT request
async function updateItem(id, data) {
    const response = await api(`my-plugin/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

// DELETE request
async function deleteItem(id) {
    const response = await api(`my-plugin/items/${id}`, {
        method: 'DELETE'
    });
    return await response.json();
}
```

### Using Third-Party Libraries

Add dependencies to `package.json`:

```json
{
    "name": "my-plugin",
    "dependencies": {
        "canvas-confetti": "^1.9.2",
        "date-fns": "^3.0.0"
    }
}
```

Use in your code:

```jsx
import confetti from 'canvas-confetti';
import { format } from 'date-fns';

export default function MyViewport() {
    return (
        <div>
            <p>Today is {format(new Date(), 'MMMM do, yyyy')}</p>
            <button onClick={() => confetti()}>Celebrate!</button>
        </div>
    );
}
```

---

## Backend Development

### Available API Exports

Everything is available directly from `api::`:

```rust
// Types
use api::HttpRequest;      // Incoming HTTP request
use api::HttpResponse;     // Outgoing HTTP response
use api::Request;          // Alias for HttpRequest
use api::Response;         // Alias for HttpResponse
use api::Plugin;           // Plugin trait
use api::PluginMetadata;   // Plugin metadata struct
use api::MultipartField;   // Parsed multipart form field
use api::Bytes;            // bytes::Bytes re-export
use api::Value;            // serde_json::Value re-export

// Functions
use api::json_response;    // Create JSON 200 response
use api::error_response;   // Create error response with status code

// Macros
use api::json;             // serde_json::json! macro

// Traits
use api::Serialize;        // serde::Serialize
use api::Deserialize;      // serde::Deserialize

// Modules
use api::serde_json;       // Full serde_json crate
use api::base64;           // Full base64 crate
use api::tokio;            // Full tokio crate
use api::log;              // Full log crate
```

### HttpRequest

```rust
pub struct HttpRequest {
    pub method: String,                        // "GET", "POST", etc.
    pub path: String,                          // "/items/123"
    pub query: HashMap<String, String>,        // Query parameters
    pub path_params: HashMap<String, String>,  // Route parameters (:id)
}
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `query("name")` | `Option<String>` | Get query parameter |
| `query_param("name")` | `Option<&String>` | Get query parameter (reference) |
| `path_param("name")` | `Option<&String>` | Get path parameter |
| `header("name")` | `Option<&String>` | Get header (case-insensitive) |
| `headers()` | `&HashMap<String, String>` | Get all headers |
| `body_bytes()` | `&[u8]` | Get raw body bytes |
| `body_len()` | `usize` | Get body length |
| `body_string()` | `Result<String, String>` | Get body as UTF-8 string |
| `body_json<T>()` | `Result<T, String>` | Parse body as JSON |
| `is_json()` | `bool` | Check if Content-Type is JSON |
| `is_multipart()` | `bool` | Check if Content-Type is multipart |
| `is_content_type("type")` | `bool` | Check Content-Type |
| `parse_multipart()` | `Result<Vec<MultipartField>, String>` | Parse multipart body |

### HttpResponse

**Quick responses:**

```rust
// JSON success
json_response(&json!({"status": "ok"}))

// JSON with struct
#[derive(Serialize)]
struct User { id: u32, name: String }
json_response(&User { id: 1, name: "Alice".into() })

// Error responses
error_response(400, "Bad request")
error_response(404, "Not found")
error_response(500, "Server error")
```

**Custom responses:**

```rust
use api::Bytes;

// Custom status + headers
http::Response::builder()
    .status(201)
    .header("Content-Type", "application/json")
    .header("Access-Control-Allow-Origin", "*")
    .body(Bytes::from(r#"{"created": true}"#))
    .unwrap()

// Binary (image, file)
http::Response::builder()
    .status(200)
    .header("Content-Type", "image/png")
    .header("Access-Control-Allow-Origin", "*")
    .body(Bytes::from(image_bytes))
    .unwrap()
```

### Handler Requirements

All handlers **must** follow this exact pattern:

```rust
pub async fn handler_name(req: HttpRequest) -> HttpResponse {
    // ...
}
```

- `pub` - Must be public
- `async fn` - Must be async
- Parameter: `req: HttpRequest` (name should be `req`, `request`, or contain `http`)
- Return: `HttpResponse`

---

## API Reference

### Request Handling Examples

```rust
use api::{HttpRequest, HttpResponse, json, json_response, error_response, Deserialize};

// Query parameters: /search?q=hello&limit=10
pub async fn handle_search(req: HttpRequest) -> HttpResponse {
    let query = req.query("q").unwrap_or_default();
    let limit: usize = req.query("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);

    json_response(&json!({
        "query": query,
        "limit": limit,
        "results": []
    }))
}

// Path parameters: /items/:id
pub async fn handle_get_item(req: HttpRequest) -> HttpResponse {
    let id = req.path_params.get("id").cloned().unwrap_or_default();

    if id.is_empty() {
        return error_response(400, "Missing ID");
    }

    json_response(&json!({"id": id}))
}

// JSON body parsing
pub async fn handle_create(req: HttpRequest) -> HttpResponse {
    #[derive(Deserialize)]
    struct CreateRequest { name: String, email: String }

    let data: CreateRequest = match req.body_json() {
        Ok(d) => d,
        Err(e) => return error_response(400, &format!("Invalid JSON: {}", e)),
    };

    if data.name.is_empty() {
        return error_response(400, "Name is required");
    }

    json_response(&json!({"created": true, "name": data.name}))
}

// File uploads
pub async fn handle_upload(req: HttpRequest) -> HttpResponse {
    if !req.is_multipart() {
        return error_response(400, "Expected multipart form data");
    }

    match req.parse_multipart() {
        Ok(fields) => {
            for field in fields {
                if field.is_file() {
                    let filename = field.filename.unwrap_or_default();
                    let size = field.data.len();
                    // Save field.data to disk...
                }
            }
            json_response(&json!({"uploaded": true}))
        }
        Err(e) => error_response(400, &e),
    }
}
```

### Common Patterns

**CRUD Operations:**

```rust
use api::{HttpRequest, HttpResponse, json, json_response, error_response, Serialize, Deserialize};
use std::sync::Mutex;
use std::collections::HashMap;

static ITEMS: Mutex<HashMap<u32, Item>> = Mutex::new(HashMap::new());
static NEXT_ID: Mutex<u32> = Mutex::new(1);

#[derive(Clone, Serialize, Deserialize)]
struct Item { id: u32, name: String }

// LIST: GET /items
pub async fn handle_list(req: HttpRequest) -> HttpResponse {
    let items = ITEMS.lock().unwrap();
    let list: Vec<&Item> = items.values().collect();
    json_response(&list)
}

// GET: GET /items/:id
pub async fn handle_get(req: HttpRequest) -> HttpResponse {
    let id: u32 = req.path_params.get("id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let items = ITEMS.lock().unwrap();
    match items.get(&id) {
        Some(item) => json_response(item),
        None => error_response(404, "Item not found"),
    }
}

// CREATE: POST /items
pub async fn handle_create(req: HttpRequest) -> HttpResponse {
    #[derive(Deserialize)]
    struct Input { name: String }

    let input: Input = match req.body_json() {
        Ok(d) => d,
        Err(e) => return error_response(400, &e),
    };

    let mut next_id = NEXT_ID.lock().unwrap();
    let id = *next_id;
    *next_id += 1;

    let item = Item { id, name: input.name };
    ITEMS.lock().unwrap().insert(id, item.clone());

    json_response(&item)
}

// DELETE: DELETE /items/:id
pub async fn handle_delete(req: HttpRequest) -> HttpResponse {
    let id: u32 = req.path_params.get("id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    match ITEMS.lock().unwrap().remove(&id) {
        Some(_) => json_response(&json!({"deleted": true})),
        None => error_response(404, "Item not found"),
    }
}
```

**Pagination:**

```rust
pub async fn handle_list(req: HttpRequest) -> HttpResponse {
    let page: usize = req.query("page")
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);

    let per_page: usize = req.query("per_page")
        .and_then(|s| s.parse().ok())
        .unwrap_or(20)
        .min(100);

    let total = 100;

    json_response(&json!({
        "data": [],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) / per_page
        }
    }))
}
```

**Logging:**

```rust
use api::log;

pub async fn handle_debug(req: HttpRequest) -> HttpResponse {
    log::info!("Request: {} {}", req.method, req.path);
    log::debug!("Query: {:?}", req.query);
    log::warn!("Warning message");
    log::error!("Error message");

    json_response(&json!({"logged": true}))
}
```

---

## Examples

### Complete Plugin: Notes API

**Cargo.toml**
```toml
[package]
name = "notes"
version = "1.0.0"
edition = "2021"

[routes]
"GET /notes" = "list_notes"
"GET /notes/:id" = "get_note"
"POST /notes" = "create_note"
"DELETE /notes/:id" = "delete_note"

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
strip = true
```

**mod.rs**
```rust
pub mod router;

use api::{Plugin, PluginMetadata};

pub struct NotesPlugin;

impl Plugin for NotesPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "notes".into(),
            name: "Notes".into(),
            version: "1.0.0".into(),
            description: "Simple notes API".into(),
            author: "WebArcade".into(),
            dependencies: vec![],
        }
    }
}
```

**router.rs**
```rust
use api::{HttpRequest, HttpResponse, json, json_response, error_response, Serialize, Deserialize};
use std::sync::Mutex;
use std::collections::HashMap;

static NOTES: Mutex<HashMap<u32, Note>> = Mutex::new(HashMap::new());
static NEXT_ID: Mutex<u32> = Mutex::new(1);

#[derive(Clone, Serialize, Deserialize)]
struct Note { id: u32, title: String, content: String }

pub async fn list_notes(req: HttpRequest) -> HttpResponse {
    let notes = NOTES.lock().unwrap();
    let list: Vec<&Note> = notes.values().collect();
    json_response(&list)
}

pub async fn get_note(req: HttpRequest) -> HttpResponse {
    let id: u32 = req.path_params.get("id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let notes = NOTES.lock().unwrap();
    match notes.get(&id) {
        Some(note) => json_response(note),
        None => error_response(404, "Note not found"),
    }
}

pub async fn create_note(req: HttpRequest) -> HttpResponse {
    #[derive(Deserialize)]
    struct Input { title: String, content: String }

    let input: Input = match req.body_json() {
        Ok(d) => d,
        Err(e) => return error_response(400, &e),
    };

    let mut next_id = NEXT_ID.lock().unwrap();
    let id = *next_id;
    *next_id += 1;

    let note = Note { id, title: input.title, content: input.content };
    NOTES.lock().unwrap().insert(id, note.clone());

    json_response(&note)
}

pub async fn delete_note(req: HttpRequest) -> HttpResponse {
    let id: u32 = req.path_params.get("id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    match NOTES.lock().unwrap().remove(&id) {
        Some(_) => json_response(&json!({"deleted": true})),
        None => error_response(404, "Note not found"),
    }
}
```

**index.jsx**
```jsx
import { createPlugin } from '@/api/plugin';

export default createPlugin({
    id: 'notes',
    name: 'Notes',
    version: '1.0.0',

    async onStart(api) {
        console.log('Notes plugin started!');
    }
});
```

---

## Building & Distribution

### Build Process

When building a plugin:

1. **Backend Compilation** (if `mod.rs` exists):
   - Creates build directory
   - Copies `.rs` files
   - **Auto-generates `lib.rs`** with FFI wrappers for each route handler
   - Injects `api` crate dependency
   - Runs `cargo build --release`

2. **Frontend Bundling** (if `index.jsx` exists):
   - Runs `bun install` / `npm install` for dependencies
   - Bundles with RSpack into `plugin.js`

3. **Package Creation**:
   - Creates `dist/plugins/{plugin-id}/` with compiled files
   - Generates `package.json` manifest
   - Creates distributable `.zip` file

4. **Installation**:
   - Unloads old plugin DLL
   - Copies to `%LOCALAPPDATA%/WebArcade/plugins/`
   - Loads new DLL and registers routes
   - Hot-reloads frontend

### Generated lib.rs

The builder auto-generates FFI wrapper code for each handler:

```rust
// Auto-generated - DO NOT EDIT
#[no_mangle]
pub extern "C" fn handle_hello(
    request_ptr: *const u8,
    request_len: usize,
    runtime_ptr: *const ()
) -> *const u8 {
    // Parses JSON request into HttpRequest
    // Bridges to your async handler
    // Serializes response back to FFI JSON
}
```

**You write clean Rust** → **Builder handles FFI complexity**

### Manual Distribution

```bash
# Your plugin zip contains:
my-plugin.zip
├── package.json      # Manifest with routes
├── my-plugin.dll     # Windows binary
├── plugin.js         # Frontend bundle
```

Users can drag & drop the `.zip` into WebArcade to install.

---

## Security

### For Plugin Developers

- ✅ Use the `api` crate for all backend functionality
- ✅ Validate all inputs
- ✅ Handle errors gracefully
- ❌ Don't try to bypass the FFI boundary manually

### For Users

- ✅ Only install plugins from trusted sources
- ✅ Review source code when available
- ⚠️ Plugins have access to the system - install responsibly

---

## Troubleshooting

### Common Errors

**"no method named `query` found"**
- Use `req.query("param")` not `req.query.get("param")`

**"the trait `Default` is not implemented"**
- Ensure handler signature is `pub async fn handler(req: HttpRequest) -> HttpResponse`
- Parameter must be named `req` and typed `HttpRequest`

**"unresolved import `api::Request`"**
- Use `api::HttpRequest` or `api::Request` (alias)

**Build succeeds but handler returns error**
- Check routes in `Cargo.toml` match handler function names exactly
- Ensure handlers are `pub`

**Plugin not detected**
- Create `index.jsx` file (required for plugin detection)

**DLL won't reload**
- Restart WebArcade if file is locked

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Quick Reference

### Frontend API Methods

| Method | Description |
|--------|-------------|
| `api.viewport(id, config)` | Register a viewport type |
| `api.menu(id, config)` | Add a top menu item |
| `api.leftPanel(config)` | Register left panel component |
| `api.rightPanel(config)` | Register right panel component |
| `api.bottomTab(id, config)` | Add a bottom panel tab |
| `api.toolbar(id, config)` | Add a toolbar button |
| `api.toolbarGroup(id, config)` | Create a toolbar group |
| `api.footer(id, config)` | Add a footer button |
| `api.topMenuButton(id, config)` | Add a top menu button |
| `api.open(typeId)` | Open/create a viewport tab |

### UI Visibility Controls

| Method | Description |
|--------|-------------|
| `api.showProps(bool)` | Show/hide right panel |
| `api.showLeftPanel(bool)` | Show/hide left panel |
| `api.showMenu(bool)` | Show/hide top menu buttons |
| `api.showFooter(bool)` | Show/hide footer |
| `api.showTabs(bool)` | Show/hide viewport tabs |
| `api.showBottomPanel(bool)` | Show/hide bottom panel |
| `api.showToolbar(bool)` | Show/hide toolbar |

### Rust Imports Cheat Sheet

```rust
use api::{
    HttpRequest,              // Request type
    HttpResponse,             // Response type
    json,                     // json!() macro
    json_response,            // JSON 200 response
    error_response,           // Error response
    Serialize, Deserialize,   // Serde traits
    Bytes,                    // For custom responses
};
```

### Handler Template

```rust
pub async fn handle_something(req: HttpRequest) -> HttpResponse {
    // 1. Extract parameters
    let id = req.path_params.get("id").cloned().unwrap_or_default();
    let filter = req.query("filter").unwrap_or_default();

    // 2. Validate
    if id.is_empty() {
        return error_response(400, "Missing ID");
    }

    // 3. Process
    // ... your logic ...

    // 4. Return response
    json_response(&json!({
        "success": true,
        "data": {}
    }))
}
```

### Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## License

[MIT License]

---

Happy plugin development! 🚀
