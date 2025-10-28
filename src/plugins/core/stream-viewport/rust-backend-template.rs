// Add this to your src-tauri/src/main.rs or create a new module

use serde::{Deserialize, Serialize};
use tauri::State;
use std::sync::Mutex;
use image::{ImageBuffer, Rgba};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Position {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Size {
    width: f64,
    height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceConfig {
    chroma_key_enabled: Option<bool>,
    chroma_key_color: Option<String>,
    chroma_key_similarity: Option<f32>,
    chroma_key_smoothness: Option<f32>,
    text: Option<String>,
    color: Option<String>,
    font_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Source {
    id: u32,
    #[serde(rename = "type")]
    source_type: String,
    position: Position,
    size: Size,
    visible: bool,
    config: SourceConfig,
}

#[derive(Debug, Serialize)]
struct ImageData {
    data: Vec<u8>,
    width: u32,
    height: u32,
}

struct RendererState {
    width: u32,
    height: u32,
}

#[tauri::command]
fn init_renderer(width: u32, height: u32, state: State<Mutex<Option<RendererState>>>) -> Result<(), String> {
    let mut renderer = state.lock().map_err(|e| e.to_string())?;
    *renderer = Some(RendererState { width, height });
    println!("[Rust Renderer] Initialized with {}x{}", width, height);
    Ok(())
}

#[tauri::command]
fn render_frame(sources: Vec<Source>, state: State<Mutex<Option<RendererState>>>) -> Result<ImageData, String> {
    let renderer = state.lock().map_err(|e| e.to_string())?;
    let renderer = renderer.as_ref().ok_or("Renderer not initialized")?;

    // Create RGBA image buffer
    let mut img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(renderer.width, renderer.height);

    // Fill background
    for pixel in img.pixels_mut() {
        *pixel = Rgba([26, 26, 26, 255]); // #1a1a1a background
    }

    // Render each source
    for source in sources.iter() {
        if !source.visible {
            continue;
        }

        render_source(&mut img, source);
    }

    // Convert to flat Vec<u8>
    let data = img.into_raw();

    Ok(ImageData {
        data,
        width: renderer.width,
        height: renderer.height,
    })
}

fn render_source(img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>, source: &Source) {
    let x = source.position.x as u32;
    let y = source.position.y as u32;
    let width = source.size.width as u32;
    let height = source.size.height as u32;

    match source.source_type.as_str() {
        "text" => render_text(img, source, x, y, width, height),
        "image" => {
            // Draw placeholder for now
            draw_rect(img, x, y, width, height, Rgba([139, 92, 246, 255]));
        }
        "webcam" | "display" => {
            // Draw placeholder
            let color = if source.source_type == "webcam" {
                Rgba([59, 130, 246, 255])
            } else {
                Rgba([16, 185, 129, 255])
            };
            draw_rect(img, x, y, width, height, color);
        }
        "video" => {
            draw_rect(img, x, y, width, height, Rgba([239, 68, 68, 255]));
        }
        "browser" => {
            draw_rect(img, x, y, width, height, Rgba([245, 158, 11, 255]));
        }
        _ => {}
    }
}

fn draw_rect(img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>, x: u32, y: u32, width: u32, height: u32, color: Rgba<u8>) {
    let img_width = img.width();
    let img_height = img.height();

    for py in y..y + height {
        if py >= img_height {
            break;
        }
        for px in x..x + width {
            if px >= img_width {
                break;
            }
            img.put_pixel(px, py, color);
        }
    }
}

fn render_text(img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>, source: &Source, x: u32, y: u32, width: u32, height: u32) {
    // For now, just draw a background rectangle
    // You can integrate rusttype or ab_glyph for actual text rendering
    let bg_color = Rgba([0, 0, 0, 128]);
    draw_rect(img, x, y, width, height, bg_color);
}

#[tauri::command]
fn cleanup_renderer(state: State<Mutex<Option<RendererState>>>) -> Result<(), String> {
    let mut renderer = state.lock().map_err(|e| e.to_string())?;
    *renderer = None;
    println!("[Rust Renderer] Cleaned up");
    Ok(())
}

// Add this to your main.rs builder:
// fn main() {
//     tauri::Builder::default()
//         .manage(Mutex::new(None::<RendererState>))
//         .invoke_handler(tauri::generate_handler![
//             init_renderer,
//             render_frame,
//             cleanup_renderer
//         ])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// Add these to your Cargo.toml:
// [dependencies]
// image = "0.24"
// serde = { version = "1.0", features = ["derive"] }
// serde_json = "1.0"
