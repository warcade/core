# WebArcade API Design

## Overview

The WebArcade API provides a clear, organized interface for plugin development with explicit module access.

## Module Structure

### 1. `webarcade_api::database`
Database access with SQLite backend.

**Usage:**
```rust
use webarcade_api::database::Database;

// Get database from context
let db = ctx.db();

// Query with positional parameters (JSON array)
let notes: Vec<Note> = db.query(
    "SELECT * FROM notes WHERE id = ?",
    &json!([note_id])
)?;

// Execute with named parameters (JSON object)
db.execute(
    "INSERT INTO notes (title, content) VALUES (?1, ?2)",
    &json!([title, content])
)?;

// Get last inserted ID
let id = db.last_insert_rowid();
```

**Methods:**
- `query<T>(sql, params)` - Execute SELECT query, returns Vec<T>
- `execute(sql, params)` - Execute INSERT/UPDATE/DELETE, returns affected rows
- `last_insert_rowid()` - Get ID of last inserted row
- `transaction()` - Start a transaction (future)

---

### 2. `webarcade_api::http`
HTTP request/response handling.

**Usage:**
```rust
use webarcade_api::http::{Request, Response, StatusCode};

async fn handler(req: Request) -> Response {
    // Parse JSON body
    let body: MyStruct = req.json()?;

    // Access headers
    let auth = req.header("Authorization");

    // Access query parameters
    let page = req.query("page");

    // Get path parameters
    let id = req.param("id");

    // Get database
    let db = req.db();

    // Return JSON response
    Response::json(&data)

    // Return error
    Response::error(StatusCode::NOT_FOUND, "Not found")
}
```

**Request Methods:**
- `json<T>()` - Parse body as JSON
- `text()` - Get body as text
- `bytes()` - Get body as bytes
- `header(name)` - Get header value
- `query(name)` - Get query parameter
- `param(name)` - Get path parameter
- `db()` - Get database connection
- `ctx()` - Get context

**Response Methods:**
- `Response::json(data)` - Create JSON response
- `Response::text(text)` - Create text response
- `Response::error(status, message)` - Create error response
- `Response::empty()` - Create empty 204 response

---

### 3. `webarcade_api::websocket`
WebSocket communication for real-time features.

**Usage:**
```rust
use webarcade_api::websocket::{WebSocket, Message};

// In plugin init
async fn init(&self, ctx: &Context) -> Result<()> {
    // Listen for WebSocket connections
    ctx.websocket("/notes/live", handle_websocket).await;
}

async fn handle_websocket(ws: WebSocket) -> Result<()> {
    // Send message
    ws.send(Message::text("Hello")).await?;

    // Receive message
    while let Some(msg) = ws.recv().await {
        match msg {
            Message::Text(text) => {
                // Handle text message
            }
            Message::Binary(data) => {
                // Handle binary message
            }
            Message::Close => break,
        }
    }

    Ok(())
}

// Broadcast to all connected clients
ctx.broadcast("notes:updated", &json!({ "id": 123 })).await;
```

---

### 4. `webarcade_api::events`
Inter-plugin event communication.

**Usage:**
```rust
use webarcade_api::events::Events;

// Emit event
ctx.emit("notes:created", json!({ "id": 123 })).await;

// Listen for events
ctx.on("settings:changed", |data| {
    log::info!("Settings changed: {:?}", data);
}).await;

// One-time listener
ctx.once("app:ready", |data| {
    log::info!("App is ready!");
}).await;
```

---

### 5. `webarcade_api::storage`
Key-value storage (plugin-specific or global).

**Usage:**
```rust
use webarcade_api::storage::Storage;

// Plugin-scoped storage
let storage = ctx.storage();
storage.set("theme", "dark").await?;
let theme = storage.get::<String>("theme").await?;

// Global storage (shared across plugins)
let global = ctx.global_storage();
```

---

### 6. `webarcade_api::fs`
File system access (sandboxed to plugin directory).

**Usage:**
```rust
use webarcade_api::fs::Fs;

let fs = ctx.fs();

// Read file
let content = fs.read_text("config.json").await?;

// Write file
fs.write_text("output.txt", "Hello").await?;

// Check if exists
if fs.exists("data.db").await? {
    // ...
}
```

---

### 7. `webarcade_api::crypto`
Cryptographic utilities.

**Usage:**
```rust
use webarcade_api::crypto;

// Hash password
let hash = crypto::hash_password("secret")?;
let valid = crypto::verify_password("secret", &hash)?;

// Generate random bytes
let bytes = crypto::random_bytes(32);

// UUID
let id = crypto::uuid();
```

---

### 8. `webarcade_api::time`
Time utilities (wrapper around chrono).

**Usage:**
```rust
use webarcade_api::time;

// Current timestamp
let now = time::now();
let timestamp = time::timestamp();

// Parse
let dt = time::parse("2024-01-01T00:00:00Z")?;

// Format
let formatted = time::format(&dt, "%Y-%m-%d");
```

---

## Prelude

The prelude includes the most commonly used items:

```rust
use webarcade_api::prelude::*;

// Provides:
// - Plugin, Context
// - Request, Response, StatusCode
// - Database
// - json!(), Result, Error
// - Serialize, Deserialize
// - log macros (info!, error!, etc.)
```

---

## Example Plugin

```rust
use webarcade_api::prelude::*;

pub struct NotesPlugin;

impl Plugin for NotesPlugin {
    plugin_metadata!("notes", "Notes", "1.0.0", "Note-taking plugin");

    async fn init(&self, ctx: &Context) -> Result<()> {
        // Run migrations
        ctx.migrate(&[
            "CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                created_at INTEGER
            )"
        ])?;

        // Register routes
        let mut router = Router::new();
        route!(router, GET "/notes" => get_notes);
        route!(router, POST "/notes" => create_note);
        ctx.register_router("notes", router).await;

        // Listen for events
        ctx.on("app:ready", |_| {
            log::info!("Notes plugin ready!");
        }).await;

        Ok(())
    }
}

async fn get_notes(req: Request) -> Response {
    let db = req.db();

    match db.query("SELECT * FROM notes", &json!([])) {
        Ok(notes) => Response::json(&notes),
        Err(e) => Response::error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
    }
}

async fn create_note(req: Request) -> Response {
    let body: CreateNoteRequest = match req.json() {
        Ok(b) => b,
        Err(e) => return Response::error(StatusCode::BAD_REQUEST, "Invalid JSON")
    };

    let db = req.db();
    let now = time::timestamp();

    match db.execute(
        "INSERT INTO notes (title, content, created_at) VALUES (?1, ?2, ?3)",
        &json!([body.title, body.content, now])
    ) {
        Ok(_) => {
            let id = db.last_insert_rowid();
            Response::json(&json!({ "id": id }))
        }
        Err(e) => Response::error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
    }
}
```

---

## Migration Path

1. Keep existing API working (backwards compatible)
2. Add new explicit module exports
3. Update prelude to include new APIs
4. Update documentation
5. Migrate existing plugins gradually
