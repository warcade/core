import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import TopMenu from '@/panels/topMenu';
import Viewport from '@/panels/viewport';
import Footer from '@/panels/footer';
import RightPanel from '@/panels/rightPanel';
import LeftPanel from '@/panels/leftPanel';
import { ViewportContextMenuProvider } from '@/ui/ViewportContextMenu.jsx';
import { keyboardShortcuts } from '@/components/KeyboardShortcuts';
import { editorActions } from './stores/EditorStore.jsx';
import { propertiesPanelVisible, leftPanelVisible, footerVisible } from '@/api/plugin';

const Layout = () => {
  const [globalTooltip, setGlobalTooltip] = createSignal(null);
  const [contextMenuAPI, setContextMenuAPI] = createSignal(null);

  const handleOpenCodeEditor = async (event) => {
    // Open the code editor viewport or switch to existing tab
    const { pluginAPI } = await import('@/api/plugin');
    const { viewportStore, viewportActions } = await import('@/panels/viewport/store');
    const { file } = event.detail;
    
    if (!file) {
      // No file specified, just open a new code editor
      pluginAPI.open('code-editor', { 
        label: 'Code Editor'
      });
      return;
    }
    
    // Check if this file is already open in an existing code editor tab
    const existingTab = viewportStore.tabs.find(tab => 
      tab.type === 'code-editor' && 
      tab.initialFile && 
      tab.initialFile.path === file.path
    );
    
    if (existingTab) {
      // File is already open, switch to that tab
      viewportActions.setActiveViewportTab(existingTab.id);
    } else {
      // File is not open, create a new tab
      const tabName = file.name;
      pluginAPI.open('code-editor', { 
        label: tabName,
        initialFile: file 
      });
    }
  };

  onMount(() => {
    document.addEventListener('engine:open-code-editor', handleOpenCodeEditor);
    
    // Listen for global tooltip events
    const handleTooltipShow = (e) => setGlobalTooltip(e.detail);
    const handleTooltipHide = () => setGlobalTooltip(null);
    
    document.addEventListener('global:tooltip-show', handleTooltipShow);
    document.addEventListener('global:tooltip-hide', handleTooltipHide);
    
    // Setup context menu shortcuts once the context menu API is available
    setTimeout(() => {
      const api = contextMenuAPI();
      if (api && api.showContextMenu) {
        keyboardShortcuts.enableContextMenu(api.showContextMenu);
      }
    }, 100);
    
    onCleanup(() => {
      document.removeEventListener('engine:open-code-editor', handleOpenCodeEditor);
      document.removeEventListener('global:tooltip-show', handleTooltipShow);
      document.removeEventListener('global:tooltip-hide', handleTooltipHide);
      keyboardShortcuts.disableContextMenu();
    });
  });

  return (
    <ViewportContextMenuProvider editorActions={editorActions} onAPIReady={setContextMenuAPI}>
      <div class="fixed inset-0 flex flex-col pointer-events-none z-10" onContextMenu={(e) => e.preventDefault()}>
        <div class="flex-shrink-0 pointer-events-auto z-50">
          <TopMenu />
        </div>


        <div
          class="flex-1 flex overflow-hidden pointer-events-auto"
          style={{
            'padding-bottom': footerVisible() ? '24px' : '0px'
          }}
        >
          <Show when={leftPanelVisible()}>
            <LeftPanel />
          </Show>
          <div class="flex-1 relative overflow-hidden min-w-0">
            <Viewport />
          </div>
          <Show when={propertiesPanelVisible()}>
            <RightPanel />
          </Show>
        </div>

        <Show when={footerVisible()}>
          <Footer />
        </Show>
      </div>

      {/* Global Tooltip - appears above everything */}
      <Show when={globalTooltip()}>
        <div class="fixed z-[99999] bg-black text-white text-xs p-3 pointer-events-none shadow-xl border border-gray-600 max-w-xs" 
             style={`left: ${globalTooltip().x}px; top: ${globalTooltip().y}px;`}>
          <div class="font-semibold mb-2 text-white truncate">{globalTooltip().asset.name}</div>
          <div class="space-y-1 text-gray-300">
            <div class="truncate">Type: {globalTooltip().asset.extension?.toUpperCase() || 'Unknown'}</div>
            <div class="truncate">Size: {globalTooltip().asset.size ? `${Math.round(globalTooltip().asset.size / 1024)} KB` : 'Unknown'}</div>
            <Show when={globalTooltip().asset.path}>
              <div class="text-gray-400 truncate">Path: {globalTooltip().asset.path}</div>
            </Show>
          </div>
        </div>
      </Show>
    </ViewportContextMenuProvider>
  );
};

export default Layout;