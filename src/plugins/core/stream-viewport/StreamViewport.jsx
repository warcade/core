import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { editorActions } from '@/layout/stores/EditorStore';
import { viewportStore } from '@/panels/viewport/store';
import StreamStore, { CANVAS_WIDTH, CANVAS_HEIGHT } from './StreamStore.jsx';
import RecordingControls from './RecordingControls.jsx';
import { RustRenderer } from './RustRenderer.jsx';

export default function StreamViewport() {
  let canvasContainerRef;
  let canvasRef;
  let offscreenCanvas;
  let offscreenCtx;

  const [scale, setScale] = createSignal(0.5);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);
  const [dragStart, setDragStart] = createSignal(null);
  const [resizeHandle, setResizeHandle] = createSignal(null);
  const [videoElements, setVideoElements] = createSignal({});
  const [imageElements, setImageElements] = createSignal({});
  const [audioContexts, setAudioContexts] = createSignal({});
  const [mediaRecorder, setMediaRecorder] = createSignal(null);
  const [recordingDuration, setRecordingDuration] = createSignal('00:00');
  const [showAudioMeters, setShowAudioMeters] = createSignal(true);
  const [renderQuality, setRenderQuality] = createSignal('high'); // high or low
  const [useRustRenderer, setUseRustRenderer] = createSignal(false);
  const [rustRendererReady, setRustRendererReady] = createSignal(false);

  let rustRenderer = null;

  // Auto-select the stream-panel tab when this viewport loads
  onMount(async () => {
    editorActions.setScenePanelOpen(true);
    editorActions.setSelectedTool('stream-panel');

    // Create offscreen canvas for chroma key processing
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_WIDTH;
    offscreenCanvas.height = CANVAS_HEIGHT;
    offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Initialize Rust renderer
    try {
      rustRenderer = new RustRenderer();
      const initialized = await rustRenderer.init(CANVAS_WIDTH, CANVAS_HEIGHT);
      if (initialized) {
        setRustRendererReady(true);
        console.log('[StreamViewport] Rust renderer initialized successfully');
      } else {
        console.log('[StreamViewport] Rust renderer not available, using JavaScript rendering');
      }
    } catch (error) {
      console.log('[StreamViewport] Rust renderer failed to initialize:', error);
      console.log('[StreamViewport] Falling back to JavaScript rendering');
    }
  });

  onCleanup(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // Clean up video streams
    Object.values(videoElements()).forEach(video => {
      if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
      video.pause();
    });

    // Clean up audio contexts
    Object.values(audioContexts()).forEach(({ context }) => {
      context.close();
    });

    // Clean up native captures
    StreamStore.sources.forEach(source => {
      if (source.config.nativeCapture) {
        source.config.nativeCapture.stopCapture();
      }
    });

    // Clean up Rust renderer
    if (rustRenderer) {
      rustRenderer.cleanup();
    }
  });

  // Watch for viewport changes
  createEffect(() => {
    const activeTab = viewportStore.tabs.find(tab => tab.id === viewportStore.activeTabId);
    if (activeTab?.type === 'stream-viewport') {
      editorActions.setScenePanelOpen(true);
      editorActions.setSelectedTool('stream-panel');
    }
  });

  // Create video/image elements and audio analyzers for sources
  createEffect(() => {
    const sources = StreamStore.sources;
    const newVideoElements = {};
    const newImageElements = {};
    const newAudioContexts = {};

    sources.forEach(source => {
      if ((source.type === 'webcam' || source.type === 'display') && source.config.stream) {
        if (!videoElements()[source.id]) {
          const video = document.createElement('video');
          video.srcObject = source.config.stream;
          video.autoplay = true;
          video.muted = false;
          video.playsInline = true;
          video.volume = 0; // Don't play audio to speakers
          video.play().catch(err => console.error('Error playing video:', err));
          newVideoElements[source.id] = video;

          // Set up audio analyzer
          try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(video.srcObject);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            newAudioContexts[source.id] = {
              context: audioContext,
              analyser: analyser,
              dataArray: new Uint8Array(analyser.frequencyBinCount)
            };
          } catch (err) {
            console.error('Error setting up audio analyzer:', err);
          }
        } else {
          newVideoElements[source.id] = videoElements()[source.id];
          if (audioContexts()[source.id]) {
            newAudioContexts[source.id] = audioContexts()[source.id];
          }
        }
      }

      if (source.type === 'image' && source.config.imageData) {
        if (!imageElements()[source.id]) {
          const img = new Image();
          img.src = source.config.imageData;
          newImageElements[source.id] = img;
        } else {
          newImageElements[source.id] = imageElements()[source.id];
        }
      }

      if (source.type === 'video' && source.config.videoUrl) {
        if (!videoElements()[source.id]) {
          const video = document.createElement('video');
          video.src = source.config.videoUrl;
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.play().catch(err => console.error('Error playing video:', err));
          newVideoElements[source.id] = video;
        } else {
          newVideoElements[source.id] = videoElements()[source.id];
        }
      }
    });

    setVideoElements(newVideoElements);
    setImageElements(newImageElements);
    setAudioContexts(newAudioContexts);
  });

  // Chroma key function
  const applyChromaKey = (videoElement, source) => {
    if (!source.config.chromaKeyEnabled) {
      return videoElement;
    }

    const { x, y } = source.position;
    const { width, height } = source.size;

    // Draw video to offscreen canvas
    offscreenCtx.drawImage(videoElement, 0, 0, width, height);

    // Get image data
    const imageData = offscreenCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Parse chroma key color
    const keyColor = source.config.chromaKeyColor || '#00ff00';
    const r = parseInt(keyColor.substring(1, 3), 16);
    const g = parseInt(keyColor.substring(3, 5), 16);
    const b = parseInt(keyColor.substring(5, 7), 16);

    const similarity = source.config.chromaKeySimilarity || 0.4;
    const smoothness = source.config.chromaKeySmoothness || 0.1;

    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];

      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(pr - r, 2) +
        Math.pow(pg - g, 2) +
        Math.pow(pb - b, 2)
      ) / 441.6729559300637; // Normalize to 0-1

      // Apply alpha based on distance
      if (distance < similarity) {
        const alpha = Math.max(0, Math.min(1, (distance - similarity + smoothness) / smoothness));
        data[i + 3] = Math.floor(data[i + 3] * alpha);
      }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
    return offscreenCanvas;
  };

  // Advanced text rendering
  const renderAdvancedText = (ctx, source) => {
    const { x, y } = source.position;
    const { width, height } = source.size;
    const config = source.config;

    // Background
    if (config.backgroundColor && config.backgroundColor !== 'transparent') {
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(x, y, width, height);
    }

    // Set up text style
    let fontStyle = '';
    if (config.bold) fontStyle += 'bold ';
    if (config.italic) fontStyle += 'italic ';
    ctx.font = `${fontStyle}${config.fontSize || 48}px ${config.fontFamily || 'Arial'}`;

    // Text alignment
    const align = config.textAlign || 'left';
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    // Shadow
    if (config.shadowEnabled) {
      ctx.shadowColor = config.shadowColor || '#000000';
      ctx.shadowBlur = config.shadowBlur || 4;
      ctx.shadowOffsetX = config.shadowOffsetX || 2;
      ctx.shadowOffsetY = config.shadowOffsetY || 2;
    }

    // Calculate text position based on alignment
    let textX = x + 10;
    if (align === 'center') textX = x + width / 2;
    else if (align === 'right') textX = x + width - 10;

    // Gradient or solid color
    let gradient = null;
    if (config.gradientEnabled) {
      if (config.gradientDirection === 'horizontal') {
        gradient = ctx.createLinearGradient(x, y, x + width, y);
      } else if (config.gradientDirection === 'vertical') {
        gradient = ctx.createLinearGradient(x, y, y, y + height);
      } else {
        gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      }
      gradient.addColorStop(0, config.gradientColor1 || '#ff0000');
      gradient.addColorStop(1, config.gradientColor2 || '#0000ff');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = config.color || '#ffffff';
    }

    // Stroke/Outline
    if (config.strokeEnabled) {
      ctx.strokeStyle = config.strokeColor || '#000000';
      ctx.lineWidth = config.strokeWidth || 2;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
    }

    // Word wrap
    const words = (config.text || 'Text').split(' ');
    let line = '';
    const lineHeight = (config.fontSize || 48) * 1.2;
    let yPos = y + 10;

    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > width - 20 && line !== '') {
        // Draw the line
        if (config.strokeEnabled) {
          ctx.strokeText(line, textX, yPos);
        }
        ctx.fillText(line, textX, yPos);

        // Underline
        if (config.underline) {
          const lineMetrics = ctx.measureText(line);
          ctx.beginPath();
          ctx.strokeStyle = gradient || (config.color || '#ffffff');
          ctx.lineWidth = Math.max(1, (config.fontSize || 48) / 24);
          const underlineY = yPos + (config.fontSize || 48);
          if (align === 'left') {
            ctx.moveTo(textX, underlineY);
            ctx.lineTo(textX + lineMetrics.width, underlineY);
          } else if (align === 'center') {
            ctx.moveTo(textX - lineMetrics.width / 2, underlineY);
            ctx.lineTo(textX + lineMetrics.width / 2, underlineY);
          } else {
            ctx.moveTo(textX - lineMetrics.width, underlineY);
            ctx.lineTo(textX, underlineY);
          }
          ctx.stroke();
        }

        line = word + ' ';
        yPos += lineHeight;
      } else {
        line = testLine;
      }
    }

    // Draw last line
    if (line) {
      if (config.strokeEnabled) {
        ctx.strokeText(line, textX, yPos);
      }
      ctx.fillText(line, textX, yPos);

      if (config.underline) {
        const lineMetrics = ctx.measureText(line);
        ctx.beginPath();
        ctx.strokeStyle = gradient || (config.color || '#ffffff');
        ctx.lineWidth = Math.max(1, (config.fontSize || 48) / 24);
        const underlineY = yPos + (config.fontSize || 48);
        if (align === 'left') {
          ctx.moveTo(textX, underlineY);
          ctx.lineTo(textX + lineMetrics.width, underlineY);
        } else if (align === 'center') {
          ctx.moveTo(textX - lineMetrics.width / 2, underlineY);
          ctx.lineTo(textX + lineMetrics.width / 2, underlineY);
        } else {
          ctx.moveTo(textX - lineMetrics.width, underlineY);
          ctx.lineTo(textX, underlineY);
        }
        ctx.stroke();
      }
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // Animation loop for canvas rendering
  let animationFrameId;
  const renderCanvas = async () => {
    if (!canvasRef) return;

    const ctx = canvasRef.getContext('2d');

    // Try Rust rendering if enabled and ready
    if (useRustRenderer() && rustRendererReady && rustRenderer) {
      try {
        const success = await rustRenderer.renderFrame(StreamStore.sources, canvasRef);
        if (success) {
          // Rust rendering succeeded, continue to next frame
          animationFrameId = requestAnimationFrame(renderCanvas);
          return;
        }
        // If Rust rendering failed, fall through to JavaScript rendering
        console.log('[StreamViewport] Rust rendering failed, falling back to JavaScript');
      } catch (error) {
        console.error('[StreamViewport] Rust rendering error:', error);
        // Fall through to JavaScript rendering
      }
    }

    // JavaScript rendering
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Update audio levels (skip in low quality mode for performance)
    if (renderQuality() === 'high') {
      const audioCtxs = audioContexts();
      Object.keys(audioCtxs).forEach(sourceId => {
        const { analyser, dataArray } = audioCtxs[sourceId];
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const level = average / 255;
        StreamStore.setAudioLevel(parseInt(sourceId), level);
      });
    }

    // Draw sources
    StreamStore.sources.forEach(source => {
      if (!source.visible) return;

      ctx.save();

      const { x, y } = source.position;
      const { width, height } = source.size;

      switch (source.type) {
        case 'webcam':
        case 'display':
          // Check if it's a native capture (display only)
          if (source.type === 'display' && source.config.nativeCapture) {
            const canvas = source.config.nativeCapture.getCanvas();
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(canvas, x, y, width, height);
            } else {
              // Draw placeholder while waiting for first frame
              ctx.fillStyle = '#10b981';
              ctx.fillRect(x, y, width, height);
              ctx.fillStyle = '#ffffff';
              ctx.font = '48px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🖥️', x + width / 2, y + height / 2);
              ctx.font = '20px Arial';
              ctx.fillText('Loading Display...', x + width / 2, y + height / 2 + 40);
            }
          } else {
            // Regular video element (webcam or browser display capture)
            const video = videoElements()[source.id];
            if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
              // Skip expensive chroma key in low quality mode
              if (source.config.chromaKeyEnabled && source.type === 'webcam' && renderQuality() === 'high') {
                const processedVideo = applyChromaKey(video, source);
                ctx.drawImage(processedVideo, 0, 0, width, height, x, y, width, height);
              } else {
                ctx.drawImage(video, x, y, width, height);
              }

              // Audio meter (skip in low quality for performance)
              // Only show for video sources with audio
              if (showAudioMeters() && audioContexts()[source.id] && renderQuality() === 'high') {
                const level = StreamStore.audioLevels[source.id] || 0;
                const meterHeight = 10;
                const meterY = y + height - meterHeight - 5;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(x + 5, meterY, width - 10, meterHeight);

                const greenWidth = (width - 10) * 0.7;
                const yellowWidth = (width - 10) * 0.2;
                const redWidth = (width - 10) * 0.1;

                if (level > 0) {
                  const levelWidth = (width - 10) * level;
                  if (levelWidth <= greenWidth) {
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(x + 5, meterY, levelWidth, meterHeight);
                  } else if (levelWidth <= greenWidth + yellowWidth) {
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(x + 5, meterY, greenWidth, meterHeight);
                    ctx.fillStyle = '#eab308';
                    ctx.fillRect(x + 5 + greenWidth, meterY, levelWidth - greenWidth, meterHeight);
                  } else {
                    ctx.fillStyle = '#22c55e';
                    ctx.fillRect(x + 5, meterY, greenWidth, meterHeight);
                    ctx.fillStyle = '#eab308';
                    ctx.fillRect(x + 5 + greenWidth, meterY, yellowWidth, meterHeight);
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(x + 5 + greenWidth + yellowWidth, meterY, levelWidth - greenWidth - yellowWidth, meterHeight);
                  }
                }
              }
            } else {
              // Draw placeholder
              ctx.fillStyle = source.type === 'webcam' ? '#3b82f6' : '#10b981';
              ctx.fillRect(x, y, width, height);
              ctx.fillStyle = '#ffffff';
              ctx.font = '48px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(source.type === 'webcam' ? '📹' : '🖥️', x + width / 2, y + height / 2);
              ctx.font = '20px Arial';
              ctx.fillText(source.type === 'webcam' ? 'Webcam' : 'Display Capture', x + width / 2, y + height / 2 + 40);
            }
          }
          break;

        case 'image':
          const img = imageElements()[source.id];
          if (img && img.complete) {
            ctx.drawImage(img, x, y, width, height);
          } else {
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🖼️', x + width / 2, y + height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Loading...', x + width / 2, y + height / 2 + 40);
          }
          break;

        case 'video':
          const videoEl = videoElements()[source.id];
          if (videoEl && videoEl.readyState >= videoEl.HAVE_CURRENT_DATA) {
            // Skip expensive chroma key in low quality mode
            if (source.config.chromaKeyEnabled && renderQuality() === 'high') {
              const processedVideo = applyChromaKey(videoEl, source);
              ctx.drawImage(processedVideo, 0, 0, width, height, x, y, width, height);
            } else {
              ctx.drawImage(videoEl, x, y, width, height);
            }
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x, y, width, height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎬', x + width / 2, y + height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Loading...', x + width / 2, y + height / 2 + 40);
          }
          break;

        case 'text':
          renderAdvancedText(ctx, source);
          break;

        case 'browser':
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x, y, width, height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '48px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🌐', x + width / 2, y + height / 2);
          ctx.font = '20px Arial';
          ctx.fillText('Browser Source', x + width / 2, y + height / 2 + 40);
          if (source.config.url) {
            ctx.font = '14px Arial';
            ctx.fillText(source.config.url, x + width / 2, y + height / 2 + 65);
          }
          break;
      }

      // Draw selection highlight
      if (StreamStore.selectedSourceId === source.id) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);

        // Draw resize handles
        const handleSize = 8;
        ctx.fillStyle = '#3b82f6';

        // Corners
        ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);

        // Edges
        ctx.fillRect(x + width / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize);
      }

      // Draw locked icon
      if (source.locked) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('🔒', x + width - 10, y + 10);
      }

      ctx.restore();
    });

    animationFrameId = requestAnimationFrame(renderCanvas);
  };

  // Start rendering on mount
  createEffect(() => {
    renderCanvas();
  });

  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale();
    const y = (e.clientY - rect.top) / scale();

    // Check if clicking on a resize handle
    const selectedSource = StreamStore.selectedSource;
    if (selectedSource) {
      const handle = getResizeHandle(x, y, selectedSource);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setRenderQuality('low'); // Reduce quality while resizing
        setDragStart({ x, y, sourcePos: { ...selectedSource.position }, sourceSize: { ...selectedSource.size } });
        return;
      }
    }

    // Check if clicking on a source
    for (let i = StreamStore.sources.length - 1; i >= 0; i--) {
      const source = StreamStore.sources[i];
      if (!source.visible || source.locked) continue;

      const { x: sx, y: sy } = source.position;
      const { width: sw, height: sh } = source.size;

      if (x >= sx && x <= sx + sw && y >= sy && y <= sy + sh) {
        StreamStore.selectSource(source.id);
        setIsDragging(true);
        setRenderQuality('low'); // Reduce quality while dragging
        setDragStart({ x, y, sourcePos: { ...source.position } });
        return;
      }
    }

    // Clicked on empty space
    StreamStore.selectSource(null);
  };

  // Throttle mouse move for performance
  let lastMoveTime = 0;
  const handleCanvasMouseMove = (e) => {
    if (!isDragging() && !isResizing()) return;

    // Throttle to ~60fps max
    const now = Date.now();
    if (now - lastMoveTime < 16) return;
    lastMoveTime = now;

    const rect = canvasRef.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale();
    const y = (e.clientY - rect.top) / scale();

    const ds = dragStart();
    const selectedSource = StreamStore.selectedSource;
    if (!selectedSource) return;

    if (isDragging()) {
      const dx = x - ds.x;
      const dy = y - ds.y;
      StreamStore.moveSource(selectedSource.id, {
        x: Math.max(0, Math.min(CANVAS_WIDTH - selectedSource.size.width, ds.sourcePos.x + dx)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT - selectedSource.size.height, ds.sourcePos.y + dy))
      });
    } else if (isResizing()) {
      const handle = resizeHandle();
      const dx = x - ds.x;
      const dy = y - ds.y;

      let newPos = { ...ds.sourcePos };
      let newSize = { ...ds.sourceSize };

      switch (handle) {
        case 'nw':
          newPos.x = ds.sourcePos.x + dx;
          newPos.y = ds.sourcePos.y + dy;
          newSize.width = ds.sourceSize.width - dx;
          newSize.height = ds.sourceSize.height - dy;
          break;
        case 'ne':
          newPos.y = ds.sourcePos.y + dy;
          newSize.width = ds.sourceSize.width + dx;
          newSize.height = ds.sourceSize.height - dy;
          break;
        case 'sw':
          newPos.x = ds.sourcePos.x + dx;
          newSize.width = ds.sourceSize.width - dx;
          newSize.height = ds.sourceSize.height + dy;
          break;
        case 'se':
          newSize.width = ds.sourceSize.width + dx;
          newSize.height = ds.sourceSize.height + dy;
          break;
        case 'n':
          newPos.y = ds.sourcePos.y + dy;
          newSize.height = ds.sourceSize.height - dy;
          break;
        case 's':
          newSize.height = ds.sourceSize.height + dy;
          break;
        case 'w':
          newPos.x = ds.sourcePos.x + dx;
          newSize.width = ds.sourceSize.width - dx;
          break;
        case 'e':
          newSize.width = ds.sourceSize.width + dx;
          break;
      }

      // Enforce minimum size
      newSize.width = Math.max(50, newSize.width);
      newSize.height = Math.max(50, newSize.height);

      StreamStore.updateSource(selectedSource.id, { position: newPos, size: newSize });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
    setResizeHandle(null);
    setRenderQuality('high'); // Restore quality when done
  };

  const getResizeHandle = (x, y, source) => {
    const { x: sx, y: sy } = source.position;
    const { width: sw, height: sh } = source.size;
    const handleSize = 12;

    // Check corners
    if (Math.abs(x - sx) < handleSize && Math.abs(y - sy) < handleSize) return 'nw';
    if (Math.abs(x - (sx + sw)) < handleSize && Math.abs(y - sy) < handleSize) return 'ne';
    if (Math.abs(x - sx) < handleSize && Math.abs(y - (sy + sh)) < handleSize) return 'sw';
    if (Math.abs(x - (sx + sw)) < handleSize && Math.abs(y - (sy + sh)) < handleSize) return 'se';

    // Check edges
    if (Math.abs(x - (sx + sw / 2)) < handleSize && Math.abs(y - sy) < handleSize) return 'n';
    if (Math.abs(x - (sx + sw / 2)) < handleSize && Math.abs(y - (sy + sh)) < handleSize) return 's';
    if (Math.abs(x - sx) < handleSize && Math.abs(y - (sy + sh / 2)) < handleSize) return 'w';
    if (Math.abs(x - (sx + sw)) < handleSize && Math.abs(y - (sy + sh / 2)) < handleSize) return 'e';

    return null;
  };

  // Recording functions
  let recordingStartTime;
  let durationInterval;

  const startRecording = async () => {
    try {
      const stream = canvasRef.captureStream(30); // 30 FPS

      // Add audio tracks from sources if available
      const audioTracks = [];
      Object.values(videoElements()).forEach(video => {
        if (video.srcObject) {
          const tracks = video.srcObject.getAudioTracks();
          audioTracks.push(...tracks);
        }
      });

      audioTracks.forEach(track => stream.addTrack(track));

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stream-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      setMediaRecorder(recorder);
      StreamStore.setRecording(true);

      // Update duration
      recordingStartTime = Date.now();
      durationInterval = setInterval(() => {
        const elapsed = Date.now() - recordingStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        setRecordingDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    } catch (error) {
      alert('Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorder();
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      setMediaRecorder(null);
      StreamStore.setRecording(false);
      clearInterval(durationInterval);
      setRecordingDuration('00:00');
    }
  };

  return (
    <div class="h-full flex flex-col bg-base-200">
      {/* Toolbar */}
      <div class="p-4 bg-base-100 border-b border-base-300 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-4">
          <span class="font-semibold">Stream Viewport</span>
          <div class="badge badge-primary">{CANVAS_WIDTH}x{CANVAS_HEIGHT}</div>
          <div class="badge">{StreamStore.sources.length} sources</div>
          <Show when={StreamStore.activeScene}>
            <div class="badge badge-success">{StreamStore.activeScene.name}</div>
          </Show>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <Show when={rustRendererReady()}>
            <label class="label cursor-pointer gap-2">
              <span class="label-text text-sm">Rust Rendering</span>
              <input
                type="checkbox"
                class="toggle toggle-sm toggle-success"
                checked={useRustRenderer()}
                onChange={(e) => setUseRustRenderer(e.target.checked)}
              />
            </label>
            <div class="divider divider-horizontal"></div>
          </Show>

          <label class="label cursor-pointer gap-2">
            <span class="label-text text-sm">Audio Meters</span>
            <input
              type="checkbox"
              class="toggle toggle-sm"
              checked={showAudioMeters()}
              onChange={(e) => setShowAudioMeters(e.target.checked)}
            />
          </label>

          <div class="divider divider-horizontal"></div>

          <RecordingControls
            isRecording={StreamStore.isRecording}
            duration={recordingDuration()}
            onStart={startRecording}
            onStop={stopRecording}
          />

          <div class="divider divider-horizontal"></div>

          <span class="text-sm">Zoom:</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={scale()}
            onInput={(e) => setScale(parseFloat(e.target.value))}
            class="range range-sm w-32"
          />
          <span class="text-sm w-12">{Math.round(scale() * 100)}%</span>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasContainerRef}
        class="flex-1 overflow-auto bg-base-300 flex items-center justify-center p-8"
      >
        <div style={{ transform: `scale(${scale()})`, 'transform-origin': 'center' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            class="border-2 border-base-content/20 shadow-2xl cursor-move"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
      </div>

      {/* Info Bar */}
      <div class="p-2 bg-base-100 border-t border-base-300 text-xs text-base-content/60">
        <Show when={StreamStore.isRecording}>
          <span class="text-error font-semibold">RECORDING • </span>
        </Show>
        Click sources to select, drag to move, use handles to resize. Add sources from the Stream panel on the right.
      </div>
    </div>
  );
}
