//! WebSocket client for real-time communication
//!
//! Provides FFI-safe WebSocket client operations.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock, Mutex};
use futures_util::{StreamExt, SinkExt};

/// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WsMessage {
    Text(String),
    Binary(Vec<u8>),
    Ping(Vec<u8>),
    Pong(Vec<u8>),
    Close(Option<CloseFrame>),
}

/// WebSocket close frame
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloseFrame {
    pub code: u16,
    pub reason: String,
}

/// WebSocket connection state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WsState {
    Connecting,
    Open,
    Closing,
    Closed,
}

/// WebSocket event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WsEvent {
    Connected,
    Message(WsMessage),
    Error(String),
    Disconnected(Option<CloseFrame>),
}

/// WebSocket client configuration
#[derive(Debug, Clone)]
pub struct WsConfig {
    pub url: String,
    pub headers: HashMap<String, String>,
    pub auto_reconnect: bool,
    pub reconnect_delay_ms: u64,
    pub max_reconnect_attempts: u32,
    pub ping_interval_ms: Option<u64>,
}

impl Default for WsConfig {
    fn default() -> Self {
        Self {
            url: String::new(),
            headers: HashMap::new(),
            auto_reconnect: false,
            reconnect_delay_ms: 5000,
            max_reconnect_attempts: 5,
            ping_interval_ms: None,
        }
    }
}

/// WebSocket client builder
pub struct WsClientBuilder {
    config: WsConfig,
}

impl WsClientBuilder {
    /// Create a new WebSocket client builder
    pub fn new(url: &str) -> Self {
        Self {
            config: WsConfig {
                url: url.to_string(),
                ..Default::default()
            },
        }
    }

    /// Add a header
    pub fn header(mut self, key: &str, value: &str) -> Self {
        self.config.headers.insert(key.to_string(), value.to_string());
        self
    }

    /// Set authorization header
    pub fn auth(self, value: &str) -> Self {
        self.header("Authorization", value)
    }

    /// Set bearer token
    pub fn bearer_token(self, token: &str) -> Self {
        self.auth(&format!("Bearer {}", token))
    }

    /// Enable auto-reconnect
    pub fn auto_reconnect(mut self, enabled: bool) -> Self {
        self.config.auto_reconnect = enabled;
        self
    }

    /// Set reconnect delay in milliseconds
    pub fn reconnect_delay(mut self, ms: u64) -> Self {
        self.config.reconnect_delay_ms = ms;
        self
    }

    /// Set maximum reconnect attempts
    pub fn max_reconnect_attempts(mut self, max: u32) -> Self {
        self.config.max_reconnect_attempts = max;
        self
    }

    /// Set ping interval in milliseconds
    pub fn ping_interval(mut self, ms: u64) -> Self {
        self.config.ping_interval_ms = Some(ms);
        self
    }

    /// Build and connect
    pub async fn connect(self) -> Result<WsClient, String> {
        WsClient::connect_with_config(self.config).await
    }
}

/// WebSocket client
pub struct WsClient {
    state: Arc<RwLock<WsState>>,
    sender: Arc<Mutex<Option<mpsc::UnboundedSender<WsMessage>>>>,
    event_rx: Arc<Mutex<mpsc::UnboundedReceiver<WsEvent>>>,
    config: WsConfig,
}

impl WsClient {
    /// Create a new WebSocket client builder
    pub fn builder(url: &str) -> WsClientBuilder {
        WsClientBuilder::new(url)
    }

    /// Connect to a WebSocket server
    pub async fn connect(url: &str) -> Result<Self, String> {
        Self::connect_with_config(WsConfig {
            url: url.to_string(),
            ..Default::default()
        })
        .await
    }

    /// Connect with custom configuration
    pub async fn connect_with_config(config: WsConfig) -> Result<Self, String> {
        use tokio_tungstenite::tungstenite::http::Request;
        use tokio_tungstenite::connect_async;

        let state = Arc::new(RwLock::new(WsState::Connecting));
        let (event_tx, event_rx) = mpsc::unbounded_channel();
        let (msg_tx, mut msg_rx) = mpsc::unbounded_channel::<WsMessage>();

        // Build the request with headers
        let mut request_builder = Request::builder().uri(&config.url);
        for (key, value) in &config.headers {
            request_builder = request_builder.header(key, value);
        }
        let request = request_builder
            .body(())
            .map_err(|e| format!("Failed to build request: {}", e))?;

        // Connect
        let (ws_stream, _response) = connect_async(request)
            .await
            .map_err(|e| format!("WebSocket connection failed: {}", e))?;

        let (mut write, mut read) = ws_stream.split();

        // Update state to Open
        {
            let mut s = state.write().await;
            *s = WsState::Open;
        }

        // Send connected event
        let _ = event_tx.send(WsEvent::Connected);

        let state_clone = state.clone();
        let event_tx_clone = event_tx.clone();

        // Spawn task to handle incoming messages
        tokio::spawn(async move {
            while let Some(msg_result) = read.next().await {
                match msg_result {
                    Ok(msg) => {
                        let ws_msg = match msg {
                            tokio_tungstenite::tungstenite::Message::Text(text) => {
                                WsMessage::Text(text.to_string())
                            }
                            tokio_tungstenite::tungstenite::Message::Binary(data) => {
                                WsMessage::Binary(data.to_vec())
                            }
                            tokio_tungstenite::tungstenite::Message::Ping(data) => {
                                WsMessage::Ping(data.to_vec())
                            }
                            tokio_tungstenite::tungstenite::Message::Pong(data) => {
                                WsMessage::Pong(data.to_vec())
                            }
                            tokio_tungstenite::tungstenite::Message::Close(frame) => {
                                let close_frame = frame.map(|f| CloseFrame {
                                    code: f.code.into(),
                                    reason: f.reason.to_string(),
                                });
                                {
                                    let mut s = state_clone.write().await;
                                    *s = WsState::Closed;
                                }
                                let _ = event_tx_clone.send(WsEvent::Disconnected(close_frame));
                                break;
                            }
                            _ => continue,
                        };
                        let _ = event_tx_clone.send(WsEvent::Message(ws_msg));
                    }
                    Err(e) => {
                        let _ = event_tx_clone.send(WsEvent::Error(e.to_string()));
                        break;
                    }
                }
            }
            {
                let mut s = state_clone.write().await;
                *s = WsState::Closed;
            }
        });

        // Spawn task to handle outgoing messages
        tokio::spawn(async move {
            while let Some(msg) = msg_rx.recv().await {
                let tung_msg = match msg {
                    WsMessage::Text(text) => tokio_tungstenite::tungstenite::Message::Text(text.into()),
                    WsMessage::Binary(data) => tokio_tungstenite::tungstenite::Message::Binary(data.into()),
                    WsMessage::Ping(data) => tokio_tungstenite::tungstenite::Message::Ping(data.into()),
                    WsMessage::Pong(data) => tokio_tungstenite::tungstenite::Message::Pong(data.into()),
                    WsMessage::Close(frame) => {
                        let close_frame = frame.map(|f| {
                            tokio_tungstenite::tungstenite::protocol::CloseFrame {
                                code: tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode::from(f.code),
                                reason: f.reason.into(),
                            }
                        });
                        tokio_tungstenite::tungstenite::Message::Close(close_frame)
                    }
                };
                if write.send(tung_msg).await.is_err() {
                    break;
                }
            }
        });

        Ok(Self {
            state,
            sender: Arc::new(Mutex::new(Some(msg_tx))),
            event_rx: Arc::new(Mutex::new(event_rx)),
            config,
        })
    }

    /// Get current connection state
    pub async fn state(&self) -> WsState {
        *self.state.read().await
    }

    /// Check if connected
    pub async fn is_connected(&self) -> bool {
        *self.state.read().await == WsState::Open
    }

    /// Send a text message
    pub async fn send_text(&self, text: &str) -> Result<(), String> {
        let sender = self.sender.lock().await;
        if let Some(tx) = sender.as_ref() {
            tx.send(WsMessage::Text(text.to_string()))
                .map_err(|_| "WebSocket connection closed".to_string())
        } else {
            Err("WebSocket not connected".to_string())
        }
    }

    /// Send a binary message
    pub async fn send_binary(&self, data: Vec<u8>) -> Result<(), String> {
        let sender = self.sender.lock().await;
        if let Some(tx) = sender.as_ref() {
            tx.send(WsMessage::Binary(data))
                .map_err(|_| "WebSocket connection closed".to_string())
        } else {
            Err("WebSocket not connected".to_string())
        }
    }

    /// Send a JSON message
    pub async fn send_json<T: Serialize>(&self, data: &T) -> Result<(), String> {
        let json = serde_json::to_string(data)
            .map_err(|e| format!("Failed to serialize JSON: {}", e))?;
        self.send_text(&json).await
    }

    /// Send a ping
    pub async fn ping(&self) -> Result<(), String> {
        let sender = self.sender.lock().await;
        if let Some(tx) = sender.as_ref() {
            tx.send(WsMessage::Ping(vec![]))
                .map_err(|_| "WebSocket connection closed".to_string())
        } else {
            Err("WebSocket not connected".to_string())
        }
    }

    /// Receive the next event
    pub async fn recv(&self) -> Option<WsEvent> {
        let mut rx = self.event_rx.lock().await;
        rx.recv().await
    }

    /// Try to receive an event without blocking
    pub async fn try_recv(&self) -> Option<WsEvent> {
        let mut rx = self.event_rx.lock().await;
        rx.try_recv().ok()
    }

    /// Close the connection
    pub async fn close(&self) -> Result<(), String> {
        {
            let mut s = self.state.write().await;
            *s = WsState::Closing;
        }

        let sender = self.sender.lock().await;
        if let Some(tx) = sender.as_ref() {
            let _ = tx.send(WsMessage::Close(Some(CloseFrame {
                code: 1000,
                reason: "Normal closure".to_string(),
            })));
        }

        Ok(())
    }

    /// Close with a custom close frame
    pub async fn close_with(&self, code: u16, reason: &str) -> Result<(), String> {
        {
            let mut s = self.state.write().await;
            *s = WsState::Closing;
        }

        let sender = self.sender.lock().await;
        if let Some(tx) = sender.as_ref() {
            let _ = tx.send(WsMessage::Close(Some(CloseFrame {
                code,
                reason: reason.to_string(),
            })));
        }

        Ok(())
    }

    /// Get the configuration
    pub fn config(&self) -> &WsConfig {
        &self.config
    }
}

/// WebSocket utilities
pub struct WebSocket;

impl WebSocket {
    /// Create a new WebSocket client builder
    pub fn connect(url: &str) -> WsClientBuilder {
        WsClientBuilder::new(url)
    }

    /// Quick connect without configuration
    pub async fn quick_connect(url: &str) -> Result<WsClient, String> {
        WsClient::connect(url).await
    }
}

/// Simple WebSocket message handler helper
pub struct WsHandler {
    handlers: HashMap<String, Box<dyn Fn(String) -> Option<String> + Send + Sync>>,
}

impl WsHandler {
    /// Create a new handler
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    /// Add a text message handler for a specific pattern
    pub fn on<F>(&mut self, event_type: &str, handler: F) -> &mut Self
    where
        F: Fn(String) -> Option<String> + Send + Sync + 'static,
    {
        self.handlers.insert(event_type.to_string(), Box::new(handler));
        self
    }

    /// Handle a message, returning an optional response
    pub fn handle(&self, event_type: &str, message: String) -> Option<String> {
        self.handlers
            .get(event_type)
            .and_then(|handler| handler(message))
    }
}

impl Default for WsHandler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_config_default() {
        let config = WsConfig::default();
        assert_eq!(config.auto_reconnect, false);
        assert_eq!(config.reconnect_delay_ms, 5000);
        assert_eq!(config.max_reconnect_attempts, 5);
    }

    #[test]
    fn test_ws_builder() {
        let builder = WsClientBuilder::new("wss://example.com")
            .header("X-Custom", "value")
            .auto_reconnect(true)
            .reconnect_delay(3000)
            .max_reconnect_attempts(10);

        assert_eq!(builder.config.url, "wss://example.com");
        assert_eq!(builder.config.auto_reconnect, true);
        assert_eq!(builder.config.reconnect_delay_ms, 3000);
        assert_eq!(builder.config.max_reconnect_attempts, 10);
    }

    #[test]
    fn test_ws_handler() {
        let mut handler = WsHandler::new();
        handler.on("echo", |msg| Some(msg));
        handler.on("uppercase", |msg| Some(msg.to_uppercase()));

        assert_eq!(handler.handle("echo", "hello".to_string()), Some("hello".to_string()));
        assert_eq!(handler.handle("uppercase", "hello".to_string()), Some("HELLO".to_string()));
        assert_eq!(handler.handle("unknown", "test".to_string()), None);
    }
}
