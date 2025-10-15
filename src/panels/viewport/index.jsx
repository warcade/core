import { editorStore } from "@/layout/stores/EditorStore";
import { viewportStore } from "./store";
import ViewportTabs from './ViewportTabs.jsx';
import { viewportTypes, propertiesPanelVisible, footerVisible, viewportTabsVisible } from "@/api/plugin";
import { Show, createMemo, createSignal, createEffect, onCleanup } from 'solid-js';

// Simple empty viewport
const EmptyViewport = (props) => {
  return (
    <div 
      className="w-full h-full bg-base-300 flex items-center justify-center"
      style={props.style}
    >
    </div>
  );
};

const PersistentRenderViewport = (_props) => {
  return (
    <EmptyViewport
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const Viewport = () => {
  // Get reactive store values
  const settings = () => editorStore.settings;
  const rightPanelWidth = () => editorStore.ui.rightPanelWidth;
  const bottomPanelHeight = () => editorStore.ui.bottomPanelHeight;
  
  const isScenePanelOpen = () => {
    return propertiesPanelVisible() && editorStore.panels.isScenePanelOpen;
  };
  
  
  const panelPosition = () => settings().editor.panelPosition || 'right';
  const isLeftPanel = () => panelPosition() === 'left';
  
  
  const getViewportPositioning = () => {
    const top = '0px';
    const left = isLeftPanel() && isScenePanelOpen() && propertiesPanelVisible() ? `${rightPanelWidth()}px` : '0px';
    const right = !isLeftPanel() && isScenePanelOpen() && propertiesPanelVisible() ? `${rightPanelWidth()}px` : '0px';
    const footerHeight = footerVisible() ? '24px' : '0px'; // 6 * 4 = 24px (h-6 in Tailwind)
    const bottomAdjustment = '-1px';
    const bottom = `calc(${footerHeight} + ${bottomAdjustment})`;
    
    return { top, left, right, bottom };
  };
  
  const activeTab = createMemo(() => {
    const tab = viewportStore.tabs.find(tab => tab.id === viewportStore.activeTabId);
    // Track active viewport tab
    return tab;
  });
  
  
  const isOverlayActive = createMemo(() => {
    const active = activeTab() && activeTab().type !== '3d-viewport';
    // Determine if overlay should be shown
    return active;
  });
  
  const renderOverlayPanel = (tab) => {
    if (!tab) return null;
    
    // Render overlay panel for current tab
    
    switch (tab.type) {
      default:
        // Check if this is a plugin viewport type
        // Check for plugin-registered viewport type
        const pluginViewportType = viewportTypes().get(tab.type);
        if (pluginViewportType && pluginViewportType.component) {
          const PluginComponent = pluginViewportType.component;
          // Render plugin component
          
          // All plugin viewports render without headers
          return (
            <div className="absolute inset-0 bg-base-100">
              <PluginComponent tab={tab} />
            </div>
          );
        }
        
        return (
          <div className="absolute inset-0 bg-base-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg text-base-content/60 mb-2">Unknown Overlay</div>
              <div className="text-sm text-base-content/50">Overlay type "{tab.type}" not found</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div 
      class="absolute pointer-events-auto viewport-container"
      style={getViewportPositioning()}
    >
      <div className="w-full h-full flex flex-col gap-0">
        <Show when={viewportTabsVisible()}>
          <ViewportTabs />
        </Show>
        <div className="flex-1 relative overflow-hidden">
          <div className="w-full bg-base-100 h-full overflow-hidden">
            <div class="relative w-full h-full">
              <PersistentRenderViewport />
            </div>
            
            <Show when={isOverlayActive()}>
              {renderOverlayPanel(activeTab())}
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Viewport;