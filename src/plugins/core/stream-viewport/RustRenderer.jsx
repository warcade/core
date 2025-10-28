// Rust-accelerated renderer using Tauri commands
import { invoke } from '@tauri-apps/api/core';

export class RustRenderer {
  constructor() {
    this.initialized = false;
  }

  async init(width, height) {
    try {
      await invoke('init_renderer', { width, height });
      this.initialized = true;
      console.log('[RustRenderer] Initialized');
      return true;
    } catch (error) {
      console.error('[RustRenderer] Failed to initialize:', error);
      return false;
    }
  }

  async renderFrame(sources, canvasElement) {
    if (!this.initialized) return false;

    try {
      // Prepare source data for Rust
      const sourcesData = sources.map(source => ({
        id: source.id,
        type: source.type,
        position: source.position,
        size: source.size,
        visible: source.visible,
        config: this.sanitizeConfig(source.config)
      }));

      // Call Rust to render the frame
      const imageData = await invoke('render_frame', { sources: sourcesData });

      // Draw the result to canvas
      if (imageData && canvasElement) {
        const ctx = canvasElement.getContext('2d');
        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );
        ctx.putImageData(imgData, 0, 0);
      }

      return true;
    } catch (error) {
      console.error('[RustRenderer] Render error:', error);
      return false;
    }
  }

  sanitizeConfig(config) {
    // Remove non-serializable data like MediaStreams
    const sanitized = { ...config };
    delete sanitized.stream;
    delete sanitized.imageData;
    delete sanitized.videoUrl;
    return sanitized;
  }

  async cleanup() {
    if (this.initialized) {
      try {
        await invoke('cleanup_renderer');
        this.initialized = false;
        console.log('[RustRenderer] Cleaned up');
      } catch (error) {
        console.error('[RustRenderer] Cleanup error:', error);
      }
    }
  }
}

export default RustRenderer;
