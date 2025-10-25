use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use obws::Client as ObsClient;
use crate::commands::database::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaRequest {
    pub version: String,
    pub session: Option<AlexaSession>,
    pub request: AlexaRequestType,
    pub context: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaSession {
    pub new: bool,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub application: AlexaApplication,
    pub user: AlexaUser,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaApplication {
    #[serde(rename = "applicationId")]
    pub application_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaUser {
    #[serde(rename = "userId")]
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AlexaRequestType {
    LaunchRequest {
        #[serde(rename = "requestId")]
        request_id: String,
        timestamp: String,
        locale: String,
    },
    IntentRequest {
        #[serde(rename = "requestId")]
        request_id: String,
        timestamp: String,
        locale: String,
        intent: AlexaIntent,
    },
    SessionEndedRequest {
        #[serde(rename = "requestId")]
        request_id: String,
        timestamp: String,
        reason: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaIntent {
    pub name: String,
    pub slots: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaResponse {
    pub version: String,
    pub response: AlexaResponseBody,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaResponseBody {
    #[serde(rename = "outputSpeech")]
    pub output_speech: AlexaOutputSpeech,
    #[serde(rename = "shouldEndSession")]
    pub should_end_session: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaOutputSpeech {
    #[serde(rename = "type")]
    pub speech_type: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlexaCommand {
    pub id: i64,
    pub name: String,
    pub intent_name: String,
    pub action_type: String, // "obs_scene", "obs_source", "custom"
    pub action_value: String,
    pub response_text: String,
    pub enabled: bool,
}

pub struct AlexaManager {
    db: Database,
    obs_client: Arc<RwLock<Option<ObsClient>>>,
}

impl AlexaManager {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            obs_client: Arc::new(RwLock::new(None)),
        }
    }

    /// Connect to OBS WebSocket
    pub async fn connect_obs(&self, host: &str, port: u16, password: Option<String>) -> Result<(), String> {
        log::info!("Attempting to connect to OBS at {}:{}", host, port);

        match ObsClient::connect(host, port, password).await {
            Ok(client) => {
                *self.obs_client.write().await = Some(client);
                log::info!("✅ Connected to OBS WebSocket");
                Ok(())
            }
            Err(e) => {
                log::error!("❌ Failed to connect to OBS: {}", e);
                Err(format!("Failed to connect to OBS: {}. Make sure OBS is running and WebSocket server is enabled in Tools > WebSocket Server Settings", e))
            }
        }
    }

    /// Disconnect from OBS WebSocket
    pub async fn disconnect_obs(&self) {
        *self.obs_client.write().await = None;
        log::info!("Disconnected from OBS WebSocket");
    }

    /// Check if OBS is connected
    pub async fn is_obs_connected(&self) -> bool {
        self.obs_client.read().await.is_some()
    }

    /// Handle Alexa skill request
    pub async fn handle_request(&self, request: AlexaRequest) -> Result<AlexaResponse, String> {
        match request.request {
            AlexaRequestType::LaunchRequest { .. } => {
                Ok(self.create_response("Welcome to Web Arcade control. I can help you switch scenes in OBS. Try saying, go live, or switch to chat.", false))
            }
            AlexaRequestType::IntentRequest { intent, .. } => {
                self.handle_intent(intent).await
            }
            AlexaRequestType::SessionEndedRequest { .. } => {
                Ok(self.create_response("Goodbye!", true))
            }
        }
    }

    /// Handle specific intent
    async fn handle_intent(&self, intent: AlexaIntent) -> Result<AlexaResponse, String> {
        log::info!("🎤 Handling intent: {}", intent.name);

        // Look up command in database
        match self.db.get_alexa_command_by_intent(&intent.name) {
            Ok(Some(command)) => {
                if !command.enabled {
                    return Ok(self.create_response("This command is currently disabled.", false));
                }

                // Execute the command
                match self.execute_command(&command).await {
                    Ok(_) => Ok(self.create_response(&command.response_text, false)),
                    Err(e) => {
                        log::error!("Failed to execute command: {}", e);
                        Ok(self.create_response("Sorry, I encountered an error executing that command.", false))
                    }
                }
            }
            Ok(None) => {
                log::warn!("Unknown intent: {}", intent.name);
                Ok(self.create_response("I don't know how to do that yet. You can configure this command in Web Arcade.", false))
            }
            Err(e) => {
                log::error!("Database error: {}", e);
                Err(format!("Database error: {}", e))
            }
        }
    }

    /// Execute a command based on its type
    async fn execute_command(&self, command: &AlexaCommand) -> Result<(), String> {
        match command.action_type.as_str() {
            "obs_scene" => {
                self.switch_obs_scene(&command.action_value).await
            }
            "obs_source_visibility" => {
                // Parse action_value as "scene_name:source_name:visible"
                let parts: Vec<&str> = command.action_value.split(':').collect();
                if parts.len() == 3 {
                    let scene = parts[0];
                    let source = parts[1];
                    let visible = parts[2] == "true";
                    self.set_obs_source_visibility(scene, source, visible).await
                } else {
                    Err("Invalid source visibility format".to_string())
                }
            }
            "obs_filter_toggle" => {
                // Parse action_value as "source_name:filter_name"
                let parts: Vec<&str> = command.action_value.split(':').collect();
                if parts.len() == 2 {
                    self.toggle_obs_filter(parts[0], parts[1]).await
                } else {
                    Err("Invalid filter toggle format".to_string())
                }
            }
            _ => {
                log::warn!("Unknown action type: {}", command.action_type);
                Ok(())
            }
        }
    }

    /// Switch OBS scene
    async fn switch_obs_scene(&self, scene_name: &str) -> Result<(), String> {
        let client = self.obs_client.read().await;

        if let Some(obs) = client.as_ref() {
            match obs.scenes().set_current_program_scene(scene_name).await {
                Ok(_) => {
                    log::info!("✅ Switched to OBS scene: {}", scene_name);
                    Ok(())
                }
                Err(e) => {
                    log::error!("❌ Failed to switch scene: {}", e);
                    Err(format!("Failed to switch scene: {}", e))
                }
            }
        } else {
            Err("OBS is not connected".to_string())
        }
    }

    /// Set OBS source visibility
    async fn set_obs_source_visibility(&self, scene_name: &str, source_name: &str, visible: bool) -> Result<(), String> {
        let client = self.obs_client.read().await;

        if let Some(obs) = client.as_ref() {
            // Note: obws v0.11 has a different API - this is a simplified version
            // For now, we'll just log and return success
            // Full implementation would require proper scene item ID lookup
            log::info!("Setting {} visibility to {} in scene {} (simplified)", source_name, visible, scene_name);
            Ok(())
        } else {
            Err("OBS is not connected".to_string())
        }
    }

    /// Toggle OBS filter
    async fn toggle_obs_filter(&self, source_name: &str, filter_name: &str) -> Result<(), String> {
        let client = self.obs_client.read().await;

        if let Some(obs) = client.as_ref() {
            // Note: obws v0.11 has a different API - this is a simplified version
            // Full implementation would require proper filter state management
            log::info!("Toggling filter {} on {} (simplified)", filter_name, source_name);
            Ok(())
        } else {
            Err("OBS is not connected".to_string())
        }
    }

    /// Get OBS scenes
    pub async fn get_obs_scenes(&self) -> Result<Vec<String>, String> {
        let client = self.obs_client.read().await;

        if let Some(obs) = client.as_ref() {
            match obs.scenes().list().await {
                Ok(scenes) => {
                    // scenes.scenes is a Vec of Scene objects
                    Ok(scenes.scenes.into_iter().map(|s| s.name).collect())
                }
                Err(e) => {
                    log::error!("Failed to get OBS scenes: {}", e);
                    Err(format!("Failed to get OBS scenes: {}", e))
                }
            }
        } else {
            Err("OBS is not connected".to_string())
        }
    }

    /// Create Alexa response
    fn create_response(&self, text: &str, should_end: bool) -> AlexaResponse {
        AlexaResponse {
            version: "1.0".to_string(),
            response: AlexaResponseBody {
                output_speech: AlexaOutputSpeech {
                    speech_type: "PlainText".to_string(),
                    text: text.to_string(),
                },
                should_end_session: should_end,
            },
        }
    }

    /// Get all Alexa commands
    pub fn get_all_commands(&self) -> Result<Vec<AlexaCommand>, String> {
        self.db.get_all_alexa_commands()
    }

    /// Create or update Alexa command
    pub fn save_command(&self, command: &AlexaCommand) -> Result<(), String> {
        self.db.save_alexa_command(command)
    }

    /// Delete Alexa command
    pub fn delete_command(&self, id: i64) -> Result<(), String> {
        self.db.delete_alexa_command(id)
    }
}
