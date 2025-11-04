#!/bin/bash
# Plugin stub generator
# Usage: ./create_plugin_stub.sh <plugin_name> "<description>" "<dependencies>"

PLUGIN_NAME=$1
DESCRIPTION=$2
DEPENDENCIES=$3

if [ -z "$PLUGIN_NAME" ]; then
    echo "Usage: ./create_plugin_stub.sh <plugin_name> \"<description>\" \"<dependencies>\""
    exit 1
fi

PLUGIN_DIR="src/plugins/$PLUGIN_NAME"
mkdir -p "$PLUGIN_DIR"

# Create mod.rs
cat > "$PLUGIN_DIR/mod.rs" <<EOF
use crate::core::plugin::{Plugin, PluginMetadata};
use crate::core::plugin_context::PluginContext;
use async_trait::async_trait;
use std::sync::Arc;
use anyhow::Result;

pub struct ${PLUGIN_NAME^}Plugin;

#[async_trait]
impl Plugin for ${PLUGIN_NAME^}Plugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "$PLUGIN_NAME".to_string(),
            name: "${PLUGIN_NAME^} Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: "$DESCRIPTION".to_string(),
            author: "WebArcade Team".to_string(),
            dependencies: vec![$DEPENDENCIES],
        }
    }

    async fn init(&self, ctx: &PluginContext) -> Result<()> {
        log::info!("[$PLUGIN_NAME^] Initializing plugin...");

        // TODO: Add database migrations
        // ctx.migrate(&[
        //     r#"CREATE TABLE IF NOT EXISTS ..."#,
        // ])?;

        // TODO: Register services
        // See MIGRATION_GUIDE.md for patterns

        log::info!("[$PLUGIN_NAME^] Plugin initialized successfully");
        Ok(())
    }

    async fn start(&self, _ctx: Arc<PluginContext>) -> Result<()> {
        log::info!("[$PLUGIN_NAME^] Starting plugin...");
        // TODO: Subscribe to events, start background tasks
        Ok(())
    }

    async fn stop(&self) -> Result<()> {
        log::info!("[$PLUGIN_NAME^] Stopping plugin...");
        Ok(())
    }
}
EOF

echo "Created plugin stub: $PLUGIN_DIR/mod.rs"
echo "Next steps:"
echo "1. Implement database migrations in init()"
echo "2. Register services for external API"
echo "3. Subscribe to events in start()"
echo "4. Add to plugins/mod.rs"
echo "5. Add to plugins.json"
echo ""
echo "See MIGRATION_GUIDE.md for detailed instructions"
