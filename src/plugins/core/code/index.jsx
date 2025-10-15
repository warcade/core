import { createPlugin } from '@/api/plugin';
import { IconCode } from '@tabler/icons-solidjs';
import { createEffect } from 'solid-js';
import { viewportStore } from '@/panels/viewport/store';
import CodeEditorViewport from './CodeEditorViewport.jsx';

export default createPlugin({
  id: 'code-editor-viewport-plugin',
  name: 'Code Editor Viewport Plugin',
  version: '1.0.0',
  description: 'Code editor viewport for editing scripts and text files',
  author: 'Renzora Engine Team',

  async onInit(_api) {
  },

  async onStart(api) {
    
    api.viewport('code-editor', {
      label: 'Code Editor',
      component: CodeEditorViewport,
      icon: IconCode,
      description: 'Code editor for scripts and text files'
    });
    
    const effect = createEffect(() => {
      const activeTabId = viewportStore.activeTabId;
      const tabs = viewportStore.tabs;
      const activeTab = tabs.find(tab => tab.id === activeTabId);
      
      
      if (activeTab && activeTab.type === 'code-editor') {
        api.hideToolbar();
        requestAnimationFrame(() => api.hideToolbar());
        setTimeout(() => api.hideToolbar(), 10);
        setTimeout(() => api.hideToolbar(), 100);
      } else if (activeTab) {
        api.showToolbar();
      }
    });
    
    api.toolbarEffect = effect;
    
  },

  onUpdate() {

  },

  async onStop(api) {
    
    if (api.toolbarEffect) {
      api.toolbarEffect();
      api.toolbarEffect = null;
    }
    
    const { pluginAPI } = await import('@/api/plugin');
    pluginAPI.showToolbar();
  },

  async onDispose() {
    const { pluginAPI } = await import('@/api/plugin');
    pluginAPI.showToolbar();
  }
});