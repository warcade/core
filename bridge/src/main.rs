use std::fs;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;
use log::{info, error};

mod modules;
use modules::*;


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logger with timestamp and colors
    env_logger::Builder::from_default_env()
        .format_timestamp_secs()
        .init();
    
    info!("Initializing WebArcade Bridge server");
    
    // Initialize application state with startup time
    let startup_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();
    
    let port = env::var("BRIDGE_PORT").unwrap_or_else(|_| "3001".to_string());
    let base_path = get_base_path();
    let projects_path = get_projects_path();
    
    info!("Starting bridge server on port {}", port);
    info!("Base path: {}", base_path.display());
    info!("Projects path: {}", projects_path.display());
    
    if !projects_path.exists() {
        fs::create_dir_all(&projects_path)?;
        info!("Created projects directory");
    }
    
    // Initialize file watcher
    initialize_file_watcher(projects_path.clone())?;
    
    // Initialize system monitor
    initialize_system_monitor();
    
    // Start WebSocket server on port 3002
    let ws_port = env::var("WS_PORT").unwrap_or_else(|_| "3002".to_string());
    let ws_port_num: u16 = ws_port.parse().unwrap_or(3002);
    tokio::spawn(async move {
        if let Err(e) = start_websocket_server(ws_port_num).await {
            error!("WebSocket server error: {}", e);
        }
    });
    
    // Initialize lightweight memory cache
    info!("Initializing memory cache");
    let memory_cache = Arc::new(tokio::sync::Mutex::new(MemoryCache::new()));
    
    // Set state in handlers module
    set_startup_time(startup_time);
    set_memory_cache(memory_cache);

    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse()?;
    let listener = TcpListener::bind(addr).await?;
    info!("Server listening on http://localhost:{}", port);

    loop {
        let (tcp, client_addr) = listener.accept().await?;
        let io = TokioIo::new(tcp);

        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(io, service_fn(handle_http_request))
                .await
            {
                error!("Error serving connection from {}: {:?}", client_addr, err);
            }
        });
    }
}