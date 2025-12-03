import { createPlugin } from '@/api/plugin';
import Viewport from './viewport.jsx';

export default createPlugin({
  id: 'emils',
  name: 'Emils',
  version: '1.0.0',
  description: 'A minesweeper-like puzzle game where you help Emils reach the portal while avoiding Treants!',
  author: 'WebArcade Team',

  async onStart(api) {
    console.log('[Emils] Starting...');

    api.viewport('emils-viewport', {
      label: 'Emils',
      component: Viewport,
      description: 'Help Emils navigate the forest and reach the portal!',
      onActivate: (api) => {
        api.hideAll();
        api.fullscreen(true);
      }
    });

    api.menu('emils-menu', {
      label: 'Emils',
      order: 100,
      submenu: [
        {
          label: 'Play Emils',
          onClick: () => api.open('emils-viewport')
        }
      ]
    });

    api.open('emils-viewport');

    // Apply fullscreen mode on initial load
    api.hideAll();
    api.fullscreen(true);

    console.log('[Emils] Game loaded successfully');
  },

  async onStop() {
    console.log('[Emils] Stopping...');
  }
});
