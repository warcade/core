import { createPlugin } from '@/api/plugin';
import { IconDatabase } from '@tabler/icons-solidjs';
import DatabaseViewport from './DatabaseViewport.jsx';
import DatabaseMenu from './DatabaseMenu.jsx';

export default createPlugin({
  id: 'webarcade-database-plugin',
  name: 'Database',
  version: '1.0.0',
  description: 'Execute SQL queries and manage the SQLite database',
  author: 'WebArcade Team',

  async onStart(api) {
    console.log('[Webarcade Database Plugin] Starting...');

    api.viewport('webarcade-database', {
      label: 'Database',
      component: DatabaseViewport,
      icon: IconDatabase,
      description: 'Execute SQL queries and manage the SQLite database'
    });

    api.tab('webarcade-database-menu', {
      title: 'Database',
      component: DatabaseMenu,
      icon: IconDatabase,
      order: 100,
      viewport: 'webarcade-database'
    });

    console.log('[Webarcade Database Plugin] Started successfully');
  },

  async onStop() {
    console.log('[Webarcade Database Plugin] Stopping...');
  }
});
