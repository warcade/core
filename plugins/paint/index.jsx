import { createPlugin } from '@/api/plugin';
import { IconBrush } from '@tabler/icons-solidjs';
import PaintViewport from './PaintViewport.jsx';

export default createPlugin({
  id: 'paint',
  name: 'Paint',
  version: '1.0.0',
  description: 'A Microsoft Paint clone built with JS Paint',
  author: 'WebArcade',

  async onStart(api) {
    console.log('[Paint Plugin] Starting...');

    // Register viewport
    api.viewport('paint-viewport', {
      label: 'Paint',
      component: PaintViewport,
      icon: IconBrush,
      description: 'Classic MS Paint experience'
    });

    // Register menu item
    api.menu('paint-menu', {
      label: 'Paint',
      icon: IconBrush,
      order: 50,
      submenu: [
        {
          label: 'Open Paint',
          onClick: () => api.open('paint-viewport')
        }
      ]
    });

    // Hide UI elements for fullscreen paint experience
    api.showLeftPanel(false);
    api.showProps(false);
    api.showBottomPanel(false);
    api.showToolbar(false);

    // Open the paint viewport
    api.open('paint-viewport');

    console.log('[Paint Plugin] Ready');
  },

  async onStop() {
    console.log('[Paint Plugin] Stopping...');
  }
});
