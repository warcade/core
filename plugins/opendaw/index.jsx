import { createPlugin } from '@/api/plugin';
import {
  IconMusic,
  IconFile,
  IconFolderOpen,
  IconDeviceFloppy,
  IconDownload,
  IconUpload,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCut,
  IconCopy,
  IconClipboard,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerRecord,
  IconRepeat,
  IconMetronome,
  IconPlus,
  IconPlaylist,
  IconMicrophone,
  IconPiano,
  IconVolume,
  IconAdjustments,
  IconLayoutRows,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
  IconSettings,
  IconWaveSquare,
  IconWaveSine
} from '@tabler/icons-solidjs';
import DAWViewport from './components/DAWViewport.jsx';

export default createPlugin({
  id: 'opendaw',
  name: 'OpenDAW',
  version: '1.0.0',
  description: 'Professional web-based Digital Audio Workstation with MIDI, DSP, and audio engine',
  author: 'WebArcade',

  async onStart(api) {
    console.log('[OpenDAW] Starting plugin...');

    // Register the main DAW viewport
    api.viewport('opendaw-viewport', {
      label: 'OpenDAW',
      component: DAWViewport,
      icon: IconMusic,
      description: 'Professional Digital Audio Workstation'
    });

    // === TOOLBAR GROUPS ===
    api.toolbarGroup('daw-file', { order: 10, viewport: 'opendaw-viewport' });
    api.toolbarGroup('daw-edit', { order: 20, viewport: 'opendaw-viewport' });
    api.toolbarGroup('daw-transport', { order: 30, viewport: 'opendaw-viewport' });
    api.toolbarGroup('daw-tracks', { order: 40, viewport: 'opendaw-viewport' });
    api.toolbarGroup('daw-view', { order: 50, viewport: 'opendaw-viewport' });

    // === TOOLBAR ITEMS ===

    // File tools
    api.toolbar('daw-new', {
      icon: IconFile,
      tooltip: 'New Project (Ctrl+N)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:new-project')),
      group: 'daw-file',
      order: 10,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-open', {
      icon: IconFolderOpen,
      tooltip: 'Open Project (Ctrl+O)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:open-project')),
      group: 'daw-file',
      order: 20,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-save', {
      icon: IconDeviceFloppy,
      tooltip: 'Save Project (Ctrl+S)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:save-project')),
      group: 'daw-file',
      order: 30,
      viewport: 'opendaw-viewport'
    });

    // Edit tools
    api.toolbar('daw-undo', {
      icon: IconArrowBackUp,
      tooltip: 'Undo (Ctrl+Z)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:undo')),
      group: 'daw-edit',
      order: 10,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-redo', {
      icon: IconArrowForwardUp,
      tooltip: 'Redo (Ctrl+Y)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:redo')),
      group: 'daw-edit',
      order: 20,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-cut', {
      icon: IconCut,
      tooltip: 'Cut (Ctrl+X)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:cut')),
      group: 'daw-edit',
      order: 30,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-copy', {
      icon: IconCopy,
      tooltip: 'Copy (Ctrl+C)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:copy')),
      group: 'daw-edit',
      order: 40,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-paste', {
      icon: IconClipboard,
      tooltip: 'Paste (Ctrl+V)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:paste')),
      group: 'daw-edit',
      order: 50,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-delete', {
      icon: IconTrash,
      tooltip: 'Delete (Del)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:delete')),
      group: 'daw-edit',
      order: 60,
      viewport: 'opendaw-viewport'
    });

    // Transport tools
    api.toolbar('daw-skip-back', {
      icon: IconPlayerSkipBack,
      tooltip: 'Go to Start (Home)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:skip-back')),
      group: 'daw-transport',
      order: 10,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-stop', {
      icon: IconPlayerStop,
      tooltip: 'Stop',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:stop')),
      group: 'daw-transport',
      order: 20,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-play', {
      icon: IconPlayerPlay,
      tooltip: 'Play (Space)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:play')),
      group: 'daw-transport',
      order: 30,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-record', {
      icon: IconPlayerRecord,
      tooltip: 'Record (R)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:record')),
      group: 'daw-transport',
      order: 40,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-loop', {
      icon: IconRepeat,
      tooltip: 'Toggle Loop (L)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-loop')),
      group: 'daw-transport',
      order: 50,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-metronome', {
      icon: IconMetronome,
      tooltip: 'Toggle Metronome (M)',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-metronome')),
      group: 'daw-transport',
      order: 60,
      viewport: 'opendaw-viewport'
    });

    // Track tools
    api.toolbar('daw-add-audio-track', {
      icon: IconMicrophone,
      tooltip: 'Add Audio Track',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:add-track', { detail: { type: 'audio' } })),
      group: 'daw-tracks',
      order: 10,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-add-midi-track', {
      icon: IconPiano,
      tooltip: 'Add MIDI Track',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:add-track', { detail: { type: 'midi' } })),
      group: 'daw-tracks',
      order: 20,
      viewport: 'opendaw-viewport'
    });

    // View tools
    api.toolbar('daw-view-arrange', {
      icon: IconLayoutRows,
      tooltip: 'Arrangement View',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:set-view', { detail: { view: 'arrange' } })),
      group: 'daw-view',
      order: 10,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-view-mixer', {
      icon: IconAdjustments,
      tooltip: 'Mixer View',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:set-view', { detail: { view: 'mixer' } })),
      group: 'daw-view',
      order: 20,
      viewport: 'opendaw-viewport'
    });

    api.toolbar('daw-view-piano-roll', {
      icon: IconPiano,
      tooltip: 'Piano Roll',
      onClick: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-piano-roll')),
      group: 'daw-view',
      order: 30,
      viewport: 'opendaw-viewport'
    });

    // === MENUS ===

    // File Menu
    api.menu('daw-file-menu', {
      label: 'File',
      order: 10,
      viewport: 'opendaw-viewport',
      submenu: [
        { label: 'New Project', shortcut: 'Ctrl+N', icon: IconFile, action: () => window.dispatchEvent(new CustomEvent('opendaw:new-project')) },
        { label: 'Open Project...', shortcut: 'Ctrl+O', icon: IconFolderOpen, action: () => window.dispatchEvent(new CustomEvent('opendaw:open-project')) },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl+S', icon: IconDeviceFloppy, action: () => window.dispatchEvent(new CustomEvent('opendaw:save-project')) },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => window.dispatchEvent(new CustomEvent('opendaw:save-project-as')) },
        { divider: true },
        { label: 'Import Audio...', icon: IconUpload, action: () => window.dispatchEvent(new CustomEvent('opendaw:import-audio')) },
        { label: 'Import MIDI...', action: () => window.dispatchEvent(new CustomEvent('opendaw:import-midi')) },
        { divider: true },
        { label: 'Export Audio...', icon: IconDownload, action: () => window.dispatchEvent(new CustomEvent('opendaw:export-audio')) },
        { label: 'Export MIDI...', action: () => window.dispatchEvent(new CustomEvent('opendaw:export-midi')) },
        { divider: true },
        { label: 'Project Settings...', icon: IconSettings, action: () => window.dispatchEvent(new CustomEvent('opendaw:project-settings')) }
      ]
    });

    // Edit Menu
    api.menu('daw-edit-menu', {
      label: 'Edit',
      order: 20,
      viewport: 'opendaw-viewport',
      submenu: [
        { label: 'Undo', shortcut: 'Ctrl+Z', icon: IconArrowBackUp, action: () => window.dispatchEvent(new CustomEvent('opendaw:undo')) },
        { label: 'Redo', shortcut: 'Ctrl+Y', icon: IconArrowForwardUp, action: () => window.dispatchEvent(new CustomEvent('opendaw:redo')) },
        { divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X', icon: IconCut, action: () => window.dispatchEvent(new CustomEvent('opendaw:cut')) },
        { label: 'Copy', shortcut: 'Ctrl+C', icon: IconCopy, action: () => window.dispatchEvent(new CustomEvent('opendaw:copy')) },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: IconClipboard, action: () => window.dispatchEvent(new CustomEvent('opendaw:paste')) },
        { label: 'Delete', shortcut: 'Delete', icon: IconTrash, action: () => window.dispatchEvent(new CustomEvent('opendaw:delete')) },
        { divider: true },
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => window.dispatchEvent(new CustomEvent('opendaw:select-all')) },
        { label: 'Deselect All', shortcut: 'Ctrl+Shift+A', action: () => window.dispatchEvent(new CustomEvent('opendaw:deselect-all')) },
        { divider: true },
        { label: 'Split at Playhead', shortcut: 'S', action: () => window.dispatchEvent(new CustomEvent('opendaw:split')) },
        { label: 'Duplicate', shortcut: 'Ctrl+D', action: () => window.dispatchEvent(new CustomEvent('opendaw:duplicate')) }
      ]
    });

    // Track Menu
    api.menu('daw-track-menu', {
      label: 'Track',
      order: 30,
      viewport: 'opendaw-viewport',
      submenu: [
        { label: 'Add Audio Track', icon: IconMicrophone, action: () => window.dispatchEvent(new CustomEvent('opendaw:add-track', { detail: { type: 'audio' } })) },
        { label: 'Add MIDI Track', icon: IconPiano, action: () => window.dispatchEvent(new CustomEvent('opendaw:add-track', { detail: { type: 'midi' } })) },
        { label: 'Add Bus Track', icon: IconVolume, action: () => window.dispatchEvent(new CustomEvent('opendaw:add-track', { detail: { type: 'bus' } })) },
        { divider: true },
        { label: 'Delete Track', action: () => window.dispatchEvent(new CustomEvent('opendaw:delete-track')) },
        { label: 'Duplicate Track', action: () => window.dispatchEvent(new CustomEvent('opendaw:duplicate-track')) },
        { divider: true },
        { label: 'Freeze Track', action: () => window.dispatchEvent(new CustomEvent('opendaw:freeze-track')) },
        { label: 'Unfreeze Track', action: () => window.dispatchEvent(new CustomEvent('opendaw:unfreeze-track')) },
        { divider: true },
        { label: 'Group Selected Tracks', shortcut: 'Ctrl+G', action: () => window.dispatchEvent(new CustomEvent('opendaw:group-tracks')) },
        { label: 'Ungroup', shortcut: 'Ctrl+Shift+G', action: () => window.dispatchEvent(new CustomEvent('opendaw:ungroup-tracks')) }
      ]
    });

    // Transport Menu
    api.menu('daw-transport-menu', {
      label: 'Transport',
      order: 40,
      viewport: 'opendaw-viewport',
      submenu: [
        { label: 'Play/Pause', shortcut: 'Space', icon: IconPlayerPlay, action: () => window.dispatchEvent(new CustomEvent('opendaw:play')) },
        { label: 'Stop', icon: IconPlayerStop, action: () => window.dispatchEvent(new CustomEvent('opendaw:stop')) },
        { label: 'Record', shortcut: 'R', icon: IconPlayerRecord, action: () => window.dispatchEvent(new CustomEvent('opendaw:record')) },
        { divider: true },
        { label: 'Go to Start', shortcut: 'Home', icon: IconPlayerSkipBack, action: () => window.dispatchEvent(new CustomEvent('opendaw:skip-back')) },
        { label: 'Go to End', shortcut: 'End', icon: IconPlayerSkipForward, action: () => window.dispatchEvent(new CustomEvent('opendaw:skip-forward')) },
        { divider: true },
        { label: 'Toggle Loop', shortcut: 'L', icon: IconRepeat, action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-loop')) },
        { label: 'Set Loop Start', action: () => window.dispatchEvent(new CustomEvent('opendaw:set-loop-start')) },
        { label: 'Set Loop End', action: () => window.dispatchEvent(new CustomEvent('opendaw:set-loop-end')) },
        { divider: true },
        { label: 'Toggle Metronome', shortcut: 'M', icon: IconMetronome, action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-metronome')) },
        { label: 'Tap Tempo', shortcut: 'T', action: () => window.dispatchEvent(new CustomEvent('opendaw:tap-tempo')) }
      ]
    });

    // View Menu
    api.menu('daw-view-menu', {
      label: 'View',
      order: 50,
      viewport: 'opendaw-viewport',
      submenu: [
        { label: 'Arrangement', icon: IconLayoutRows, action: () => window.dispatchEvent(new CustomEvent('opendaw:set-view', { detail: { view: 'arrange' } })) },
        { label: 'Mixer', icon: IconAdjustments, action: () => window.dispatchEvent(new CustomEvent('opendaw:set-view', { detail: { view: 'mixer' } })) },
        { divider: true },
        { label: 'Show Piano Roll', icon: IconPiano, action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-piano-roll')) },
        { label: 'Show Mixer Panel', action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-mixer-panel')) },
        { divider: true },
        { label: 'Zoom In', shortcut: 'Ctrl++', icon: IconZoomIn, action: () => window.dispatchEvent(new CustomEvent('opendaw:zoom-in')) },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', icon: IconZoomOut, action: () => window.dispatchEvent(new CustomEvent('opendaw:zoom-out')) },
        { label: 'Zoom to Fit', shortcut: 'Ctrl+0', icon: IconZoomReset, action: () => window.dispatchEvent(new CustomEvent('opendaw:zoom-fit')) },
        { divider: true },
        { label: 'Show Grid', action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-grid')) },
        { label: 'Snap to Grid', shortcut: 'Ctrl+Shift+G', action: () => window.dispatchEvent(new CustomEvent('opendaw:toggle-snap')) }
      ]
    });

    // Open the DAW viewport
    api.open('opendaw-viewport');

    console.log('[OpenDAW] Plugin initialized');
  },

  async onStop() {
    console.log('[OpenDAW] Stopping plugin...');
  }
});
