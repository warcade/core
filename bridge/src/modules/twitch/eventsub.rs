use serde::{Deserialize, Serialize};

use super::twitch_irc_client::*;

/// EventSub webhook payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSubPayload {
    pub subscription: EventSubSubscription,
    pub event: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub challenge: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventSubSubscription {
    pub id: String,
    #[serde(rename = "type")]
    pub subscription_type: String,
    pub version: String,
    pub status: String,
    pub cost: i32,
    pub condition: serde_json::Value,
    pub created_at: String,
}

// EventSub webhook handler will be implemented in the future
// For now, this module just contains the event type definitions
// and test alert functionality is handled in handlers.rs
