import PanelResizer from '@/ui/PanelResizer.jsx';
import { rightPanelComponent, propertiesPanelVisible } from '@/api/plugin';
import { Show, createSignal, createMemo, onMount } from 'solid-js';
import { IconBox } from '@tabler/icons-solidjs';
import { Dynamic } from 'solid-js/web';

const RightPanel = () => {
  let panelRef;

  const getStoredWidth = () => {
    const stored = localStorage.getItem('rightPanelWidth');
    return stored ? parseInt(stored, 10) : 300;
  };

  const getStoredOpen = () => {
    const stored = localStorage.getItem('rightPanelOpen');
    return stored !== 'false';
  };

  const [isOpen, setIsOpen] = createSignal(getStoredOpen());
  const [isResizing, setIsResizing] = createSignal(false);

  let currentWidth = getStoredWidth();

  const isRightPanelOpen = () => propertiesPanelVisible() && isOpen();

  const setRightPanelOpen = (open) => {
    setIsOpen(open);
    localStorage.setItem('rightPanelOpen', String(open));
  };

  onMount(() => {
    if (panelRef) {
      panelRef.style.width = isRightPanelOpen() ? `${currentWidth}px` : '0px';
    }
  });

  const handleResizeStart = () => {
    setIsResizing(true);
    if (panelRef) {
      panelRef.style.transition = 'none';
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    localStorage.setItem('rightPanelWidth', String(currentWidth));
    if (panelRef) {
      panelRef.style.transition = 'width 0.3s';
    }
  };

  const handleResizeMove = (e) => {
    if (!isResizing() || !panelRef) return;

    const minPanelWidth = 180;
    const maxPanelWidth = 500;
    const newWidth = window.innerWidth - e.clientX;
    const clampedWidth = Math.max(minPanelWidth, Math.min(newWidth, maxPanelWidth));

    currentWidth = clampedWidth;
    panelRef.style.width = `${clampedWidth}px`;

    // Notify viewports to resize
    window.dispatchEvent(new Event('viewport-resize'));
  };

  const panelComponent = createMemo(() => rightPanelComponent()?.component);

  return (
    <Show when={propertiesPanelVisible()}>
      <div
        ref={panelRef}
        className="relative no-select flex-shrink-0 h-full"
        style={{
          width: isRightPanelOpen() ? `${currentWidth}px` : '0px',
          transition: 'width 0.3s'
        }}
      >
        <Show when={isRightPanelOpen()}>
          <div className="relative h-full flex">
            <PanelResizer
              type="right"
              isResizing={isResizing}
              onResizeStart={handleResizeStart}
              onResizeEnd={handleResizeEnd}
              onResize={handleResizeMove}
              position={{
                left: '-4px',
                top: 0,
                bottom: 0,
                width: '8px',
                zIndex: 30
              }}
              className="!bg-transparent hover:!bg-transparent"
            />

            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="h-full bg-base-200 border-l border-base-300 shadow-lg overflow-y-auto scrollbar-thin">
                <Show
                  when={panelComponent()}
                  fallback={
                    <div class="h-full flex flex-col items-center justify-center text-center text-base-content/60 p-4">
                      <IconBox class="w-8 h-8 mb-2 opacity-40" />
                      <p class="text-xs">No panel available</p>
                    </div>
                  }
                >
                  <Dynamic component={panelComponent()} />
                </Show>
              </div>
            </div>
          </div>
        </Show>

        <Show when={!isRightPanelOpen()}>
          <div className="relative h-full flex items-center justify-center">
            <button
              onClick={() => setRightPanelOpen(true)}
              className="w-6 h-12 bg-base-300 border border-base-300 rounded-l-lg flex items-center justify-center text-base-content/60 hover:text-primary hover:bg-base-200 transition-colors group"
              title="Open panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-3 h-3">
                <path d="m9 18-6-6 6-6"/>
              </svg>
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default RightPanel;
