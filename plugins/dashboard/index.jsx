import { createPlugin } from '@/api/plugin';
import { IconChartLine } from '@tabler/icons-solidjs';
import DashboardViewport from './viewport.jsx';

export default createPlugin({
  id: 'webarcade-dashboard-plugin',
  name: 'Dashboard Plugin',
  version: '1.0.0',
  description: 'Dashboard with plugin widgets',
  author: 'WebArcade Team',

  async onInit() {

  },

  async onStart(api) {
    api.viewport('webarcade-dashboard', {
      label: 'Dashboard',
      component: DashboardViewport,
      icon: IconChartLine,
      description: 'Dashboard with plugin widgets'
    });

    api.showProps(true);
    api.showMenu(true);
    api.showFooter(true);
    api.showTabs(true);

    setTimeout(() => {
      api.open('webarcade-dashboard', {
        title: 'Dashboard',
        closable: true
      });
    }, 100);
  },

  onUpdate() {

  },

  async onStop() {

  },

  async onDispose() {

  }
});
