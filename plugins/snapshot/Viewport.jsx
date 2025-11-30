import { createSignal, createEffect, onMount, onCleanup, Show } from 'solid-js';
import { IconPhoto, IconLoader2 } from '@tabler/icons-solidjs';
import { editorStore } from './store.jsx';

export default function Viewport() {
  let canvasRef;
  let overlayCanvasRef;
  let containerRef;
  let fileInputRef;

  const [isDragOver, setIsDragOver] = createSignal(false);
  const [isDrawing, setIsDrawing] = createSignal(false);
  const [lastPoint, setLastPoint] = createSignal(null);
  const [showNewDialog, setShowNewDialog] = createSignal(false);
  const [showExportDialog, setShowExportDialog] = createSignal(false);
  const [newCanvasWidth, setNewCanvasWidth] = createSignal(800);
  const [newCanvasHeight, setNewCanvasHeight] = createSignal(600);
  const [newCanvasBackground, setNewCanvasBackground] = createSignal('white');
  const [exportFormat, setExportFormat] = createSignal('png');
  const [exportQuality, setExportQuality] = createSignal(90);

  const state = editorStore.state;
  const setState = editorStore.setState;

  // Render composite to display canvas
  const renderCanvas = () => {
    if (!canvasRef) return;

    const { canvasWidth, canvasHeight } = state();
    canvasRef.width = canvasWidth;
    canvasRef.height = canvasHeight;

    const composite = editorStore.updateComposite();
    const ctx = canvasRef.getContext('2d');
    ctx.drawImage(composite, 0, 0);
  };

  // Initialize
  onMount(() => {
    renderCanvas();

    // Event handlers
    const newHandler = () => setShowNewDialog(true);
    const openHandler = () => handleOpen();
    const saveHandler = () => handleSave();
    const exportHandler = () => setShowExportDialog(true);
    const undoHandler = () => handleUndo();
    const redoHandler = () => handleRedo();
    const zoomHandler = (e) => handleZoom(e.detail.delta);
    const zoomResetHandler = () => handleZoomReset();
    const flipHandler = (e) => handleFlip(e.detail.direction);
    const rotateHandler = (e) => handleRotate(e.detail.angle);
    const filterHandler = (e) => handleFilter(e.detail.filter);
    const renderHandler = () => renderCanvas();

    window.addEventListener('snapshot:new', newHandler);
    window.addEventListener('snapshot:open', openHandler);
    window.addEventListener('snapshot:save', saveHandler);
    window.addEventListener('snapshot:export', exportHandler);
    window.addEventListener('snapshot:undo', undoHandler);
    window.addEventListener('snapshot:redo', redoHandler);
    window.addEventListener('snapshot:zoom', zoomHandler);
    window.addEventListener('snapshot:zoom-reset', zoomResetHandler);
    window.addEventListener('snapshot:flip', flipHandler);
    window.addEventListener('snapshot:rotate', rotateHandler);
    window.addEventListener('snapshot:filter', filterHandler);
    window.addEventListener('snapshot:render', renderHandler);
    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      window.removeEventListener('snapshot:new', newHandler);
      window.removeEventListener('snapshot:open', openHandler);
      window.removeEventListener('snapshot:save', saveHandler);
      window.removeEventListener('snapshot:export', exportHandler);
      window.removeEventListener('snapshot:undo', undoHandler);
      window.removeEventListener('snapshot:redo', redoHandler);
      window.removeEventListener('snapshot:zoom', zoomHandler);
      window.removeEventListener('snapshot:zoom-reset', zoomResetHandler);
      window.removeEventListener('snapshot:flip', flipHandler);
      window.removeEventListener('snapshot:rotate', rotateHandler);
      window.removeEventListener('snapshot:filter', filterHandler);
      window.removeEventListener('snapshot:render', renderHandler);
      window.removeEventListener('keydown', handleKeyDown);
    });
  });

  // Re-render when state changes
  createEffect(() => {
    const s = state();
    renderCanvas();
  });

  // Handle new canvas
  const handleNew = () => {
    editorStore.newCanvas(newCanvasWidth(), newCanvasHeight(), newCanvasBackground());
    setShowNewDialog(false);
    renderCanvas();
  };

  // Handle open file
  const handleOpen = () => {
    fileInputRef?.click();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, isLoading: true }));

    const reader = new FileReader();
    reader.onload = async (event) => {
      await editorStore.openImage(event.target.result);
      renderCanvas();
      setState(prev => ({ ...prev, isLoading: false }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    setState(prev => ({ ...prev, isLoading: true }));

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      await editorStore.loadImage(event.target.result, fileName);
      renderCanvas();
      setState(prev => ({ ...prev, isLoading: false }));
    };
    reader.readAsDataURL(file);
  };

  // Handle save
  const handleSave = () => {
    const dataUrl = editorStore.exportImage('png');
    const link = document.createElement('a');
    link.download = 'snapshot-image.png';
    link.href = dataUrl;
    link.click();
  };

  // Handle export
  const handleExport = () => {
    const dataUrl = editorStore.exportImage(exportFormat(), exportQuality() / 100);
    const link = document.createElement('a');
    link.download = `snapshot-image.${exportFormat()}`;
    link.href = dataUrl;
    link.click();
    setShowExportDialog(false);
  };

  // Handle undo/redo
  const handleUndo = async () => {
    await editorStore.undo();
    renderCanvas();
  };

  const handleRedo = async () => {
    await editorStore.redo();
    renderCanvas();
  };

  // Handle zoom
  const handleZoom = (delta) => {
    editorStore.setZoom(state().zoom + delta);
  };

  const handleZoomReset = () => {
    editorStore.setZoom(1);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
    }
  };

  // Handle transforms
  const handleFlip = (direction) => {
    if (direction === 'horizontal') {
      editorStore.flipHorizontal();
    } else {
      editorStore.flipVertical();
    }
    renderCanvas();
  };

  const handleRotate = (angle) => {
    editorStore.rotate(angle);
    renderCanvas();
  };

  // Handle filters
  const handleFilter = (filterName) => {
    editorStore.applyFilter(filterName);
    renderCanvas();
  };

  // Get canvas coordinates from mouse event
  const getCanvasCoords = (e) => {
    if (!canvasRef) return null;

    const rect = canvasRef.getBoundingClientRect();
    const zoom = state().zoom;

    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  // Drawing handlers
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const tool = state().tool;

    if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') {
      setIsDrawing(true);
      setLastPoint(coords);
      drawPoint(coords);
    } else if (tool === 'fill') {
      floodFill(Math.floor(coords.x), Math.floor(coords.y));
    } else if (tool === 'eyedropper') {
      pickColor(coords);
    }
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    // Update cursor preview on overlay
    updateCursorPreview(coords);

    if (isDrawing()) {
      drawLine(lastPoint(), coords);
      setLastPoint(coords);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing()) {
      setIsDrawing(false);
      setLastPoint(null);
      editorStore.saveHistory(state().tool === 'eraser' ? 'Eraser' : 'Brush');
      renderCanvas();
    }
  };

  const handleMouseLeave = () => {
    clearCursorPreview();
    if (isDrawing()) {
      setIsDrawing(false);
      setLastPoint(null);
      editorStore.saveHistory(state().tool === 'eraser' ? 'Eraser' : 'Brush');
      renderCanvas();
    }
  };

  // Draw a single point
  const drawPoint = (point) => {
    const layer = editorStore.getActiveLayer();
    if (!layer) return;

    const { brushSize, brushOpacity, color, tool } = state();
    const ctx = layer.ctx;

    ctx.globalAlpha = brushOpacity;
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,0)' : color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    renderCanvas();
  };

  // Draw a line between two points
  const drawLine = (from, to) => {
    const layer = editorStore.getActiveLayer();
    if (!layer) return;

    const { brushSize, brushOpacity, color, tool } = state();
    const ctx = layer.ctx;

    ctx.globalAlpha = brushOpacity;
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    renderCanvas();
  };

  // Flood fill
  const floodFill = (startX, startY) => {
    const layer = editorStore.getActiveLayer();
    if (!layer) return;

    const { color } = state();
    const imageData = layer.getImageData();
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Get target color
    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    // Parse fill color
    const fillColor = hexToRgb(color);
    if (!fillColor) return;

    // Don't fill if same color
    if (targetR === fillColor.r && targetG === fillColor.g && targetB === fillColor.b) return;

    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const idx = (y * width + x) * 4;

      if (data[idx] !== targetR || data[idx + 1] !== targetG ||
          data[idx + 2] !== targetB || data[idx + 3] !== targetA) continue;

      visited.add(key);

      data[idx] = fillColor.r;
      data[idx + 1] = fillColor.g;
      data[idx + 2] = fillColor.b;
      data[idx + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    layer.putImageData(imageData);
    editorStore.saveHistory('Fill');
    renderCanvas();
  };

  // Pick color from canvas
  const pickColor = (coords) => {
    const layer = editorStore.getActiveLayer();
    if (!layer) return;

    const imageData = layer.ctx.getImageData(Math.floor(coords.x), Math.floor(coords.y), 1, 1);
    const [r, g, b] = imageData.data;

    const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    editorStore.setColor(hex);
  };

  // Cursor preview
  const updateCursorPreview = (coords) => {
    if (!overlayCanvasRef) return;

    const { canvasWidth, canvasHeight, brushSize, tool } = state();
    overlayCanvasRef.width = canvasWidth;
    overlayCanvasRef.height = canvasHeight;

    const ctx = overlayCanvasRef.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (tool === 'brush' || tool === 'pencil' || tool === 'eraser') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const clearCursorPreview = () => {
    if (!overlayCanvasRef) return;
    const ctx = overlayCanvasRef.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvasRef.width, overlayCanvasRef.height);
  };

  // Keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
        case 's':
          e.preventDefault();
          if (e.shiftKey) {
            setShowExportDialog(true);
          } else {
            handleSave();
          }
          break;
        case 'n':
          e.preventDefault();
          setShowNewDialog(true);
          break;
        case 'o':
          e.preventDefault();
          handleOpen();
          break;
      }
    }
  };

  // Helper functions
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getCursorForTool = (tool) => {
    switch (tool) {
      case 'pan': return 'grab';
      case 'zoom': return 'zoom-in';
      case 'eyedropper': return 'crosshair';
      case 'text': return 'text';
      case 'move': return 'move';
      default: return 'crosshair';
    }
  };

  return (
    <div class="w-full h-full flex flex-col bg-base-300 overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        class="hidden"
        onChange={handleFileSelect}
      />

      {/* Status bar */}
      <div class="flex items-center justify-between px-3 py-1 bg-base-200 border-b border-base-300 text-xs">
        <div class="flex items-center gap-4">
          <span class="text-base-content/60">
            {state().canvasWidth} x {state().canvasHeight} px
          </span>
          <span class="text-base-content/60">
            Zoom: {Math.round(state().zoom * 100)}%
          </span>
          <span class="text-base-content/60 capitalize">
            Tool: {state().tool}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <Show when={state().isLoading}>
            <IconLoader2 class="w-4 h-4 animate-spin text-primary" />
          </Show>
        </div>
      </div>

      {/* Canvas container */}
      <div
        ref={containerRef}
        class={`flex-1 overflow-auto bg-base-300 flex items-center justify-center p-8 relative ${isDragOver() ? 'ring-4 ring-primary ring-inset' : ''}`}
        style={{
          "background-image": "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
          "background-size": "20px 20px",
          "background-position": "0 0, 0 10px, 10px -10px, -10px 0px"
        }}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop overlay */}
        <Show when={isDragOver()}>
          <div class="absolute inset-0 bg-primary/20 flex items-center justify-center z-50 pointer-events-none">
            <div class="bg-base-200 px-6 py-4 rounded-lg shadow-xl">
              <p class="text-lg font-medium">Drop image to add as layer</p>
            </div>
          </div>
        </Show>

        <div
          class="relative shadow-2xl"
          style={{
            transform: `scale(${state().zoom})`,
            "transform-origin": "center center"
          }}
        >
          {/* Main canvas */}
          <canvas
            ref={canvasRef}
            class="bg-white"
            style={{ cursor: getCursorForTool(state().tool) }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />

          {/* Overlay canvas for cursor preview */}
          <canvas
            ref={overlayCanvasRef}
            class="absolute top-0 left-0 pointer-events-none"
          />
        </div>
      </div>

      {/* New Canvas Dialog */}
      <Show when={showNewDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-base-200 rounded-lg shadow-xl p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">New Canvas</h3>

            <div class="space-y-4">
              <div class="flex gap-4">
                <div class="flex-1">
                  <label class="label text-sm">Width</label>
                  <input
                    type="number"
                    class="input input-bordered input-sm w-full"
                    value={newCanvasWidth()}
                    onInput={(e) => setNewCanvasWidth(parseInt(e.target.value) || 800)}
                    min="1"
                    max="8000"
                  />
                </div>
                <div class="flex-1">
                  <label class="label text-sm">Height</label>
                  <input
                    type="number"
                    class="input input-bordered input-sm w-full"
                    value={newCanvasHeight()}
                    onInput={(e) => setNewCanvasHeight(parseInt(e.target.value) || 600)}
                    min="1"
                    max="8000"
                  />
                </div>
              </div>

              <div>
                <label class="label text-sm">Background</label>
                <select
                  class="select select-bordered select-sm w-full"
                  value={newCanvasBackground()}
                  onChange={(e) => setNewCanvasBackground(e.target.value)}
                >
                  <option value="white">White</option>
                  <option value="black">Black</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>

              <div class="flex justify-end gap-2 mt-6">
                <button class="btn btn-ghost btn-sm" onClick={() => setShowNewDialog(false)}>
                  Cancel
                </button>
                <button class="btn btn-primary btn-sm" onClick={handleNew}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Export Dialog */}
      <Show when={showExportDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-base-200 rounded-lg shadow-xl p-6 w-96">
            <h3 class="text-lg font-semibold mb-4">Export Image</h3>

            <div class="space-y-4">
              <div>
                <label class="label text-sm">Format</label>
                <select
                  class="select select-bordered select-sm w-full"
                  value={exportFormat()}
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              <Show when={exportFormat() !== 'png'}>
                <div>
                  <label class="label text-sm">Quality: {exportQuality()}%</label>
                  <input
                    type="range"
                    class="range range-primary range-sm"
                    min="10"
                    max="100"
                    value={exportQuality()}
                    onInput={(e) => setExportQuality(parseInt(e.target.value))}
                  />
                </div>
              </Show>

              <div class="flex justify-end gap-2 mt-6">
                <button class="btn btn-ghost btn-sm" onClick={() => setShowExportDialog(false)}>
                  Cancel
                </button>
                <button class="btn btn-primary btn-sm" onClick={handleExport}>
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
