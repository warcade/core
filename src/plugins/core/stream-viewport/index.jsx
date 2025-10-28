import { createPlugin } from '@/api/plugin';
import { IconVideo } from '@tabler/icons-solidjs';
import StreamViewport from './StreamViewport.jsx';
import StreamPanel from './StreamPanel.jsx';

console.log('[Stream Viewport Plugin] Module loaded');

export default createPlugin({
  id: 'stream-viewport',
  name: 'Stream Viewport',
  version: '1.0.0',
  description: 'OBS-style streaming viewport for managing stream overlays and sources',
  author: 'WebArcade Team',

  async onInit() {
    console.log('[Stream Viewport Plugin] Initializing...');
  },

  async onStart(api) {
    console.log('[Stream Viewport Plugin] Starting...');
    // Register stream viewport
    api.viewport('stream-viewport', {
      label: 'Stream Viewport',
      component: StreamViewport,
      icon: IconVideo,
      description: 'Manage stream sources and overlays'
    });
    console.log('[Stream Viewport Plugin] Viewport registered');

    // Register stream control panel
    api.tab('stream-panel', {
      title: 'Stream',
      component: StreamPanel,
      icon: IconVideo,
      order: 10
    });
    console.log('[Stream Viewport Plugin] Tab registered');
    console.log('[Stream Viewport Plugin] Started successfully');
  },

  onUpdate() {
    // Update logic if needed
  },

  async onStop() {
    // Cleanup
  },

  async onDispose() {
    // Cleanup
  }
});
