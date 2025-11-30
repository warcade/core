import { createPlugin } from '@/api/plugin';
import {
  IconPhoto,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDeviceFloppy,
  IconFolderOpen,
  IconFilePlus,
  IconDownload,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconFlipHorizontal,
  IconFlipVertical,
  IconRotate,
  IconRotateClockwise,
  IconPointer,
  IconBrush,
  IconPencil,
  IconEraser,
  IconColorPicker,
  IconPaint,
  IconGradient,
  IconCrop,
  IconTypography,
  IconWand,
  IconHandMove,
  IconBandage,
  IconStamp,
  IconRectangle,
  IconOval,
  IconLine,
  IconPolygon,
  IconArrowsMove,
  IconMarquee,
  IconLasso
} from '@tabler/icons-solidjs';

import Viewport from './Viewport.jsx';
import ToolPanel from './ToolPanel.jsx';
import PropertiesPanel from './PropertiesPanel.jsx';
import HistoryPanel from './HistoryPanel.jsx';
import { selectTool, editorStore } from './store.jsx';

// Tool definitions
const tools = [
  // Selection tools
  { id: 'select', name: 'Select', icon: IconPointer, group: 'snapshot-selection', shortcut: 'V', order: 10 },
  { id: 'marquee', name: 'Rectangle Select', icon: IconMarquee, group: 'snapshot-selection', shortcut: 'M', order: 20 },
  { id: 'lasso', name: 'Lasso Select', icon: IconLasso, group: 'snapshot-selection', shortcut: 'L', order: 30 },
  { id: 'magic-wand', name: 'Magic Wand', icon: IconWand, group: 'snapshot-selection', shortcut: 'W', order: 40 },

  // Navigation tools
  { id: 'pan', name: 'Hand/Pan', icon: IconHandMove, group: 'snapshot-nav', shortcut: 'H', order: 10 },

  // Paint tools
  { id: 'brush', name: 'Brush', icon: IconBrush, group: 'snapshot-paint', shortcut: 'B', order: 10 },
  { id: 'pencil', name: 'Pencil', icon: IconPencil, group: 'snapshot-paint', shortcut: 'N', order: 20 },
  { id: 'eraser', name: 'Eraser', icon: IconEraser, group: 'snapshot-paint', shortcut: 'E', order: 30 },
  { id: 'fill', name: 'Paint Bucket', icon: IconPaint, group: 'snapshot-paint', shortcut: 'G', order: 40 },
  { id: 'gradient', name: 'Gradient', icon: IconGradient, group: 'snapshot-paint', shortcut: 'G', order: 50 },
  { id: 'eyedropper', name: 'Eyedropper', icon: IconColorPicker, group: 'snapshot-paint', shortcut: 'I', order: 60 },

  // Transform tools
  { id: 'crop', name: 'Crop', icon: IconCrop, group: 'snapshot-transform', shortcut: 'C', order: 50 },
  { id: 'move', name: 'Move', icon: IconArrowsMove, group: 'snapshot-transform', shortcut: 'V', order: 60 },

  // Shape tools
  { id: 'rectangle', name: 'Rectangle', icon: IconRectangle, group: 'snapshot-shapes', shortcut: 'U', order: 10 },
  { id: 'ellipse', name: 'Ellipse', icon: IconOval, group: 'snapshot-shapes', shortcut: 'U', order: 20 },
  { id: 'line', name: 'Line', icon: IconLine, group: 'snapshot-shapes', shortcut: 'U', order: 30 },
  { id: 'polygon', name: 'Polygon', icon: IconPolygon, group: 'snapshot-shapes', shortcut: 'U', order: 40 },

  // Text tool
  { id: 'text', name: 'Text', icon: IconTypography, group: 'snapshot-shapes', shortcut: 'T', order: 50 },

  // Retouch tools
  { id: 'heal', name: 'Spot Healing', icon: IconBandage, group: 'snapshot-retouch', shortcut: 'J', order: 10 },
  { id: 'clone', name: 'Clone Stamp', icon: IconStamp, group: 'snapshot-retouch', shortcut: 'S', order: 20 },
];

export default createPlugin({
  id: 'snapshot',
  name: 'Snapshot',
  version: '1.0.0',
  description: 'Professional photo editor with layers, filters, and advanced tools',
  author: 'WebArcade Team',

  async onStart(api) {
    console.log('[Snapshot] Starting photo editor plugin...');

    // Register main viewport
    api.viewport('snapshot-editor', {
      label: 'Snapshot',
      component: Viewport,
      icon: IconPhoto,
      description: 'Professional photo editor'
    });

    // Register left panel (Colors & Brush Settings)
    api.leftPanel({
      component: ToolPanel,
      viewport: 'snapshot-editor'
    });

    // Register right panel (Properties/Adjustments)
    api.rightPanel({
      component: PropertiesPanel,
      viewport: 'snapshot-editor'
    });

    // Register bottom panel (History)
    api.bottomTab('snapshot-history', {
      title: 'History',
      component: HistoryPanel,
      viewport: 'snapshot-editor',
      order: 10
    });

    // === TOOLBAR GROUPS ===

    api.toolbarGroup('snapshot-file', { order: 10, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-edit', { order: 20, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-view', { order: 30, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-selection', { order: 40, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-nav', { order: 50, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-paint', { order: 60, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-transform', { order: 70, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-shapes', { order: 80, viewport: 'snapshot-editor' });
    api.toolbarGroup('snapshot-retouch', { order: 90, viewport: 'snapshot-editor' });

    // === FILE TOOLBAR BUTTONS ===

    api.toolbar('snapshot-new', {
      icon: IconFilePlus,
      tooltip: 'New Canvas (Ctrl+N)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:new')),
      group: 'snapshot-file',
      order: 10,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-open', {
      icon: IconFolderOpen,
      tooltip: 'Open Image (Ctrl+O)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:open')),
      group: 'snapshot-file',
      order: 20,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-save', {
      icon: IconDeviceFloppy,
      tooltip: 'Save Image (Ctrl+S)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:save')),
      group: 'snapshot-file',
      order: 30,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-export', {
      icon: IconDownload,
      tooltip: 'Export Image (Ctrl+Shift+S)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:export')),
      group: 'snapshot-file',
      order: 40,
      viewport: 'snapshot-editor'
    });

    // === EDIT TOOLBAR BUTTONS ===

    api.toolbar('snapshot-undo', {
      icon: IconArrowBackUp,
      tooltip: 'Undo (Ctrl+Z)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:undo')),
      group: 'snapshot-edit',
      order: 10,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-redo', {
      icon: IconArrowForwardUp,
      tooltip: 'Redo (Ctrl+Y)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:redo')),
      group: 'snapshot-edit',
      order: 20,
      viewport: 'snapshot-editor'
    });

    // === VIEW TOOLBAR BUTTONS ===

    api.toolbar('snapshot-zoom-in', {
      icon: IconZoomIn,
      tooltip: 'Zoom In',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:zoom', { detail: { delta: 0.1 } })),
      group: 'snapshot-view',
      order: 10,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-zoom-out', {
      icon: IconZoomOut,
      tooltip: 'Zoom Out',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:zoom', { detail: { delta: -0.1 } })),
      group: 'snapshot-view',
      order: 20,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-zoom-reset', {
      icon: IconZoomReset,
      tooltip: 'Reset Zoom (100%)',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:zoom-reset')),
      group: 'snapshot-view',
      order: 30,
      viewport: 'snapshot-editor'
    });

    // === TRANSFORM TOOLBAR BUTTONS ===

    api.toolbar('snapshot-flip-h', {
      icon: IconFlipHorizontal,
      tooltip: 'Flip Horizontal',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:flip', { detail: { direction: 'horizontal' } })),
      group: 'snapshot-transform',
      order: 10,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-flip-v', {
      icon: IconFlipVertical,
      tooltip: 'Flip Vertical',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:flip', { detail: { direction: 'vertical' } })),
      group: 'snapshot-transform',
      order: 20,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-rotate-cw', {
      icon: IconRotateClockwise,
      tooltip: 'Rotate 90° CW',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:rotate', { detail: { angle: 90 } })),
      group: 'snapshot-transform',
      order: 30,
      viewport: 'snapshot-editor'
    });

    api.toolbar('snapshot-rotate-ccw', {
      icon: IconRotate,
      tooltip: 'Rotate 90° CCW',
      onClick: () => window.dispatchEvent(new CustomEvent('snapshot:rotate', { detail: { angle: -90 } })),
      group: 'snapshot-transform',
      order: 40,
      viewport: 'snapshot-editor'
    });

    // === TOOL BUTTONS ===
    // Register each tool as a toolbar button
    tools.forEach(tool => {
      api.toolbar(`snapshot-tool-${tool.id}`, {
        icon: tool.icon,
        tooltip: `${tool.name} (${tool.shortcut})`,
        onClick: () => selectTool(tool.id),
        group: tool.group,
        order: tool.order,
        active: () => editorStore.state().tool === tool.id,
        viewport: 'snapshot-editor'
      });
    });

    // === MENUS ===

    // File Menu
    api.menu('snapshot-file-menu', {
      label: 'File',
      order: 10,
      viewport: 'snapshot-editor',
      submenu: [
        { label: 'New Canvas...', shortcut: 'Ctrl+N', icon: IconFilePlus, action: () => window.dispatchEvent(new CustomEvent('snapshot:new')) },
        { label: 'Open Image...', shortcut: 'Ctrl+O', icon: IconFolderOpen, action: () => window.dispatchEvent(new CustomEvent('snapshot:open')) },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl+S', icon: IconDeviceFloppy, action: () => window.dispatchEvent(new CustomEvent('snapshot:save')) },
        { label: 'Export As...', shortcut: 'Ctrl+Shift+S', icon: IconDownload, action: () => window.dispatchEvent(new CustomEvent('snapshot:export')) },
        { divider: true },
        { label: 'Close', action: () => window.dispatchEvent(new CustomEvent('snapshot:close')) }
      ]
    });

    // Edit Menu
    api.menu('snapshot-edit-menu', {
      label: 'Edit',
      order: 20,
      viewport: 'snapshot-editor',
      submenu: [
        { label: 'Undo', shortcut: 'Ctrl+Z', icon: IconArrowBackUp, action: () => window.dispatchEvent(new CustomEvent('snapshot:undo')) },
        { label: 'Redo', shortcut: 'Ctrl+Y', icon: IconArrowForwardUp, action: () => window.dispatchEvent(new CustomEvent('snapshot:redo')) },
        { divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => window.dispatchEvent(new CustomEvent('snapshot:cut')) },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => window.dispatchEvent(new CustomEvent('snapshot:copy')) },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => window.dispatchEvent(new CustomEvent('snapshot:paste')) },
        { divider: true },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => window.dispatchEvent(new CustomEvent('snapshot:select-all')) },
        { label: 'Deselect', shortcut: 'Ctrl+D', action: () => window.dispatchEvent(new CustomEvent('snapshot:deselect')) },
        { label: 'Invert Selection', shortcut: 'Ctrl+Shift+I', action: () => window.dispatchEvent(new CustomEvent('snapshot:invert-selection')) }
      ]
    });

    // Image Menu
    api.menu('snapshot-image-menu', {
      label: 'Image',
      order: 30,
      viewport: 'snapshot-editor',
      submenu: [
        { label: 'Canvas Size...', action: () => window.dispatchEvent(new CustomEvent('snapshot:canvas-size')) },
        { label: 'Image Size...', action: () => window.dispatchEvent(new CustomEvent('snapshot:image-size')) },
        { label: 'Crop to Selection', action: () => window.dispatchEvent(new CustomEvent('snapshot:crop')) },
        { divider: true },
        { label: 'Rotate 90° CW', icon: IconRotateClockwise, action: () => window.dispatchEvent(new CustomEvent('snapshot:rotate', { detail: { angle: 90 } })) },
        { label: 'Rotate 90° CCW', icon: IconRotate, action: () => window.dispatchEvent(new CustomEvent('snapshot:rotate', { detail: { angle: -90 } })) },
        { label: 'Rotate 180°', action: () => window.dispatchEvent(new CustomEvent('snapshot:rotate', { detail: { angle: 180 } })) },
        { divider: true },
        { label: 'Flip Horizontal', icon: IconFlipHorizontal, action: () => window.dispatchEvent(new CustomEvent('snapshot:flip', { detail: { direction: 'horizontal' } })) },
        { label: 'Flip Vertical', icon: IconFlipVertical, action: () => window.dispatchEvent(new CustomEvent('snapshot:flip', { detail: { direction: 'vertical' } })) },
        { divider: true },
        {
          label: 'Adjustments',
          submenu: [
            { label: 'Brightness/Contrast...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'brightness-contrast' } })) },
            { label: 'Hue/Saturation...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'hue-saturation' } })) },
            { label: 'Levels...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'levels' } })) },
            { label: 'Curves...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'curves' } })) },
            { divider: true },
            { label: 'Exposure...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'exposure' } })) },
            { label: 'Temperature...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'temperature' } })) },
            { label: 'Vibrance...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'vibrance' } })) },
            { divider: true },
            { label: 'Shadows/Highlights...', action: () => window.dispatchEvent(new CustomEvent('snapshot:adjustment', { detail: { type: 'shadows-highlights' } })) }
          ]
        }
      ]
    });

    // Filter Menu
    api.menu('snapshot-filter-menu', {
      label: 'Filter',
      order: 40,
      viewport: 'snapshot-editor',
      submenu: [
        {
          label: 'Blur',
          submenu: [
            { label: 'Gaussian Blur...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'gaussian-blur' } })) },
            { label: 'Box Blur...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'box-blur' } })) },
            { label: 'Motion Blur...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'motion-blur' } })) },
            { label: 'Radial Blur...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'radial-blur' } })) }
          ]
        },
        {
          label: 'Sharpen',
          submenu: [
            { label: 'Sharpen', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'sharpen' } })) },
            { label: 'Unsharp Mask...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'unsharp-mask' } })) }
          ]
        },
        { divider: true },
        {
          label: 'Stylize',
          submenu: [
            { label: 'Emboss', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'emboss' } })) },
            { label: 'Edge Detect', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'edge-detect' } })) },
            { label: 'Oil Paint...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'oil-paint' } })) },
            { label: 'Pixelate...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'pixelate' } })) }
          ]
        },
        {
          label: 'Noise',
          submenu: [
            { label: 'Add Noise...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'noise' } })) },
            { label: 'Reduce Noise', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'denoise' } })) }
          ]
        },
        { divider: true },
        { label: 'Grayscale', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'grayscale' } })) },
        { label: 'Sepia', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'sepia' } })) },
        { label: 'Invert Colors', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'invert' } })) },
        { divider: true },
        { label: 'Posterize...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'posterize' } })) },
        { label: 'Threshold...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'threshold' } })) },
        { label: 'Vignette...', action: () => window.dispatchEvent(new CustomEvent('snapshot:filter', { detail: { filter: 'vignette' } })) }
      ]
    });

    // View Menu
    api.menu('snapshot-view-menu', {
      label: 'View',
      order: 50,
      viewport: 'snapshot-editor',
      submenu: [
        { label: 'Zoom In', shortcut: 'Ctrl++', icon: IconZoomIn, action: () => window.dispatchEvent(new CustomEvent('snapshot:zoom', { detail: { delta: 0.25 } })) },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', icon: IconZoomOut, action: () => window.dispatchEvent(new CustomEvent('snapshot:zoom', { detail: { delta: -0.25 } })) },
        { label: 'Actual Size', shortcut: 'Ctrl+1', icon: IconZoomReset, action: () => window.dispatchEvent(new CustomEvent('snapshot:zoom-reset')) },
        { label: 'Fit to Window', shortcut: 'Ctrl+0', action: () => window.dispatchEvent(new CustomEvent('snapshot:zoom-fit')) },
        { divider: true },
        { label: 'Show Grid', action: () => window.dispatchEvent(new CustomEvent('snapshot:toggle-grid')) },
        { label: 'Show Rulers', action: () => window.dispatchEvent(new CustomEvent('snapshot:toggle-rulers')) },
        { label: 'Show Guides', action: () => window.dispatchEvent(new CustomEvent('snapshot:toggle-guides')) }
      ]
    });

    // Open the editor viewport
    api.open('snapshot-editor');

    // Show panels and toolbar
    setTimeout(() => {
      api.showLeftPanel(true);
      api.showProps(true);
      api.showBottomPanel(true);
      api.showToolbar(true);
    }, 100);

    console.log('[Snapshot] Photo editor plugin loaded successfully');
  },

  async onStop() {
    console.log('[Snapshot] Stopping photo editor plugin...');
  }
});
