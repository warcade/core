// Developer IDE - Core Application Module
// This is NOT a plugin - it's a built-in part of the WebArcade application

import { IconCode, IconTerminal } from '@tabler/icons-solidjs';
import DeveloperViewport from './DeveloperViewport.jsx';
import FilesPanel from './components/FilesPanel.jsx';
import { BuildConsole } from './components/BuildConsole.jsx';

// Footer button component for Developer mode
function createDeveloperFooterButton(openFn) {
  return function DeveloperFooterButton() {
    return (
      <button
        onClick={openFn}
        class="flex items-center gap-1 text-base-content/60 hover:text-primary transition-colors"
        title="Open Developer IDE"
      >
        <IconCode class="w-3.5 h-3.5" />
        <span>Developer</span>
      </button>
    );
  };
}

/**
 * Initialize the Developer IDE module
 * This should be called after the PluginAPI is initialized
 */
export function initDeveloper(api) {
  console.log('[Developer] Initializing Developer IDE...');

  // Listen for build start event to show console
  window.addEventListener('developer:build-start', () => {
    api.bottomTab('developer-console', {
      title: 'Build Console',
      component: BuildConsole,
      icon: IconTerminal,
      order: 1,
      closable: true
    });
    api.showBottomPanel(true);
  });

  // Register the IDE viewport
  api.viewport('developer-viewport', {
    label: 'Developer',
    component: DeveloperViewport,
    icon: IconCode,
    description: 'Develop and manage plugins with Monaco editor',
    onActivate: () => {
      console.log('[Developer] Viewport activated');
      api.rightPanel({ component: FilesPanel });
      api.showProps(true);
      api.showMenu(true);
      api.showFooter(true);
      api.showTabs(true);
    },
    onDeactivate: () => {
      console.log('[Developer] Viewport deactivated');
      api.unregisterBottomPanelTab('developer-console');
    }
  });

  // Register Files panel in right panel (only when developer viewport is active)
  // This will be handled by viewport onActivate/onDeactivate

  // Add footer button to open Developer
  const openDeveloper = () => {
    api.open('developer-viewport', {
      label: 'Developer'
    });
  };

  api.footer('developer-footer-button', {
    component: createDeveloperFooterButton(openDeveloper),
    order: 10
  });

  console.log('[Developer] Developer IDE initialized successfully');
  console.log('[Developer] Footer button registered');
}

export { DeveloperViewport, FilesPanel, BuildConsole };
