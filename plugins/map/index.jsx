import { createPlugin } from '@/api/plugin';
import { IconMap } from '@tabler/icons-solidjs';
import MapViewport from './MapViewport.jsx';

export default createPlugin({
  id: 'map',
  name: 'Map',
  version: '1.0.0',
  description: 'Interactive map viewer powered by Leaflet.js',
  author: 'WebArcade Team',

  async onStart(api) {
    console.log('[Map Plugin] Starting...');

    // Register viewport
    api.viewport('map-viewport', {
      label: 'Map',
      component: MapViewport,
      icon: IconMap,
      description: 'Interactive world map with markers and layers'
    });

    // Register menu item
    api.menu('map-menu', {
      label: 'Map',
      icon: IconMap,
      order: 50,
      submenu: [
        {
          label: 'Open Map',
          onClick: () => api.open('map-viewport')
        }
      ]
    });

    // Open the map viewport
    api.open('map-viewport');

    console.log('[Map Plugin] Started successfully');
  },

  async onStop() {
    console.log('[Map Plugin] Stopping...');
  }
});
