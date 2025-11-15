import { createPlugin } from '@/api/plugin';
import { IconCode } from '@tabler/icons-solidjs';
import PluginIDEViewport from './viewport';
import FilesPanel from './components/FilesPanel';

export default createPlugin({
  id: 'plugin-ide',
  name: 'Developer',
  version: '1.0.0',
  description: 'Integrated development environment for building WebArcade plugins',
  author: 'WebArcade',

  async onInit() {
    console.log('[Developer] Initializing...');
  },

  async onStart(api) {
    console.log('[Developer] Starting...');

    // Register the IDE viewport with lifecycle callbacks
    api.viewport('plugin-ide-viewport', {
      label: 'Developer',
      component: PluginIDEViewport,
      icon: IconCode,
      description: 'Develop and manage plugins with Monaco editor',
      onActivate: (api, tab) => {
        api.showProps(true);
        api.showMenu(true);
        api.showFooter(true);
        api.showTabs(true);
      },
      onDeactivate: (api, tab) => {

      }
    });

    // Register Files panel in right panel
    api.tab('plugin-ide-files', {
      title: 'Developer',
      component: FilesPanel,
      icon: IconCode,
      order: 1,
      viewport: 'plugin-ide-viewport'
    });

    // Show all UI elements on initial start
    api.showProps(true);
    api.showMenu(true);
    api.showFooter(true);
    api.showTabs(true);

    console.log('[Developer] Started successfully');
  },

  async onStop() {
    console.log('[Developer] Stopping...');
  },

  async onDispose() {
    console.log('[Developer] Disposing...');
  }
});
