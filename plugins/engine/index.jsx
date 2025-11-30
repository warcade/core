import { createPlugin } from '@/api/plugin';
import {
    IconCube,
    IconFile,
    IconFolderOpen,
    IconDeviceFloppy,
    IconDownload,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconCopy,
    IconTrash,
    IconBoxMultiple,
    IconSphere,
    IconCylinder,
    IconCone,
    IconPyramid,
    IconCircle,
    IconSquare,
    IconBulb,
    IconSun,
    IconSpotlight,
    IconCamera,
    IconVideo,
    IconPlayerPlay,
    IconPlayerPause,
    IconPlayerStop,
    IconZoomIn,
    IconZoomOut,
    IconZoomReset,
    IconGridDots,
    IconAxis,
    IconEye,
    IconEyeOff,
    IconSettings,
    IconArrowsMove,
    IconRotate,
    IconResize
} from '@tabler/icons-solidjs';
import Viewport from './viewport';
import LeftPanel from './LeftPanel';
import RightPanel from './RightPanel';

export default createPlugin({
    id: 'engine',
    name: 'Engine',
    version: '1.0.0',
    description: '3D engine with viewport rendering',
    author: 'WebArcade',

    async onStart(api) {
        console.log('[Engine] Starting...');

        api.viewport('engine-viewport', {
            label: 'Engine',
            component: Viewport,
            icon: IconCube,
            description: '3D viewport with cube and grid'
        });

        // Register panels for this viewport type
        api.leftPanel({ component: LeftPanel, viewport: 'engine-viewport' });
        api.rightPanel({ component: RightPanel, viewport: 'engine-viewport' });

        // === TOOLBAR GROUPS ===
        api.toolbarGroup('engine-file', { order: 10, viewport: 'engine-viewport' });
        api.toolbarGroup('engine-edit', { order: 20, viewport: 'engine-viewport' });
        api.toolbarGroup('engine-transform', { order: 30, viewport: 'engine-viewport' });
        api.toolbarGroup('engine-primitives', { order: 40, viewport: 'engine-viewport' });
        api.toolbarGroup('engine-play', { order: 50, viewport: 'engine-viewport' });
        api.toolbarGroup('engine-view', { order: 60, viewport: 'engine-viewport' });

        // === TOOLBAR ITEMS ===

        // File tools
        api.toolbar('engine-new', {
            icon: IconFile,
            tooltip: 'New Scene (Ctrl+N)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:new-scene')),
            group: 'engine-file',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-open', {
            icon: IconFolderOpen,
            tooltip: 'Open Scene (Ctrl+O)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:open-scene')),
            group: 'engine-file',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-save', {
            icon: IconDeviceFloppy,
            tooltip: 'Save Scene (Ctrl+S)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:save-scene')),
            group: 'engine-file',
            order: 30,
            viewport: 'engine-viewport'
        });

        // Edit tools
        api.toolbar('engine-undo', {
            icon: IconArrowBackUp,
            tooltip: 'Undo (Ctrl+Z)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:undo')),
            group: 'engine-edit',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-redo', {
            icon: IconArrowForwardUp,
            tooltip: 'Redo (Ctrl+Y)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:redo')),
            group: 'engine-edit',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-duplicate', {
            icon: IconCopy,
            tooltip: 'Duplicate (Ctrl+D)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:duplicate')),
            group: 'engine-edit',
            order: 30,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-delete', {
            icon: IconTrash,
            tooltip: 'Delete (Del)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:delete')),
            group: 'engine-edit',
            order: 40,
            viewport: 'engine-viewport'
        });

        // Transform tools
        api.toolbar('engine-move', {
            icon: IconArrowsMove,
            tooltip: 'Move Tool (W)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:set-tool', { detail: { tool: 'move' } })),
            group: 'engine-transform',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-rotate', {
            icon: IconRotate,
            tooltip: 'Rotate Tool (E)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:set-tool', { detail: { tool: 'rotate' } })),
            group: 'engine-transform',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-scale', {
            icon: IconResize,
            tooltip: 'Scale Tool (R)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:set-tool', { detail: { tool: 'scale' } })),
            group: 'engine-transform',
            order: 30,
            viewport: 'engine-viewport'
        });

        // Primitive tools
        api.toolbar('engine-add-cube', {
            icon: IconCube,
            tooltip: 'Add Cube',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'cube' } })),
            group: 'engine-primitives',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-add-sphere', {
            icon: IconSphere,
            tooltip: 'Add Sphere',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'sphere' } })),
            group: 'engine-primitives',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-add-cylinder', {
            icon: IconCylinder,
            tooltip: 'Add Cylinder',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'cylinder' } })),
            group: 'engine-primitives',
            order: 30,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-add-light', {
            icon: IconBulb,
            tooltip: 'Add Point Light',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:add-light', { detail: { type: 'point' } })),
            group: 'engine-primitives',
            order: 40,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-add-camera', {
            icon: IconCamera,
            tooltip: 'Add Camera',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:add-camera', { detail: { type: 'free' } })),
            group: 'engine-primitives',
            order: 50,
            viewport: 'engine-viewport'
        });

        // Play tools
        api.toolbar('engine-play', {
            icon: IconPlayerPlay,
            tooltip: 'Play (Ctrl+P)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:play')),
            group: 'engine-play',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-pause', {
            icon: IconPlayerPause,
            tooltip: 'Pause',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:pause')),
            group: 'engine-play',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-stop', {
            icon: IconPlayerStop,
            tooltip: 'Stop',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:stop')),
            group: 'engine-play',
            order: 30,
            viewport: 'engine-viewport'
        });

        // View tools
        api.toolbar('engine-toggle-grid', {
            icon: IconGridDots,
            tooltip: 'Toggle Grid',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:toggle-grid')),
            group: 'engine-view',
            order: 10,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-toggle-axes', {
            icon: IconAxis,
            tooltip: 'Toggle Axes',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:toggle-axes')),
            group: 'engine-view',
            order: 20,
            viewport: 'engine-viewport'
        });

        api.toolbar('engine-frame-all', {
            icon: IconZoomReset,
            tooltip: 'Frame All (Home)',
            onClick: () => window.dispatchEvent(new CustomEvent('engine:frame-all')),
            group: 'engine-view',
            order: 30,
            viewport: 'engine-viewport'
        });

        // === MENUS ===

        // File Menu
        api.menu('engine-file-menu', {
            label: 'File',
            order: 10,
            viewport: 'engine-viewport',
            submenu: [
                { label: 'New Scene', shortcut: 'Ctrl+N', icon: IconFile, action: () => window.dispatchEvent(new CustomEvent('engine:new-scene')) },
                { label: 'Open Scene...', shortcut: 'Ctrl+O', icon: IconFolderOpen, action: () => window.dispatchEvent(new CustomEvent('engine:open-scene')) },
                { divider: true },
                { label: 'Save Scene', shortcut: 'Ctrl+S', icon: IconDeviceFloppy, action: () => window.dispatchEvent(new CustomEvent('engine:save-scene')) },
                { label: 'Save Scene As...', shortcut: 'Ctrl+Shift+S', action: () => window.dispatchEvent(new CustomEvent('engine:save-scene-as')) },
                { divider: true },
                { label: 'Import...', icon: IconDownload, action: () => window.dispatchEvent(new CustomEvent('engine:import')) },
                { label: 'Export...', action: () => window.dispatchEvent(new CustomEvent('engine:export')) }
            ]
        });

        // Edit Menu
        api.menu('engine-edit-menu', {
            label: 'Edit',
            order: 20,
            viewport: 'engine-viewport',
            submenu: [
                { label: 'Undo', shortcut: 'Ctrl+Z', icon: IconArrowBackUp, action: () => window.dispatchEvent(new CustomEvent('engine:undo')) },
                { label: 'Redo', shortcut: 'Ctrl+Y', icon: IconArrowForwardUp, action: () => window.dispatchEvent(new CustomEvent('engine:redo')) },
                { divider: true },
                { label: 'Duplicate', shortcut: 'Ctrl+D', icon: IconCopy, action: () => window.dispatchEvent(new CustomEvent('engine:duplicate')) },
                { label: 'Delete', shortcut: 'Delete', icon: IconTrash, action: () => window.dispatchEvent(new CustomEvent('engine:delete')) },
                { divider: true },
                { label: 'Select All', shortcut: 'Ctrl+A', action: () => window.dispatchEvent(new CustomEvent('engine:select-all')) },
                { label: 'Deselect All', shortcut: 'Ctrl+Shift+A', action: () => window.dispatchEvent(new CustomEvent('engine:deselect-all')) },
                { divider: true },
                { label: 'Preferences...', icon: IconSettings, action: () => window.dispatchEvent(new CustomEvent('engine:preferences')) }
            ]
        });

        // Object Menu
        api.menu('engine-object-menu', {
            label: 'Object',
            order: 30,
            viewport: 'engine-viewport',
            submenu: [
                {
                    label: 'Primitives',
                    submenu: [
                        { label: 'Cube', icon: IconCube, action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'cube' } })) },
                        { label: 'Sphere', icon: IconSphere, action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'sphere' } })) },
                        { label: 'Cylinder', icon: IconCylinder, action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'cylinder' } })) },
                        { label: 'Cone', icon: IconCone, action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'cone' } })) },
                        { label: 'Torus', action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'torus' } })) },
                        { divider: true },
                        { label: 'Plane', icon: IconSquare, action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'plane' } })) },
                        { label: 'Ground', action: () => window.dispatchEvent(new CustomEvent('engine:add-primitive', { detail: { type: 'ground' } })) }
                    ]
                },
                {
                    label: 'Lights',
                    submenu: [
                        { label: 'Point Light', icon: IconBulb, action: () => window.dispatchEvent(new CustomEvent('engine:add-light', { detail: { type: 'point' } })) },
                        { label: 'Directional Light', icon: IconSun, action: () => window.dispatchEvent(new CustomEvent('engine:add-light', { detail: { type: 'directional' } })) },
                        { label: 'Spot Light', icon: IconSpotlight, action: () => window.dispatchEvent(new CustomEvent('engine:add-light', { detail: { type: 'spot' } })) },
                        { label: 'Hemispheric Light', action: () => window.dispatchEvent(new CustomEvent('engine:add-light', { detail: { type: 'hemispheric' } })) }
                    ]
                },
                {
                    label: 'Camera',
                    submenu: [
                        { label: 'Free Camera', icon: IconCamera, action: () => window.dispatchEvent(new CustomEvent('engine:add-camera', { detail: { type: 'free' } })) },
                        { label: 'Arc Rotate Camera', action: () => window.dispatchEvent(new CustomEvent('engine:add-camera', { detail: { type: 'arcRotate' } })) },
                        { label: 'Follow Camera', icon: IconVideo, action: () => window.dispatchEvent(new CustomEvent('engine:add-camera', { detail: { type: 'follow' } })) }
                    ]
                },
                { divider: true },
                { label: 'Empty Object', icon: IconBoxMultiple, action: () => window.dispatchEvent(new CustomEvent('engine:add-empty')) },
                { divider: true },
                {
                    label: 'Transform',
                    submenu: [
                        { label: 'Reset Position', action: () => window.dispatchEvent(new CustomEvent('engine:reset-position')) },
                        { label: 'Reset Rotation', action: () => window.dispatchEvent(new CustomEvent('engine:reset-rotation')) },
                        { label: 'Reset Scale', action: () => window.dispatchEvent(new CustomEvent('engine:reset-scale')) },
                        { divider: true },
                        { label: 'Center to Origin', action: () => window.dispatchEvent(new CustomEvent('engine:center-origin')) }
                    ]
                }
            ]
        });

        // View Menu
        api.menu('engine-view-menu', {
            label: 'View',
            order: 40,
            viewport: 'engine-viewport',
            submenu: [
                { label: 'Zoom In', icon: IconZoomIn, action: () => window.dispatchEvent(new CustomEvent('engine:zoom-in')) },
                { label: 'Zoom Out', icon: IconZoomOut, action: () => window.dispatchEvent(new CustomEvent('engine:zoom-out')) },
                { label: 'Reset View', icon: IconZoomReset, action: () => window.dispatchEvent(new CustomEvent('engine:reset-view')) },
                { divider: true },
                { label: 'Frame Selected', shortcut: 'F', action: () => window.dispatchEvent(new CustomEvent('engine:frame-selected')) },
                { label: 'Frame All', shortcut: 'Home', action: () => window.dispatchEvent(new CustomEvent('engine:frame-all')) },
                { divider: true },
                {
                    label: 'Viewport',
                    submenu: [
                        { label: 'Perspective', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'perspective' } })) },
                        { divider: true },
                        { label: 'Top', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'top' } })) },
                        { label: 'Bottom', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'bottom' } })) },
                        { label: 'Front', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'front' } })) },
                        { label: 'Back', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'back' } })) },
                        { label: 'Left', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'left' } })) },
                        { label: 'Right', action: () => window.dispatchEvent(new CustomEvent('engine:set-view', { detail: { view: 'right' } })) }
                    ]
                },
                { divider: true },
                { label: 'Show Grid', icon: IconGridDots, action: () => window.dispatchEvent(new CustomEvent('engine:toggle-grid')) },
                { label: 'Show Axes', icon: IconAxis, action: () => window.dispatchEvent(new CustomEvent('engine:toggle-axes')) },
                { label: 'Show Wireframe', action: () => window.dispatchEvent(new CustomEvent('engine:toggle-wireframe')) },
                { divider: true },
                { label: 'Show Statistics', action: () => window.dispatchEvent(new CustomEvent('engine:toggle-stats')) }
            ]
        });

        // Play Menu
        api.menu('engine-play-menu', {
            label: 'Play',
            order: 50,
            viewport: 'engine-viewport',
            submenu: [
                { label: 'Play', shortcut: 'Ctrl+P', icon: IconPlayerPlay, action: () => window.dispatchEvent(new CustomEvent('engine:play')) },
                { label: 'Pause', icon: IconPlayerPause, action: () => window.dispatchEvent(new CustomEvent('engine:pause')) },
                { label: 'Stop', icon: IconPlayerStop, action: () => window.dispatchEvent(new CustomEvent('engine:stop')) },
                { divider: true },
                { label: 'Play from Start', shortcut: 'Ctrl+Shift+P', action: () => window.dispatchEvent(new CustomEvent('engine:play-from-start')) }
            ]
        });

        api.open('engine-viewport');
    },

    async onStop() {
        console.log('[Engine] Stopping...');
    }
});
