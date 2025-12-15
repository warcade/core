import { plugin } from '@/api/plugin';
import { Explorer } from './panels/Explorer';
import { Viewport } from './panels/Viewport';
import { Properties } from './panels/Properties';
import { Console } from './panels/Console';
import {
    IconFile,
    IconFolderOpen,
    IconDeviceFloppy,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconZoomIn,
    IconZoomOut,
    IconMaximize,
    IconPlayerPlay,
    IconPlayerStop
} from '@tabler/icons-solidjs';

export default plugin({
    id: 'demo',
    name: 'Demo Plugin',
    version: '1.0.0',
    description: 'Demo plugin showcasing the new plugin system',
    author: 'WebArcade',

    start(api) {
        console.log('[Demo] Starting plugin...');

        // ==================== PANELS ====================

        api.register('viewport', {
            type: 'panel',
            component: Viewport,
            label: 'Viewport',
            provides: ['viewport', 'render-target'],
            accepts: ['scene-object', 'material']
        });

        api.register('explorer', {
            type: 'panel',
            component: Explorer,
            label: 'Explorer',
            provides: ['file-tree', 'selection'],
            emits: ['file-selected', 'file-opened']
        });

        api.register('properties', {
            type: 'panel',
            component: Properties,
            label: 'Properties',
            accepts: ['selection'],
            emits: ['property-changed']
        });

        api.register('console', {
            type: 'panel',
            component: Console,
            label: 'Console',
            accepts: ['log-message']
        });

        // ==================== MENUS ====================

        api.register('file-menu', {
            type: 'menu',
            label: 'File',
            order: 1,
            submenu: [
                { label: 'New Project', shortcut: 'Ctrl+N', action: () => api.emit('file:new') },
                { label: 'Open Project', shortcut: 'Ctrl+O', action: () => api.emit('file:open') },
                { label: 'Save', shortcut: 'Ctrl+S', action: () => api.emit('file:save') },
                { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => api.emit('file:save-as') },
                { divider: true },
                { label: 'Export', submenu: [
                    { label: 'Export as HTML', action: () => api.emit('export:html') },
                    { label: 'Export as ZIP', action: () => api.emit('export:zip') }
                ]},
                { divider: true },
                { label: 'Exit', action: () => api.exit() }
            ]
        });

        api.register('edit-menu', {
            type: 'menu',
            label: 'Edit',
            order: 2,
            submenu: [
                { label: 'Undo', shortcut: 'Ctrl+Z', action: () => api.emit('edit:undo') },
                { label: 'Redo', shortcut: 'Ctrl+Y', action: () => api.emit('edit:redo') },
                { divider: true },
                { label: 'Cut', shortcut: 'Ctrl+X', action: () => api.emit('edit:cut') },
                { label: 'Copy', shortcut: 'Ctrl+C', action: () => api.emit('edit:copy') },
                { label: 'Paste', shortcut: 'Ctrl+V', action: () => api.emit('edit:paste') },
                { divider: true },
                { label: 'Select All', shortcut: 'Ctrl+A', action: () => api.emit('edit:select-all') }
            ]
        });

        api.register('view-menu', {
            type: 'menu',
            label: 'View',
            order: 3,
            submenu: [
                { label: 'Explorer', action: () => api.emit('view:toggle-explorer') },
                { label: 'Properties', action: () => api.emit('view:toggle-properties') },
                { label: 'Console', action: () => api.emit('view:toggle-console') },
                { divider: true },
                { label: 'Fullscreen', shortcut: 'F11', action: () => api.fullscreen() }
            ]
        });

        api.register('help-menu', {
            type: 'menu',
            label: 'Help',
            order: 100,
            submenu: [
                { label: 'Documentation', action: () => window.open('https://warcade.github.io/docs/') },
                { label: 'About', action: () => alert('Demo Plugin v1.0.0\n\nA demo plugin for WebArcade.') }
            ]
        });

        // ==================== TOOLBAR ====================

        api.register('new-file', {
            type: 'toolbar',
            icon: IconFile,
            tooltip: 'New Project (Ctrl+N)',
            group: 'file',
            order: 1,
            onClick: () => api.emit('file:new')
        });

        api.register('open-file', {
            type: 'toolbar',
            icon: IconFolderOpen,
            tooltip: 'Open Project (Ctrl+O)',
            group: 'file',
            order: 2,
            onClick: () => api.emit('file:open')
        });

        api.register('save-file', {
            type: 'toolbar',
            icon: IconDeviceFloppy,
            tooltip: 'Save (Ctrl+S)',
            group: 'file',
            order: 3,
            onClick: () => api.emit('file:save')
        });

        api.register('undo', {
            type: 'toolbar',
            icon: IconArrowBackUp,
            tooltip: 'Undo (Ctrl+Z)',
            group: 'edit',
            order: 1,
            onClick: () => api.emit('edit:undo')
        });

        api.register('redo', {
            type: 'toolbar',
            icon: IconArrowForwardUp,
            tooltip: 'Redo (Ctrl+Y)',
            group: 'edit',
            order: 2,
            onClick: () => api.emit('edit:redo')
        });

        api.register('play', {
            type: 'toolbar',
            icon: IconPlayerPlay,
            tooltip: 'Play (F5)',
            group: 'run',
            order: 1,
            onClick: () => api.emit('run:play')
        });

        api.register('stop', {
            type: 'toolbar',
            icon: IconPlayerStop,
            tooltip: 'Stop (Shift+F5)',
            group: 'run',
            order: 2,
            onClick: () => api.emit('run:stop')
        });

        api.register('zoom-in', {
            type: 'toolbar',
            icon: IconZoomIn,
            tooltip: 'Zoom In',
            group: 'view',
            order: 1,
            onClick: () => api.emit('view:zoom-in')
        });

        api.register('zoom-out', {
            type: 'toolbar',
            icon: IconZoomOut,
            tooltip: 'Zoom Out',
            group: 'view',
            order: 2,
            onClick: () => api.emit('view:zoom-out')
        });

        api.register('fullscreen', {
            type: 'toolbar',
            icon: IconMaximize,
            tooltip: 'Fullscreen (F11)',
            group: 'view',
            order: 3,
            onClick: () => api.fullscreen()
        });

        // ==================== STATUS BAR ====================

        api.register('ready-status', {
            type: 'status',
            component: () => <span class="text-success">Ready</span>,
            align: 'left',
            priority: 1
        });

        api.register('version-status', {
            type: 'status',
            component: () => <span class="text-base-content/50">v1.0.0</span>,
            align: 'right',
            priority: 100
        });

        // ==================== KEYBOARD SHORTCUTS ====================

        const unregisterShortcuts = api.shortcut.register((event) => {
            if (api.shortcut.matches(event, 'ctrl+s')) {
                event.preventDefault();
                api.emit('file:save');
            }
            if (api.shortcut.matches(event, 'ctrl+n')) {
                event.preventDefault();
                api.emit('file:new');
            }
            if (api.shortcut.matches(event, 'ctrl+o')) {
                event.preventDefault();
                api.emit('file:open');
            }
            if (api.shortcut.matches(event, 'f11')) {
                event.preventDefault();
                api.fullscreen();
            }
        });

        api._cleanup = () => {
            unregisterShortcuts();
        };

        console.log('[Demo] Plugin started successfully');
    },

    stop(api) {
        console.log('[Demo] Stopping plugin...');
        if (api._cleanup) api._cleanup();
    }
});
