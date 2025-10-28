import { invoke } from '@tauri-apps/api/core';

export class NativeScreenCapture {
  constructor() {
    this.captureId = null;
    this.updateInterval = null;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
  }

  async listDisplays() {
    try {
      const displays = await invoke('list_displays');
      console.log('[NativeScreenCapture] Available displays:', displays);
      return displays;
    } catch (error) {
      console.error('[NativeScreenCapture] Failed to list displays:', error);
      return [];
    }
  }

  async startCapture(screenId) {
    try {
      // Generate unique capture ID
      this.captureId = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[NativeScreenCapture] Starting capture for screen ${screenId}`);
      await invoke('start_display_capture', {
        captureId: this.captureId,
        screenId: screenId
      });

      // Create video element for playback
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;

      // Create canvas for frame conversion
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      // Start polling for frames (30 FPS)
      this.updateInterval = setInterval(async () => {
        await this.updateFrame();
      }, 33);

      console.log('[NativeScreenCapture] Capture started successfully');
      return true;
    } catch (error) {
      console.error('[NativeScreenCapture] Failed to start capture:', error);
      return false;
    }
  }

  async updateFrame() {
    if (!this.captureId) return;

    try {
      const base64Frame = await invoke('get_display_frame', {
        captureId: this.captureId
      });

      if (base64Frame) {
        // Convert base64 JPEG to image and draw to canvas
        const img = new Image();
        img.onload = () => {
          if (!this.canvas) return;

          // Resize canvas if needed
          if (this.canvas.width !== img.width || this.canvas.height !== img.height) {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
          }

          this.ctx.drawImage(img, 0, 0);
        };
        img.src = `data:image/jpeg;base64,${base64Frame}`;
      }
    } catch (error) {
      // Silently handle errors during frame updates
      // (capture might be stopping)
    }
  }

  getCanvas() {
    return this.canvas;
  }

  getVideoElement() {
    return this.videoElement;
  }

  async stopCapture() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.captureId) {
      try {
        await invoke('stop_display_capture', {
          captureId: this.captureId
        });
        console.log('[NativeScreenCapture] Capture stopped');
      } catch (error) {
        console.error('[NativeScreenCapture] Failed to stop capture:', error);
      }
      this.captureId = null;
    }

    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
  }
}

export default NativeScreenCapture;
