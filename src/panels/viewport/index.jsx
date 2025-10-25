import { viewportStore } from "./store";
import { viewportTypes } from "@/api/plugin";
import { Show, createMemo } from 'solid-js';

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
  // Viewport now fills its flex container - no positioning calculations needed
  
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
      class="relative w-full h-full pointer-events-auto viewport-container"
    >
      <div className="w-full h-full flex flex-col gap-0">
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