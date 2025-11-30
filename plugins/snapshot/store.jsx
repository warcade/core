import { createSignal, createEffect } from 'solid-js';

// Layer class to manage individual layers
class Layer {
  constructor(id, name, width, height) {
    this.id = id;
    this.name = name;
    this.visible = true;
    this.opacity = 1;
    this.blendMode = 'source-over';

    // Create offscreen canvas for this layer
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(width, height) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.putImageData(imageData, 0, 0);
  }

  getImageData() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  putImageData(imageData) {
    this.ctx.putImageData(imageData, 0, 0);
  }

  clone() {
    const newLayer = new Layer(this.id + '_clone', this.name + ' copy', this.canvas.width, this.canvas.height);
    newLayer.visible = this.visible;
    newLayer.opacity = this.opacity;
    newLayer.blendMode = this.blendMode;
    newLayer.ctx.drawImage(this.canvas, 0, 0);
    return newLayer;
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  async loadFromDataURL(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.src = dataUrl;
    });
  }
}

// History entry for undo/redo
class HistoryEntry {
  constructor(action, layersSnapshot, canvasWidth, canvasHeight) {
    this.action = action;
    this.timestamp = Date.now();
    this.layersSnapshot = layersSnapshot; // Array of { id, name, visible, opacity, blendMode, dataUrl }
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }
}

// Main editor store
class EditorStore {
  constructor() {
    // Reactive signals
    const [state, setState] = createSignal({
      tool: 'brush',
      color: '#000000',
      secondaryColor: '#ffffff',
      brushSize: 10,
      brushOpacity: 1,
      brushHardness: 0.8,
      zoom: 1,
      panX: 0,
      panY: 0,
      canvasWidth: 800,
      canvasHeight: 600,
      activeLayerId: null,
      isLoading: false,
      canUndo: false,
      canRedo: false,
    });

    this.state = state;
    this.setState = setState;

    // Non-reactive state
    this.layers = [];
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    // Composite canvas for final output
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d');

    // Initialize with a background layer
    this.initDefaultCanvas();
  }

  initDefaultCanvas() {
    const { canvasWidth, canvasHeight } = this.state();
    this.compositeCanvas.width = canvasWidth;
    this.compositeCanvas.height = canvasHeight;

    // Create background layer
    const bgLayer = new Layer('background', 'Background', canvasWidth, canvasHeight);
    bgLayer.ctx.fillStyle = '#ffffff';
    bgLayer.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    this.layers = [bgLayer];
    this.setState(prev => ({ ...prev, activeLayerId: 'background' }));

    this.saveHistory('New Canvas');
  }

  // Get active layer
  getActiveLayer() {
    const { activeLayerId } = this.state();
    return this.layers.find(l => l.id === activeLayerId) || this.layers[0];
  }

  // Get layer by ID
  getLayer(id) {
    return this.layers.find(l => l.id === id);
  }

  // Set active layer
  setActiveLayer(id) {
    this.setState(prev => ({ ...prev, activeLayerId: id }));
  }

  // Add new layer
  addLayer(name, options = {}) {
    const { canvasWidth, canvasHeight } = this.state();
    const id = 'layer_' + Date.now();
    const layer = new Layer(id, name || `Layer ${this.layers.length + 1}`, canvasWidth, canvasHeight);

    if (options.dataUrl) {
      layer.loadFromDataURL(options.dataUrl).then(() => {
        this.updateComposite();
      });
    }

    this.layers.push(layer);
    this.setState(prev => ({ ...prev, activeLayerId: id }));
    this.saveHistory('Add Layer');
    return layer;
  }

  // Remove layer
  removeLayer(id) {
    if (this.layers.length <= 1) return false;

    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return false;

    this.layers.splice(index, 1);

    const { activeLayerId } = this.state();
    if (activeLayerId === id) {
      this.setState(prev => ({ ...prev, activeLayerId: this.layers[0]?.id }));
    }

    this.saveHistory('Remove Layer');
    return true;
  }

  // Move layer
  moveLayer(id, direction) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= this.layers.length) return;

    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(newIndex, 0, layer);
    this.saveHistory('Reorder Layers');
  }

  // Merge layer down
  mergeLayerDown(id) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index <= 0) return;

    const topLayer = this.layers[index];
    const bottomLayer = this.layers[index - 1];

    bottomLayer.ctx.globalAlpha = topLayer.opacity;
    bottomLayer.ctx.globalCompositeOperation = topLayer.blendMode;
    bottomLayer.ctx.drawImage(topLayer.canvas, 0, 0);
    bottomLayer.ctx.globalAlpha = 1;
    bottomLayer.ctx.globalCompositeOperation = 'source-over';

    this.layers.splice(index, 1);
    this.setState(prev => ({ ...prev, activeLayerId: bottomLayer.id }));
    this.saveHistory('Merge Layers');
  }

  // Update composite canvas
  updateComposite() {
    const { canvasWidth, canvasHeight } = this.state();
    this.compositeCanvas.width = canvasWidth;
    this.compositeCanvas.height = canvasHeight;

    // Clear
    this.compositeCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw layers from bottom to top
    for (const layer of this.layers) {
      if (!layer.visible) continue;

      this.compositeCtx.globalAlpha = layer.opacity;
      this.compositeCtx.globalCompositeOperation = layer.blendMode;
      this.compositeCtx.drawImage(layer.canvas, 0, 0);
    }

    this.compositeCtx.globalAlpha = 1;
    this.compositeCtx.globalCompositeOperation = 'source-over';

    return this.compositeCanvas;
  }

  // Save history snapshot
  saveHistory(action) {
    // Create snapshots of all layers
    const layersSnapshot = this.layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      dataUrl: layer.toDataURL()
    }));

    const { canvasWidth, canvasHeight } = this.state();
    const entry = new HistoryEntry(action, layersSnapshot, canvasWidth, canvasHeight);

    // Remove any history after current index (when undoing then making changes)
    this.history = this.history.slice(0, this.historyIndex + 1);

    // Add new entry
    this.history.push(entry);
    this.historyIndex = this.history.length - 1;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateUndoRedoState();
  }

  updateUndoRedoState() {
    this.setState(prev => ({
      ...prev,
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1
    }));
  }

  // Undo
  async undo() {
    if (this.historyIndex <= 0) return false;

    this.historyIndex--;
    await this.restoreHistory(this.history[this.historyIndex]);
    this.updateUndoRedoState();
    return true;
  }

  // Redo
  async redo() {
    if (this.historyIndex >= this.history.length - 1) return false;

    this.historyIndex++;
    await this.restoreHistory(this.history[this.historyIndex]);
    this.updateUndoRedoState();
    return true;
  }

  // Restore from history entry
  async restoreHistory(entry) {
    this.setState(prev => ({
      ...prev,
      canvasWidth: entry.canvasWidth,
      canvasHeight: entry.canvasHeight
    }));

    // Recreate layers from snapshot
    this.layers = [];
    for (const snapshot of entry.layersSnapshot) {
      const layer = new Layer(snapshot.id, snapshot.name, entry.canvasWidth, entry.canvasHeight);
      layer.visible = snapshot.visible;
      layer.opacity = snapshot.opacity;
      layer.blendMode = snapshot.blendMode;
      await layer.loadFromDataURL(snapshot.dataUrl);
      this.layers.push(layer);
    }

    // Ensure active layer exists
    const { activeLayerId } = this.state();
    if (!this.layers.find(l => l.id === activeLayerId)) {
      this.setState(prev => ({ ...prev, activeLayerId: this.layers[0]?.id }));
    }
  }

  // Get history list for UI
  getHistoryList() {
    return this.history.map((entry, i) => ({
      action: entry.action,
      timestamp: entry.timestamp,
      current: i === this.historyIndex
    }));
  }

  // New canvas
  newCanvas(width, height, background = 'white') {
    this.setState(prev => ({
      ...prev,
      canvasWidth: width,
      canvasHeight: height
    }));

    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;

    const bgLayer = new Layer('background', 'Background', width, height);
    if (background === 'white') {
      bgLayer.ctx.fillStyle = '#ffffff';
      bgLayer.ctx.fillRect(0, 0, width, height);
    } else if (background === 'black') {
      bgLayer.ctx.fillStyle = '#000000';
      bgLayer.ctx.fillRect(0, 0, width, height);
    }
    // transparent = do nothing

    this.layers = [bgLayer];
    this.history = [];
    this.historyIndex = -1;
    this.setState(prev => ({ ...prev, activeLayerId: 'background' }));
    this.saveHistory('New Canvas');
  }

  // Load image as new layer
  async loadImage(dataUrl, name = 'Image') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // If this is the first real image, resize canvas to fit
        if (this.layers.length === 1 && this.state().canvasWidth === 800 && this.state().canvasHeight === 600) {
          this.setState(prev => ({
            ...prev,
            canvasWidth: img.width,
            canvasHeight: img.height
          }));
          this.compositeCanvas.width = img.width;
          this.compositeCanvas.height = img.height;

          // Resize existing layers
          for (const layer of this.layers) {
            layer.canvas.width = img.width;
            layer.canvas.height = img.height;
            layer.ctx.fillStyle = '#ffffff';
            layer.ctx.fillRect(0, 0, img.width, img.height);
          }
        }

        const layer = this.addLayer(name);
        layer.canvas.width = img.width;
        layer.canvas.height = img.height;
        layer.ctx.drawImage(img, 0, 0);

        resolve(layer);
      };
      img.src = dataUrl;
    });
  }

  // Open image (replace all)
  async openImage(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.setState(prev => ({
          ...prev,
          canvasWidth: img.width,
          canvasHeight: img.height
        }));

        this.compositeCanvas.width = img.width;
        this.compositeCanvas.height = img.height;

        const bgLayer = new Layer('background', 'Background', img.width, img.height);
        bgLayer.ctx.drawImage(img, 0, 0);

        this.layers = [bgLayer];
        this.history = [];
        this.historyIndex = -1;
        this.setState(prev => ({ ...prev, activeLayerId: 'background' }));
        this.saveHistory('Open Image');

        resolve();
      };
      img.src = dataUrl;
    });
  }

  // Export as data URL
  exportImage(format = 'png', quality = 0.9) {
    this.updateComposite();
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    return this.compositeCanvas.toDataURL(mimeType, quality);
  }

  // Tool setters
  setTool(tool) {
    this.setState(prev => ({ ...prev, tool }));
  }

  setColor(color) {
    this.setState(prev => ({ ...prev, color }));
  }

  setSecondaryColor(color) {
    this.setState(prev => ({ ...prev, secondaryColor: color }));
  }

  swapColors() {
    this.setState(prev => ({
      ...prev,
      color: prev.secondaryColor,
      secondaryColor: prev.color
    }));
  }

  setBrushSize(size) {
    this.setState(prev => ({ ...prev, brushSize: size }));
  }

  setBrushOpacity(opacity) {
    this.setState(prev => ({ ...prev, brushOpacity: opacity }));
  }

  setZoom(zoom) {
    this.setState(prev => ({ ...prev, zoom: Math.max(0.1, Math.min(5, zoom)) }));
  }

  // Apply filter to active layer
  applyFilter(filterName, options = {}) {
    const layer = this.getActiveLayer();
    if (!layer) return;

    const imageData = layer.getImageData();
    const data = imageData.data;

    switch (filterName) {
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = data[i + 1] = data[i + 2] = gray;
        }
        break;

      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        }
        break;

      case 'invert':
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        break;

      case 'brightness':
        const brightness = options.value || 0; // -100 to 100
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, data[i] + brightness * 2.55));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness * 2.55));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness * 2.55));
        }
        break;

      case 'contrast':
        const contrast = (options.value || 0) / 100; // -100 to 100
        const factor = (1 + contrast) / (1 - contrast);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
          data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
          data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
        }
        break;

      case 'saturation':
        const sat = (options.value || 0) / 100 + 1; // -100 to 100 -> 0 to 2
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = Math.max(0, Math.min(255, gray + sat * (data[i] - gray)));
          data[i + 1] = Math.max(0, Math.min(255, gray + sat * (data[i + 1] - gray)));
          data[i + 2] = Math.max(0, Math.min(255, gray + sat * (data[i + 2] - gray)));
        }
        break;

      case 'blur':
        this.applyConvolution(imageData, [
          1/9, 1/9, 1/9,
          1/9, 1/9, 1/9,
          1/9, 1/9, 1/9
        ]);
        break;

      case 'sharpen':
        this.applyConvolution(imageData, [
          0, -1, 0,
          -1, 5, -1,
          0, -1, 0
        ]);
        break;

      case 'emboss':
        this.applyConvolution(imageData, [
          -2, -1, 0,
          -1, 1, 1,
          0, 1, 2
        ]);
        break;

      case 'edge':
        this.applyConvolution(imageData, [
          -1, -1, -1,
          -1, 8, -1,
          -1, -1, -1
        ]);
        break;
    }

    layer.putImageData(imageData);
    this.saveHistory(filterName.charAt(0).toUpperCase() + filterName.slice(1));
  }

  // Apply convolution kernel
  applyConvolution(imageData, kernel) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const copy = new Uint8ClampedArray(data);

    const kSize = Math.sqrt(kernel.length);
    const half = Math.floor(kSize / 2);

    for (let y = half; y < h - half; y++) {
      for (let x = half; x < w - half; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const i = (py * w + px) * 4;
            const k = kernel[ky * kSize + kx];

            r += copy[i] * k;
            g += copy[i + 1] * k;
            b += copy[i + 2] * k;
          }
        }

        const i = (y * w + x) * 4;
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }
    }
  }

  // Transform operations
  flipHorizontal() {
    const layer = this.getActiveLayer();
    if (!layer) return;

    const imageData = layer.getImageData();
    const { width, height } = imageData;

    layer.ctx.save();
    layer.ctx.clearRect(0, 0, width, height);
    layer.ctx.scale(-1, 1);
    layer.ctx.drawImage(layer.canvas, -width, 0);
    layer.ctx.restore();

    // Actually need to use temp canvas
    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tempCtx = temp.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    layer.ctx.clearRect(0, 0, width, height);
    layer.ctx.save();
    layer.ctx.scale(-1, 1);
    layer.ctx.drawImage(temp, -width, 0);
    layer.ctx.restore();

    this.saveHistory('Flip Horizontal');
  }

  flipVertical() {
    const layer = this.getActiveLayer();
    if (!layer) return;

    const imageData = layer.getImageData();
    const { width, height } = imageData;

    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tempCtx = temp.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    layer.ctx.clearRect(0, 0, width, height);
    layer.ctx.save();
    layer.ctx.scale(1, -1);
    layer.ctx.drawImage(temp, 0, -height);
    layer.ctx.restore();

    this.saveHistory('Flip Vertical');
  }

  rotate(degrees) {
    const layer = this.getActiveLayer();
    if (!layer) return;

    const { width, height } = layer.canvas;
    const imageData = layer.getImageData();

    const temp = document.createElement('canvas');
    temp.width = width;
    temp.height = height;
    const tempCtx = temp.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // For 90/270 degrees, swap dimensions
    if (degrees === 90 || degrees === -90 || degrees === 270) {
      layer.canvas.width = height;
      layer.canvas.height = width;

      // Update canvas dimensions in state if this is the only layer or all layers
      if (this.layers.length === 1) {
        this.setState(prev => ({
          ...prev,
          canvasWidth: height,
          canvasHeight: width
        }));
      }
    }

    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.save();
    layer.ctx.translate(layer.canvas.width / 2, layer.canvas.height / 2);
    layer.ctx.rotate(degrees * Math.PI / 180);
    layer.ctx.drawImage(temp, -width / 2, -height / 2);
    layer.ctx.restore();

    this.saveHistory(`Rotate ${degrees}°`);
  }
}

// Create singleton instance
export const editorStore = new EditorStore();

// Export helper for toolbar
export const selectTool = (toolId) => {
  editorStore.setTool(toolId);
};
