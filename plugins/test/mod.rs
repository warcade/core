pub mod router;

use api::{Plugin, PluginMetadata};

pub struct TestPlugin;

impl Plugin for TestPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "test".into(),
            name: "test".into(),
            version: "1.0.0".into(),
            description: "test plugin".into(),
            author: "webarcade".into(),
            dependencies: vec![],
        }
    }
}
