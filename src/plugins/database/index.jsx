import { createPlugin } from '@/api/plugin';
import { IconDatabase } from '@tabler/icons-solidjs';
import DatabaseViewport from './viewport.jsx';
import DatabaseMenu from './panel.jsx';

export default createPlugin({
  id: 'webarcade-database-plugin',
  name: 'Database',
  version: '1.0.0',
  description: 'Execute SQL queries and manage the SQLite database',
  author: 'WebArcade Team',
  icon: IconDatabase,

  async onStart(api) {
    console.log('[Webarcade Database Plugin] Starting...');

    api.viewport('webarcade-database', {
      label: 'Database',
      component: DatabaseViewport,
      icon: IconDatabase,
      description: 'Execute SQL queries and manage the SQLite database',
      onActivate: (api, tab) => {
        api.showProps(true);
        api.showMenu(true);
        api.showFooter(true);
        api.showTabs(true);
      },
      onDeactivate: (api, tab) => {

      }
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
