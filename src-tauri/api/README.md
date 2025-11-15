# WebArcade Plugin API

The official Rust API for creating WebArcade plugins.

## Quick Start

The API is automatically available to all plugins - no need to add it to `Cargo.toml`!

Create a basic plugin:

```rust
use api::core::*;

pub struct MyPlugin;

impl Plugin for MyPlugin {
    plugin_metadata!("my-plugin", "My Plugin", "1.0.0", "A cool plugin");

    async fn init(&self, ctx: &Context) -> Result<()> {
        // Your initialization code
        Ok(())
    }
}
```

## Module Overview

### `use api::core::*`

The core module imports everything you need for most plugins:

- **Core Types**: `Plugin`, `Context`, `Database`, `Router`
- **HTTP**: `HttpRequest`, `HttpResponse`, `StatusCode`
- **Utilities**: `time` module, `json!()` macro
- **Error Handling**: `Result`, `Error`, `anyhow!()`
- **Serialization**: `Serialize`, `Deserialize`
- **Logging**: `info!()`, `error!()`, `warn!()`, `debug!()`

### Database (`api::database`)

SQLite database operations with JSON parameter binding:

```rust
let db = ctx.db();

// Query - returns Vec<T>
let notes: Vec<Note> = db.query(
    "SELECT * FROM notes WHERE id = ?",
    &json!([note_id])
)?;

// Execute - returns affected rows
db.execute(
    "INSERT INTO notes (title, content) VALUES (?1, ?2)",
    &json!(["Title", "Content"])
)?;

// Get last inserted ID
let id = db.last_insert_rowid();
```

**Key Points:**
- Parameters are JSON arrays: `&json!([val1, val2])`
- Use `?` or `?1, ?2` for positional placeholders
- Empty parameters: `&json!([])`

### Time (`api::time`)

Time utilities wrapping chrono:

```rust
// Current Unix timestamp (seconds)
let now = time::timestamp();

// Current Unix timestamp (milliseconds)
let now_ms = time::timestamp_millis();

// Format current time
let formatted = time::format_now("%Y-%m-%d %H:%M:%S");

// Parse datetime
let dt = time::parse_rfc3339("2024-01-01T12:00:00Z")?;

// From timestamp
let dt = time::from_timestamp(1704110400);
```

### HTTP (`api::http`)

HTTP types and helpers:

```rust
async fn my_handler(req: HttpRequest) -> HttpResponse {
    // TODO: Request body parsing (coming soon)
    // let body: MyStruct = req.json()?;

    // Return JSON
    json_response(&json!({"status": "ok"}))

    // Return error
    error_response(StatusCode::NOT_FOUND, "Not found")
}
```

### Context (`api::context`)

Access to WebArcade services:

```rust
async fn init(&self, ctx: &Context) -> Result<()> {
    // Database access
    let db = ctx.db();

    // Run migrations
    ctx.migrate(&[
        "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY)"
    ])?;

    // Register routes
    let mut router = Router::new();
    route!(router, GET "/notes" => get_notes);
    ctx.register_router("notes", router).await;

    // Emit events
    ctx.emit("notes:ready", json!({})).await;

    Ok(())
}

// Access context from handlers
let ctx = Context::global();
```

## Complete Example: Notes Plugin

```rust
use api::core::*;

#[derive(Serialize, Deserialize)]
struct Note {
    id: i64,
    title: String,
    content: String,
    created_at: i64,
}

#[derive(Deserialize)]
struct CreateNoteRequest {
    title: String,
    content: String,
}

pub struct NotesPlugin;

impl Plugin for NotesPlugin {
    plugin_metadata!("notes", "Notes", "1.0.0", "Simple note-taking");

    async fn init(&self, ctx: &Context) -> Result<()> {
        // Create database table
        ctx.migrate(&[
            r"CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT,
                created_at INTEGER NOT NULL
            )"
        ])?;

        // Register routes
        let mut router = Router::new();
        route!(router, GET "/notes" => get_notes);
        route!(router, POST "/notes" => create_note);
        route!(router, DELETE "/notes/:id", path => delete_note);
        ctx.register_router("notes", router).await;

        info!("Notes plugin initialized");
        Ok(())
    }
}

async fn get_notes(_req: HttpRequest) -> HttpResponse {
    let db = Context::global().db();

    match db.query::<Note>("SELECT * FROM notes ORDER BY created_at DESC", &json!([])) {
        Ok(notes) => json_response(&notes),
        Err(e) => {
            error!("Failed to fetch notes: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch notes")
        }
    }
}

async fn create_note(req: HttpRequest) -> HttpResponse {
    // TODO: Parse request body when Request API is enhanced
    // For now, this is a placeholder showing the intended API

    let db = Context::global().db();
    let now = time::timestamp();

    match db.execute(
        "INSERT INTO notes (title, content, created_at) VALUES (?1, ?2, ?3)",
        &json!(["Sample Title", "Sample Content", now])
    ) {
        Ok(_) => {
            let id = db.last_insert_rowid();
            json_response(&json!({"id": id, "created_at": now}))
        }
        Err(e) => {
            error!("Failed to create note: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create note")
        }
    }
}

async fn delete_note(_req: HttpRequest, path: String) -> HttpResponse {
    let id_str = path.trim_start_matches("/notes/");
    let note_id: i64 = match id_str.parse() {
        Ok(id) => id,
        Err(_) => return error_response(StatusCode::BAD_REQUEST, "Invalid ID"),
    };

    let db = Context::global().db();

    match db.execute("DELETE FROM notes WHERE id = ?", &json!([note_id])) {
        Ok(affected) if affected > 0 => json_response(&json!({"success": true})),
        Ok(_) => error_response(StatusCode::NOT_FOUND, "Note not found"),
        Err(e) => {
            error!("Failed to delete note: {}", e);
            error_response(StatusCode::INTERNAL_SERVER_ERROR, "Failed to delete note")
        }
    }
}
```

## Roadmap

Future enhancements:

- [ ] **Enhanced HTTP Request API** - Body parsing (`req.json()`, `req.text()`), headers, query params
- [ ] **WebSocket Support** - Real-time bidirectional communication
- [ ] **Storage API** - Key-value storage for plugin settings
- [ ] **File System API** - Sandboxed file access
- [ ] **Enhanced Events** - Better inter-plugin communication
- [ ] **Crypto Utilities** - Hashing, encryption helpers

## Documentation

Run `cargo doc --open` to view the full API documentation with all examples and details.

## Support

For issues and questions, visit the WebArcade repository.
