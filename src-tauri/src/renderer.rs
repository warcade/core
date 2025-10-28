use image::{ImageBuffer, Rgba, RgbaImage};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceConfig {
    pub chroma_key_enabled: Option<bool>,
    pub chroma_key_color: Option<String>,
    pub chroma_key_similarity: Option<f32>,
    pub chroma_key_smoothness: Option<f32>,
    pub text: Option<String>,
    pub color: Option<String>,
    pub font_size: Option<u32>,
    pub font_family: Option<String>,
    pub background_color: Option<String>,
    pub text_align: Option<String>,
    pub bold: Option<bool>,
    pub italic: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub id: u32,
    #[serde(rename = "type")]
    pub source_type: String,
    pub position: Position,
    pub size: Size,
    pub visible: bool,
    pub config: SourceConfig,
}

#[derive(Debug, Serialize)]
pub struct ImageData {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

pub struct RendererState {
    pub width: u32,
    pub height: u32,
}

impl RendererState {
    pub fn new(width: u32, height: u32) -> Self {
        RendererState { width, height }
    }
}

#[tauri::command]
pub fn init_renderer(
    width: u32,
    height: u32,
    state: tauri::State<Mutex<Option<RendererState>>>,
) -> Result<(), String> {
    let mut renderer = state.lock().map_err(|e| e.to_string())?;
    *renderer = Some(RendererState::new(width, height));
    println!("[Rust Renderer] Initialized with {}x{}", width, height);
    Ok(())
}

#[tauri::command]
pub fn render_frame(
    sources: Vec<Source>,
    state: tauri::State<Mutex<Option<RendererState>>>,
) -> Result<ImageData, String> {
    let renderer = state.lock().map_err(|e| e.to_string())?;
    let renderer = renderer.as_ref().ok_or("Renderer not initialized")?;

    // Create RGBA image buffer
    let mut img = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(renderer.width, renderer.height);

    // Fill background (dark gray #1a1a1a)
    img.par_chunks_mut(4).for_each(|pixel| {
        pixel[0] = 26; // R
        pixel[1] = 26; // G
        pixel[2] = 26; // B
        pixel[3] = 255; // A
    });

    // Draw grid
    draw_grid(&mut img, 50);

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

fn draw_grid(img: &mut RgbaImage, grid_size: u32) {
    let width = img.width();
    let height = img.height();
    let grid_color = Rgba([42, 42, 42, 255]); // #2a2a2a

    // Vertical lines
    let mut x = grid_size;
    while x < width {
        for y in 0..height {
            img.put_pixel(x, y, grid_color);
        }
        x += grid_size;
    }

    // Horizontal lines
    let mut y = grid_size;
    while y < height {
        for x in 0..width {
            img.put_pixel(x, y, grid_color);
        }
        y += grid_size;
    }
}

fn render_source(img: &mut RgbaImage, source: &Source) {
    let x = source.position.x as u32;
    let y = source.position.y as u32;
    let width = source.size.width as u32;
    let height = source.size.height as u32;

    match source.source_type.as_str() {
        "text" => render_text_box(img, source, x, y, width, height),
        "image" => {
            // Purple placeholder
            draw_rect(img, x, y, width, height, Rgba([139, 92, 246, 255]));
            draw_centered_text(img, x, y, width, height, "🖼️ Image");
        }
        "webcam" => {
            // Blue placeholder
            draw_rect(img, x, y, width, height, Rgba([59, 130, 246, 255]));
            draw_centered_text(img, x, y, width, height, "📹 Webcam");
        }
        "display" => {
            // Green placeholder
            draw_rect(img, x, y, width, height, Rgba([16, 185, 129, 255]));
            draw_centered_text(img, x, y, width, height, "🖥️ Display");
        }
        "video" => {
            // Red placeholder
            draw_rect(img, x, y, width, height, Rgba([239, 68, 68, 255]));
            draw_centered_text(img, x, y, width, height, "🎬 Video");
        }
        "browser" => {
            // Orange placeholder
            draw_rect(img, x, y, width, height, Rgba([245, 158, 11, 255]));
            draw_centered_text(img, x, y, width, height, "🌐 Browser");
        }
        _ => {}
    }
}

fn draw_rect(img: &mut RgbaImage, x: u32, y: u32, width: u32, height: u32, color: Rgba<u8>) {
    let img_width = img.width();
    let img_height = img.height();

    for py in y..y.saturating_add(height).min(img_height) {
        for px in x..x.saturating_add(width).min(img_width) {
            img.put_pixel(px, py, color);
        }
    }
}

fn render_text_box(img: &mut RgbaImage, source: &Source, x: u32, y: u32, width: u32, height: u32) {
    // Draw background if specified
    if let Some(bg_color) = &source.config.background_color {
        if bg_color != "transparent" {
            let color = parse_hex_color(bg_color).unwrap_or(Rgba([0, 0, 0, 128]));
            draw_rect(img, x, y, width, height, color);
        }
    } else {
        // Default semi-transparent background
        draw_rect(img, x, y, width, height, Rgba([0, 0, 0, 128]));
    }

    // For now, just show a text placeholder
    // Full text rendering would require rusttype integration
    let text = source
        .config
        .text
        .as_deref()
        .unwrap_or("Text");

    draw_centered_text(img, x, y, width, height, text);
}

fn draw_centered_text(_img: &mut RgbaImage, _x: u32, _y: u32, _width: u32, _height: u32, _text: &str) {
    // Placeholder - proper text rendering would use rusttype
    // For now, text is handled by JavaScript for simplicity
}

fn parse_hex_color(hex: &str) -> Option<Rgba<u8>> {
    let hex = hex.trim_start_matches('#');
    if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
        let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
        let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
        Some(Rgba([r, g, b, 255]))
    } else if hex.len() == 8 {
        let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
        let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
        let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
        let a = u8::from_str_radix(&hex[6..8], 16).ok()?;
        Some(Rgba([r, g, b, a]))
    } else {
        None
    }
}

#[tauri::command]
pub fn cleanup_renderer(state: tauri::State<Mutex<Option<RendererState>>>) -> Result<(), String> {
    let mut renderer = state.lock().map_err(|e| e.to_string())?;
    *renderer = None;
    println!("[Rust Renderer] Cleaned up");
    Ok(())
}
