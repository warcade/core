import { createPlugin } from '@/api/plugin';
import { IconWorld } from '@tabler/icons-solidjs';
import WebBrowserViewport from './WebBrowserViewport.jsx';

export default createPlugin({
  id: 'web-browser-plugin',
  name: 'Web Browser Viewport Plugin',
  version: '1.0.0',
  description: 'Web browser viewport for browsing websites',
  author: 'Renzora Engine Team',

  async onInit() {
  },

  async onStart(api) {
    
    api.viewport('web-browser', {
      label: 'Web Browser',
      component: WebBrowserViewport,
      icon: IconWorld,
      description: 'Browse websites in a viewport'
    });
    
  },

  onUpdate() {
    // Update logic if needed
  },

  async onStop() {
  },

  async onDispose() {
  }
});