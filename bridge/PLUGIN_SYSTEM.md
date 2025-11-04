# WebArcade Bridge - Plugin System

## Overview

The WebArcade Bridge now uses a **truly modular plugin architecture** where plugins are completely independent and self-contained. The core system knows nothing about specific plugins - it only provides infrastructure for:

- Generic event broadcasting
- Service registration and inter-plugin communication
- Database migrations per plugin
- Plugin lifecycle management

## Architecture

```
bridge/src/
├── core/                    # Core plugin framework (generic)
│   ├── events.rs           # Generic event bus
│   ├── services.rs         # Service registry for inter-plugin calls
│   ├── plugin.rs           # Plugin trait definition
│   ├── plugin_context.rs   # Plugin API
│   ├── plugin_manager.rs   # Plugin loader and lifecycle
│   └── database.rs         # Database utilities
│
└── plugins/                 # All plugins (fully independent)
    ├── auction/            # Example: Auction plugin
    │   ├── mod.rs          # Plugin implementation
    │   ├── events.rs       # Plugin-specific events
    │   └── database.rs     # Plugin-specific DB queries
    └── [more plugins...]
```

## Core Principles

### 1. **Zero Coupling**
- Core has NO knowledge of plugins
- No hardcoded event types in core
- No if/match statements for specific plugins

### 2. **Generic Communication**
- Events are JSON payloads
- Plugins deserialize events themselves
- Service calls use JSON input/output

### 3. **Plugin Independence**
- Each plugin defines its own events
- Each plugin manages its own database schema
- Plugins communicate via generic interfaces

## Plugin Lifecycle

```rust
Plugin Lifecycle:
1. register()  -> Plugin added to manager
2. init()      -> Run migrations, register services
3. start()     -> Subscribe to events, start background tasks
4. stop()      -> Cleanup on shutdown
```

## Creating a Plugin

### Step 1: Define Plugin Structure

```rust
// plugins/myplugin/mod.rs
use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

mod events;
mod database;

pub struct MyPlugin;

#[async_trait]
impl Plugin for MyPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "myplugin".to_string(),
            name: "My Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: "What my plugin does".to_string(),
            author: "Your Name".to_string(),
            dependencies: vec![], // Other plugin IDs needed
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        // 1. Run database migrations
        ctx.migrate(&[
            r#"CREATE TABLE IF NOT EXISTS my_table (...)"#,
        ])?;

        // 2. Register services
        ctx.provide_service("my_method", |input| async move {
            // Service implementation
            Ok(serde_json::json!({"result": "success"}))
        }).await;

        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        // 3. Subscribe to events
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("other_plugin.event").await;
            while let Ok(event) = events.recv().await {
                // Handle event
            }
        });

        // 4. Start background tasks
        tokio::spawn(async move {
            // Background work
        });

        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        // Cleanup
        Ok(())
    }
}
```

### Step 2: Define Plugin Events

```rust
// plugins/myplugin/events.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MyEvent {
    pub data: String,
    pub timestamp: i64,
}
```

### Step 3: Define Database Operations

```rust
// plugins/myplugin/database.rs
use rusqlite::{Connection, Result};

pub fn create_item(conn: &Connection, name: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO my_table (name) VALUES (?1)",
        rusqlite::params![name],
    )?;
    Ok(conn.last_insert_rowid())
}
```

### Step 4: Register Plugin

```rust
// plugins/mod.rs
pub mod myplugin;

pub fn register_all_plugins(manager: &mut PluginManager) {
    manager.register(myplugin::MyPlugin);
    // ... other plugins
}
```

## Plugin API (PluginContext)

### Events

```rust
// Emit an event
ctx.emit("myplugin.something_happened", &MyEvent {
    data: "hello".to_string(),
    timestamp: 12345,
});

// Subscribe to specific event type
let mut events = ctx.subscribe_to("other_plugin.event").await;
while let Ok(event) = events.recv().await {
    // Deserialize payload
    let payload: OtherPluginEvent = serde_json::from_value(event.payload)?;
}

// Subscribe to ALL events
let mut all_events = ctx.subscribe_all();
```

### Services

```rust
// Provide a service (in init)
ctx.provide_service("create_item", |input| async move {
    let name: String = serde_json::from_value(input["name"].clone())?;
    // Do work
    Ok(serde_json::json!({"id": 123}))
}).await;

// Call another plugin's service (in start)
let result = ctx.call_service("other_plugin", "method_name", serde_json::json!({
    "param": "value"
})).await?;

// Check if service exists
if ctx.has_service("other_plugin", "method_name").await {
    // Call it
}
```

### Database

```rust
// Run migrations (in init)
ctx.migrate(&[
    r#"CREATE TABLE IF NOT EXISTS my_table (...)"#,
    r#"ALTER TABLE my_table ADD COLUMN new_field TEXT"#,
])?;

// Get database connection
let conn = ctx.db()?;
database::create_item(&conn, "test")?;

// Get plugin ID
let id = ctx.plugin_id();

// Get plugin config
let config = ctx.config();
let max_items = config["max_items"].as_i64().unwrap_or(100);
```

## Plugin Configuration

Plugins are configured in `bridge/plugins.json`:

```json
{
  "plugins": [
    {
      "id": "myplugin",
      "enabled": true,
      "config": {
        "max_items": 100,
        "feature_enabled": true
      }
    }
  ]
}
```

Access config in plugin:

```rust
let config = ctx.config();
let max_items = config["max_items"].as_i64().unwrap_or(100);
```

## Inter-Plugin Communication

### Option 1: Events (Loose Coupling)

```rust
// Plugin A emits event
ctx.emit("auction.ended", &AuctionEndedEvent {
    auction_id: 123,
    winner: Some("alice".to_string()),
});

// Plugin B subscribes
let mut events = ctx.subscribe_to("auction.ended").await;
while let Ok(event) = events.recv().await {
    let auction_event: AuctionEndedEvent = serde_json::from_value(event.payload)?;
    // React to auction ending
}
```

### Option 2: Services (Direct Calls)

```rust
// Plugin A provides service
ctx.provide_service("get_balance", |input| async move {
    let user: String = serde_json::from_value(input["user"].clone())?;
    let balance = get_user_balance(&user).await?;
    Ok(serde_json::json!({"balance": balance}))
}).await;

// Plugin B calls service
let result = ctx.call_service("currency", "get_balance", serde_json::json!({
    "user": "alice"
})).await?;
let balance = result["balance"].as_i64().unwrap();
```

## Example: Auction Plugin

See `bridge/src/plugins/auction/` for a complete working example.

Key features demonstrated:
- Database migrations
- Event definitions
- Service registration
- Event subscription
- Background tasks

## Migration from Monolithic Code

To migrate existing code to plugins:

1. **Create plugin directory**: `bridge/src/plugins/myplugin/`
2. **Extract database schema**: Move to `myplugin/database.rs`
3. **Extract types**: Move to `myplugin/events.rs`
4. **Extract HTTP routes**: Move to `myplugin/routes.rs` (TODO: HTTP integration)
5. **Implement Plugin trait**: Create `myplugin/mod.rs`
6. **Register plugin**: Add to `plugins/mod.rs`
7. **Test**: Enable in `plugins.json` and test

## Benefits

✅ **True Modularity** - Add/remove plugins without touching core
✅ **No Plugin Knowledge in Core** - Generic event and service systems
✅ **Easy Testing** - Test plugins in isolation
✅ **Hot Reloading** - Enable/disable plugins via config
✅ **Clear Boundaries** - Each plugin owns its data and logic
✅ **Scalable** - Add unlimited plugins without complexity
✅ **Type Safety** - Rust's type system enforced per-plugin

## Next Steps

- [ ] Add HTTP route registration to PluginContext
- [ ] Add WebSocket message routing per plugin
- [ ] Create more example plugins (roulette, packs, twitch, discord)
- [ ] Add plugin testing utilities
- [ ] Add plugin hot-reloading support
- [ ] Create plugin development CLI tool

## Questions?

For examples and inspiration:
- See `bridge/src/plugins/auction/` - Complete working plugin
- See `bridge/src/main_plugin_example.rs` - Example main.rs setup
- See `bridge/PLUGIN_SYSTEM.md` - This document
