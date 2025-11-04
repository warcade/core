# Migration Guide: Monolithic → Plugin Architecture

## Overview

This guide shows how to migrate each feature from the monolithic `handlers.rs` and `database.rs` into independent plugins.

## Plugin Template

Every plugin follows this structure:

```
plugins/[feature_name]/
├── mod.rs          # Plugin implementation
├── database.rs     # Database operations
├── events.rs       # Event type definitions
└── service.rs      # Business logic (optional)
```

## Step-by-Step Migration Process

### 1. Identify Feature Scope

From `handlers.rs`, find all routes related to your feature:
- Search for route patterns like `"/api/feature/*"`
- Note all HTTP methods (GET, POST, DELETE, etc.)

From `database.rs`, find all schemas and queries:
- Search for CREATE TABLE statements
- Find all query functions related to the feature

From `commands/`, find command handlers:
- Twitch commands (!command)
- Discord commands

### 2. Create Plugin Directory

```bash
mkdir -p bridge/src/plugins/[feature_name]
```

### 3. Create Database Module

**File: `plugins/[feature_name]/database.rs`**

```rust
use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};

// Define your data structures
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MyData {
    pub id: i64,
    pub name: String,
    pub created_at: i64,
}

// Database operations
pub fn create_item(conn: &Connection, name: &str) -> Result<i64> {
    let now = current_timestamp();

    conn.execute(
        "INSERT INTO my_table (name, created_at) VALUES (?1, ?2)",
        params![name, now],
    )?;

    Ok(conn.last_insert_rowid())
}

pub fn get_item(conn: &Connection, id: i64) -> Result<Option<MyData>> {
    conn.query_row(
        "SELECT id, name, created_at FROM my_table WHERE id = ?1",
        params![id],
        |row| Ok(MyData {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
        }),
    ).optional()
}

pub fn list_items(conn: &Connection) -> Result<Vec<MyData>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, created_at FROM my_table ORDER BY created_at DESC"
    )?;

    let items = stmt.query_map([], |row| {
        Ok(MyData {
            id: row.get(0)?,
            name: row.get(1)?,
            created_at: row.get(2)?,
        })
    })?
    .collect::<Result<Vec<_>>>()?;

    Ok(items)
}

pub fn delete_item(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM my_table WHERE id = ?1", params![id])?;
    Ok(())
}

fn current_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}
```

### 4. Create Events Module

**File: `plugins/[feature_name]/events.rs`**

```rust
use serde::{Deserialize, Serialize};

// Define events that this plugin emits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemCreatedEvent {
    pub id: i64,
    pub name: String,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemDeletedEvent {
    pub id: i64,
}

// Define request/response types for services
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemRequest {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateItemResponse {
    pub id: i64,
}
```

### 5. Create Plugin Implementation

**File: `plugins/[feature_name]/mod.rs`**

```rust
use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

mod database;
mod events;

pub use database::*;
pub use events::*;

pub struct MyFeaturePlugin;

#[async_trait]
impl Plugin for MyFeaturePlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "my_feature".to_string(),
            name: "My Feature".to_string(),
            version: "1.0.0".to_string(),
            description: "What this plugin does".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![], // Add plugin IDs if you depend on them
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[MyFeature] Initializing plugin...");

        // 1. Run database migrations
        ctx.migrate(&[
            r#"
            CREATE TABLE IF NOT EXISTS my_table (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_my_table_created ON my_table(created_at);
            "#,
        ])?;

        // 2. Register services
        ctx.provide_service("create_item", |input| async move {
            let name: String = serde_json::from_value(input["name"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let id = database::create_item(&conn, &name)?;
            Ok(serde_json::json!({ "id": id }))
        }).await;

        ctx.provide_service("get_item", |input| async move {
            let id: i64 = serde_json::from_value(input["id"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let item = database::get_item(&conn, id)?;
            Ok(serde_json::to_value(item)?)
        }).await;

        ctx.provide_service("list_items", |_input| async move {
            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            let items = database::list_items(&conn)?;
            Ok(serde_json::to_value(items)?)
        }).await;

        ctx.provide_service("delete_item", |input| async move {
            let id: i64 = serde_json::from_value(input["id"].clone())?;

            let conn = crate::core::database::get_database_path();
            let conn = rusqlite::Connection::open(conn)?;

            database::delete_item(&conn, id)?;
            Ok(serde_json::json!({ "success": true }))
        }).await;

        log::info!("[MyFeature] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[MyFeature] Starting plugin...");

        // 3. Subscribe to events from other plugins
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut events = ctx_clone.subscribe_to("other_plugin.event").await;

            while let Ok(event) = events.recv().await {
                // Handle event
                log::debug!("[MyFeature] Received event: {:?}", event);
            }
        });

        // 4. Start background tasks
        let ctx_clone = ctx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));

            loop {
                interval.tick().await;
                // Do periodic work
            }
        });

        log::info!("[MyFeature] Plugin started successfully");
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[MyFeature] Stopping plugin...");
        // Cleanup
        Ok(())
    }
}
```

### 6. Register Plugin

**File: `plugins/mod.rs`**

```rust
pub mod my_feature;

pub fn register_all_plugins(manager: &mut PluginManager) {
    manager.register(my_feature::MyFeaturePlugin);
    // ... other plugins
}
```

### 7. Add Configuration

**File: `bridge/plugins.json`**

```json
{
  "plugins": [
    {
      "id": "my_feature",
      "enabled": true,
      "config": {
        "max_items": 100,
        "auto_cleanup": true
      }
    }
  ]
}
```

## Migration Checklist

For each feature:

- [ ] Create plugin directory
- [ ] Extract database schema → `database.rs`
- [ ] Extract database queries → `database.rs`
- [ ] Define event types → `events.rs`
- [ ] Implement Plugin trait → `mod.rs`
- [ ] Register services in `init()`
- [ ] Subscribe to events in `start()`
- [ ] Add Twitch/Discord command handlers
- [ ] Register plugin in `plugins/mod.rs`
- [ ] Add configuration to `plugins.json`
- [ ] Test plugin in isolation
- [ ] Remove old code from `handlers.rs` and `database.rs`

## Common Patterns

### Pattern 1: Depend on Another Plugin

```rust
fn metadata(&self) -> PluginMetadata {
    PluginMetadata {
        id: "my_feature".to_string(),
        dependencies: vec!["currency".to_string()],
        // ...
    }
}

async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
    // Call currency plugin service
    let balance = ctx.call_service("currency", "get_balance", serde_json::json!({
        "user_id": "123"
    })).await?;
}
```

### Pattern 2: Emit Events

```rust
// Emit event when something happens
ctx.emit("my_feature.item_created", &ItemCreatedEvent {
    id: 123,
    name: "Test".to_string(),
    created_by: "user".to_string(),
});
```

### Pattern 3: Subscribe to Events

```rust
async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
    let ctx_clone = ctx.clone();
    tokio::spawn(async move {
        let mut events = ctx_clone.subscribe_to("twitch.chat_message").await;

        while let Ok(event) = events.recv().await {
            // Deserialize the payload
            if let Ok(msg) = serde_json::from_value::<TwitchChatMessage>(event.payload) {
                // Handle message
            }
        }
    });
    Ok(())
}
```

### Pattern 4: Handle Twitch Commands

```rust
async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
    let ctx_clone = ctx.clone();
    tokio::spawn(async move {
        let mut events = ctx_clone.subscribe_to("twitch.chat_message").await;

        while let Ok(event) = events.recv().await {
            if let Ok(message) = serde_json::from_value::<String>(event.payload["message"].clone()) {
                let parts: Vec<&str> = message.split_whitespace().collect();

                match parts.get(0) {
                    Some(&"!mycommand") => {
                        // Handle command
                        let response = "Command executed!";

                        // Emit event with response (Twitch plugin will send it)
                        ctx_clone.emit("twitch.send_message", &serde_json::json!({
                            "channel": event.payload["channel"],
                            "message": response
                        }));
                    }
                    _ => {}
                }
            }
        }
    });
    Ok(())
}
```

### Pattern 5: Background Tasks

```rust
async fn start(&self, ctx: Arc<PluginContext>) -> Result<()> {
    let ctx_clone = ctx.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));

        loop {
            interval.tick().await;

            // Do periodic work
            let conn = ctx_clone.db().unwrap();
            if let Err(e) = cleanup_old_items(&conn) {
                log::error!("[MyFeature] Cleanup error: {}", e);
            }
        }
    });
    Ok(())
}
```

## Features to Migrate

Priority order (simplest → most complex):

### Tier 1: Simple CRUD (No dependencies)
1. Notes
2. Goals
3. Todos
4. Ticker

### Tier 2: Game Features (Depend on Currency)
5. Currency (foundational)
6. Levels
7. Roulette
8. Wheel
9. Packs
10. Auction (already done)

### Tier 3: Utilities
11. Files
12. System
13. TTS
14. Text Commands
15. User Profiles
16. Confessions
17. Fun Commands

### Tier 4: Complex Integrations
18. Twitch (IRC, API, Auth, EventSub, Commands)
19. Discord (Bot, Commands, Music)
20. Hue (Smart lights)
21. Withings (Health API)
22. Alexa (Voice commands)
23. OBS (Streaming)

## Testing Strategy

1. **Unit Test Each Plugin**
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[tokio::test]
       async fn test_plugin_init() {
           // Test plugin initialization
       }
   }
   ```

2. **Integration Test**
   - Enable plugin in `plugins.json`
   - Run server
   - Test HTTP endpoints
   - Test event flow
   - Test service calls

3. **Gradual Rollout**
   - Migrate one plugin at a time
   - Keep old code alongside new plugin
   - Switch via feature flag
   - Remove old code after verification

## Next Steps

1. Start with Notes plugin (simplest)
2. Verify it works end-to-end
3. Continue with other Tier 1 plugins
4. Gradually migrate all features
5. Delete old `handlers.rs` and `database.rs`

## Need Help?

- See `bridge/src/plugins/auction/` for complete example
- See `bridge/src/plugins/currency/` for service pattern
- See `bridge/src/plugins/roulette/` for dependency pattern
- See `bridge/PLUGIN_SYSTEM.md` for API reference
