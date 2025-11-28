import PanelResizer from '@/ui/PanelResizer.jsx';
import { leftPanelComponent, leftPanelVisible } from '@/api/plugin';
import { Show, createSignal, createMemo, onMount } from 'solid-js';
import { IconBox } from '@tabler/icons-solidjs';
import { Dynamic } from 'solid-js/web';

const LeftPanel = () => {
  let panelRef;

  const getStoredWidth = () => {
    const stored = localStorage.getItem('leftPanelWidth');
    return stored ? parseInt(stored, 10) : 240;
  };

  const getStoredOpen = () => {
    const stored = localStorage.getItem('leftPanelOpen');
    return stored !== 'false';
  };

  const [isOpen, setIsOpen] = createSignal(getStoredOpen());
  const [isResizing, setIsResizing] = createSignal(false);

  let currentWidth = getStoredWidth();

  const isLeftPanelOpen = () => leftPanelVisible() && isOpen();

  const setLeftPanelOpen = (open) => {
    setIsOpen(open);
    localStorage.setItem('leftPanelOpen', String(open));
  };

  onMount(() => {
    if (panelRef) {
      panelRef.style.width = isLeftPanelOpen() ? `${currentWidth}px` : '0px';
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
    localStorage.setItem('leftPanelWidth', String(currentWidth));
    if (panelRef) {
      panelRef.style.transition = 'width 0.3s';
    }
  };

  const handleResizeMove = (e) => {
    if (!isResizing() || !panelRef) return;

    const minPanelWidth = 180;
    const maxPanelWidth = 500;
    const newWidth = Math.max(minPanelWidth, Math.min(e.clientX, maxPanelWidth, window.innerWidth / 2));

    currentWidth = newWidth;
    panelRef.style.width = `${newWidth}px`;

    // Notify viewports to resize
    window.dispatchEvent(new Event('viewport-resize'));
  };

  const panelComponent = createMemo(() => leftPanelComponent()?.component);

  return (
    <Show when={leftPanelVisible()}>
      <div
        ref={panelRef}
        className="relative no-select flex-shrink-0 h-full"
        style={{
          width: isLeftPanelOpen() ? `${currentWidth}px` : '0px',
          transition: 'width 0.3s'
        }}
      >
        <Show when={isLeftPanelOpen()}>
          <div className="relative h-full flex">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="h-full bg-base-200 border-r border-base-300 shadow-lg overflow-y-auto scrollbar-thin">
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

            <PanelResizer
              type="left"
              isResizing={isResizing}
              onResizeStart={handleResizeStart}
              onResizeEnd={handleResizeEnd}
              onResize={handleResizeMove}
              position={{
                right: '-4px',
                top: 0,
                bottom: 0,
                width: '8px',
                zIndex: 30
              }}
              className="!bg-transparent hover:!bg-transparent"
            />
          </div>
        </Show>

        <Show when={!isLeftPanelOpen()}>
          <div className="relative h-full flex items-center justify-center">
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="w-6 h-12 bg-base-300 border border-base-300 rounded-r-lg flex items-center justify-center text-base-content/60 hover:text-primary hover:bg-base-200 transition-colors group"
              title="Open panel"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" className="w-3 h-3">
                <path d="m15 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
};

export default LeftPanel;
