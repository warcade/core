//! Event system

use serde::{Deserialize, Serialize};

/// Event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub name: String,
    pub data: serde_json::Value,
}
