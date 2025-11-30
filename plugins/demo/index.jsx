import { createPlugin } from '@/api/plugin';
import { IconCheck, IconX, IconBox } from '@tabler/icons-solidjs';
import DemoViewport from './DemoViewport.jsx';

export default createPlugin({
  id: 'demo',
  name: 'Demo Plugin',
  version: '1.0.0',
  description: 'Showcases all UI components: viewport, panels, menu, and footer',
  author: 'WebArcade Team',

  async onStart(api) {
    console.log('[Demo Plugin] Starting...');

    // Register viewport type
    api.viewport('demo-viewport', {
      label: 'Demo',
      component: DemoViewport,
      description: 'Demo viewport showcasing all UI features'
    });

    // Register toolbar buttons (simple static icons)
    api.toolbar('demo-action1', {
      icon: IconCheck,
      tooltip: 'Demo Action 1',
      onClick: () => console.log('[Demo] Action 1'),
      group: 'demo',
      order: 10
    });

    api.toolbar('demo-action2', {
      icon: IconBox,
      tooltip: 'Demo Action 2',
      onClick: () => console.log('[Demo] Action 2'),
      group: 'demo',
      order: 20
    });

    api.toolbar('demo-action3', {
      icon: IconX,
      tooltip: 'Demo Action 3',
      onClick: () => console.log('[Demo] Action 3'),
      group: 'demo',
      order: 30
    });

    api.toolbarGroup('demo', {
      label: 'Demo',
      order: 50
    });

    // Register top menu item
    api.menu('demo-menu', {
      label: 'Demo',
      order: 100,
      submenu: [
        {
          label: 'Open Demo Viewport',
          onClick: () => api.open('demo-viewport')
        },
        {
          label: 'Toggle Left Panel',
          onClick: () => api.showLeftPanel(!api.getPropertiesPanelVisible())
        },
        {
          label: 'Toggle Right Panel',
          onClick: () => api.showProps(!api.getPropertiesPanelVisible())
        },
        {
          label: 'Toggle Bottom Panel',
          onClick: () => api.toggleBottomPanel()
        }
      ]
    });

    // Open the demo viewport
    api.open('demo-viewport');

    console.log('[Demo Plugin] All components registered successfully');
  },

  async onStop() {
    console.log('[Demo Plugin] Stopping...');
  }
});
