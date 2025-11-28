import { Show, For, createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import PanelResizer from '@/ui/PanelResizer.jsx';
import { bottomPanelTabs, bottomPanelVisible, pluginAPI } from '@/api/plugin';

const BottomPanel = () => {
  const [panelHeight, setPanelHeight] = createSignal(200);
  const [isResizing, setIsResizing] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal(0);
  const [activeTab, setActiveTab] = createSignal(null);

  // Auto-select first tab when tabs change
  createEffect(() => {
    const tabs = Array.from(bottomPanelTabs().values()).sort((a, b) => a.order - b.order);
    if (tabs.length > 0 && !activeTab()) {
      setActiveTab(tabs[0].id);
    } else if (tabs.length === 0) {
      setActiveTab(null);
    } else if (activeTab() && !tabs.find(t => t.id === activeTab())) {
      // Active tab was removed, select the first one
      setActiveTab(tabs[0]?.id || null);
    }
  });

  // Listen for tab switch events
  onMount(() => {
    const handleSwitchTab = (event) => {
      const tabId = event.detail?.tabId;
      if (tabId) {
        const tabs = getTabs();
        if (tabs.find(t => t.id === tabId)) {
          setActiveTab(tabId);
        }
      }
    };

    window.addEventListener('bottom-panel:switch-tab', handleSwitchTab);
    onCleanup(() => window.removeEventListener('bottom-panel:switch-tab', handleSwitchTab));
  });

  const handleResizeStart = (e) => {
    setIsResizing(true);
    const currentPanelTop = window.innerHeight - panelHeight();
    const offset = e?.clientY ? e.clientY - currentPanelTop : 0;
    setDragOffset(offset);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const handleResizeMove = (e) => {
    if (!isResizing()) return;

    const minPanelHeight = 100;
    const maxPanelHeight = window.innerHeight * 0.6;

    // Calculate new height from mouse position
    const newHeight = window.innerHeight - (e.clientY - dragOffset());

    if (newHeight < minPanelHeight) {
      setPanelHeight(minPanelHeight);
      return;
    }

    const clampedHeight = Math.max(minPanelHeight, Math.min(newHeight, maxPanelHeight));
    setPanelHeight(clampedHeight);

    // Notify viewports to resize
    window.dispatchEvent(new Event('viewport-resize'));
  };

  const handleClose = () => {
    pluginAPI.hideBottomPanel();
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    pluginAPI.unregisterBottomPanelTab(tabId);
  };

  const getTabs = () => {
    return Array.from(bottomPanelTabs().values()).sort((a, b) => a.order - b.order);
  };

  const getActiveTabComponent = () => {
    const tabs = getTabs();
    const active = tabs.find(t => t.id === activeTab());
    return active?.component || null;
  };

  return (
    <Show when={bottomPanelVisible() && getTabs().length > 0}>
      <div
        class={`relative flex-shrink-0 bg-base-200 border-t border-base-300 flex flex-col ${!isResizing() ? 'transition-all duration-300' : ''}`}
        style={{
          height: `${panelHeight()}px`
        }}
      >
        {/* Resize handle at the top */}
        <PanelResizer
          type="bottom"
          isResizing={isResizing}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          onResize={handleResizeMove}
          position={{
            left: 0,
            right: 0,
            top: '-4px',
            height: '8px',
            zIndex: 30
          }}
        />

        {/* Tab bar */}
        <div class="flex items-center justify-between bg-base-300/50 border-b border-base-300 px-2 flex-shrink-0">
          <div class="flex items-center gap-1 overflow-x-auto">
            <For each={getTabs()}>
              {(tab) => (
                <button
                  class={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-t ${
                    activeTab() === tab.id
                      ? 'bg-base-200 text-base-content border-t border-l border-r border-base-300'
                      : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Show when={tab.icon}>
                    {(() => {
                      const Icon = tab.icon;
                      return <Icon class="w-3.5 h-3.5" />;
                    })()}
                  </Show>
                  <span>{tab.title}</span>
                  <Show when={tab.closable !== false}>
                    <button
                      class="ml-1 p-0.5 rounded hover:bg-base-300 text-base-content/40 hover:text-base-content"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Close tab"
                    >
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </Show>
                </button>
              )}
            </For>
          </div>

          {/* Panel controls */}
          <div class="flex items-center gap-1 ml-2">
            <button
              class="p-1 rounded hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors"
              onClick={handleClose}
              title="Close panel"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div class="flex-1 overflow-auto">
          <Show when={getActiveTabComponent()}>
            {(() => {
              const Component = getActiveTabComponent();
              return <Component />;
            })()}
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default BottomPanel;
