import { createSignal, For, Show, onMount, onCleanup, createEffect } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { editorStore } from './store.jsx';
import {
  IconHistory,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconPhoto,
  IconAdjustments,
  IconBrush,
  IconCrop,
  IconFilter,
  IconLayersSubtract,
  IconRotate,
  IconFlipHorizontal,
  IconWand
} from '@tabler/icons-solidjs';

// Map action names to icons
const actionIcons = {
  'Open Image': IconPhoto,
  'New Canvas': IconPhoto,
  'Brightness': IconAdjustments,
  'Contrast': IconAdjustments,
  'Saturation': IconAdjustments,
  'Hue Shift': IconAdjustments,
  'Exposure': IconAdjustments,
  'Temperature': IconAdjustments,
  'Vibrance': IconAdjustments,
  'Shadows': IconAdjustments,
  'Highlights': IconAdjustments,
  'Levels': IconAdjustments,
  'Curves': IconAdjustments,
  'Grayscale': IconFilter,
  'Sepia': IconFilter,
  'Invert': IconFilter,
  'Blur': IconFilter,
  'Sharpen': IconFilter,
  'Add Noise': IconFilter,
  'Denoise': IconFilter,
  'Vignette': IconFilter,
  'Posterize': IconFilter,
  'Threshold': IconFilter,
  'Emboss': IconFilter,
  'Edge Detect': IconFilter,
  'Pixelate': IconFilter,
  'Oil Paint': IconFilter,
  'Rotate': IconRotate,
  'Flip Horizontal': IconFlipHorizontal,
  'Flip Vertical': IconFlipHorizontal,
  'Crop': IconCrop,
  'Resize': IconCrop,
  'Brush': IconBrush,
  'Eraser': IconBrush,
  'Fill': IconBrush,
  'Gradient': IconBrush,
  'Add Text': IconBrush,
  'Draw Shape': IconBrush,
  'Draw Line': IconBrush,
  'Spot Heal': IconWand,
  'Clone Stamp': IconWand,
  'Add Layer': IconLayersSubtract,
  'Remove Layer': IconLayersSubtract,
  'Merge Layers': IconLayersSubtract,
  'Layer Opacity': IconLayersSubtract,
  'Blend Mode': IconLayersSubtract,
  'Reorder Layers': IconLayersSubtract,
  'Apply Changes': IconPhoto,
};

export default function HistoryPanel() {
  const state = editorStore.state;
  const [history, setHistory] = createSignal([]);
  const [isLoading, setIsLoading] = createSignal(false);

  const loadHistory = () => {
    setHistory(editorStore.getHistoryList());
  };

  const goToState = async (index) => {
    const currentIdx = editorStore.historyIndex;
    if (index === currentIdx) return;

    setIsLoading(true);

    const diff = currentIdx - index;

    if (diff > 0) {
      // Need to undo
      for (let i = 0; i < diff; i++) {
        await editorStore.undo();
      }
    } else {
      // Need to redo
      for (let i = 0; i < Math.abs(diff); i++) {
        await editorStore.redo();
      }
    }

    window.dispatchEvent(new CustomEvent('snapshot:render'));
    loadHistory();
    setIsLoading(false);
  };

  const handleUndo = async () => {
    if (!state().canUndo) return;

    setIsLoading(true);
    await editorStore.undo();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
    loadHistory();
    setIsLoading(false);
  };

  const handleRedo = async () => {
    if (!state().canRedo) return;

    setIsLoading(true);
    await editorStore.redo();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
    loadHistory();
    setIsLoading(false);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getIcon = (action) => {
    return actionIcons[action] || IconHistory;
  };

  // Load history on mount and set up refresh interval
  onMount(() => {
    loadHistory();

    // Refresh history every 2 seconds
    const interval = setInterval(loadHistory, 2000);

    // Listen for render updates
    const renderHandler = () => loadHistory();
    window.addEventListener('snapshot:render', renderHandler);

    onCleanup(() => {
      clearInterval(interval);
      window.removeEventListener('snapshot:render', renderHandler);
    });
  });

  // Also react to state changes
  createEffect(() => {
    // Track canUndo/canRedo changes to refresh history
    state().canUndo;
    state().canRedo;
    loadHistory();
  });

  return (
    <div class="h-full flex flex-col bg-base-200">
      {/* Header with undo/redo buttons */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-base-300">
        <div class="flex items-center gap-2">
          <IconHistory class="w-4 h-4 text-base-content/60" />
          <span class="text-sm font-medium text-base-content/80">History</span>
          <span class="text-xs text-base-content/50">
            ({history().length} states)
          </span>
        </div>
        <div class="flex items-center gap-1">
          <button
            class={`btn btn-xs btn-ghost ${!state().canUndo ? 'opacity-50' : ''}`}
            onClick={handleUndo}
            disabled={!state().canUndo || isLoading()}
            title="Undo (Ctrl+Z)"
          >
            <IconArrowBackUp class="w-4 h-4" />
          </button>
          <button
            class={`btn btn-xs btn-ghost ${!state().canRedo ? 'opacity-50' : ''}`}
            onClick={handleRedo}
            disabled={!state().canRedo || isLoading()}
            title="Redo (Ctrl+Y)"
          >
            <IconArrowForwardUp class="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History list */}
      <div class="flex-1 overflow-x-auto">
        <div class="flex items-stretch gap-1 p-2 min-w-max h-full">
          <Show when={history().length === 0}>
            <div class="flex items-center justify-center text-base-content/40 text-sm px-4">
              No history yet
            </div>
          </Show>

          <For each={history()}>
            {(entry, index) => {
              const isCurrent = entry.current;
              const isPast = index() < editorStore.historyIndex;

              return (
                <button
                  class={`flex flex-col items-center gap-1 px-3 py-2 rounded transition-all min-w-[80px] ${
                    isCurrent
                      ? 'bg-primary text-primary-content'
                      : isPast
                        ? 'bg-base-300/50 text-base-content/50 hover:bg-base-300'
                        : 'bg-base-300 text-base-content/70 hover:bg-base-100'
                  }`}
                  onClick={() => goToState(index())}
                  disabled={isLoading()}
                  title={`${entry.action} - ${formatTimestamp(entry.timestamp)}`}
                >
                  <div class="relative">
                    <Dynamic component={getIcon(entry.action)} class="w-5 h-5" />
                    <Show when={isCurrent}>
                      <div class="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full" />
                    </Show>
                  </div>
                  <span class="text-xs truncate max-w-[70px]">{entry.action}</span>
                  <span class="text-[10px] opacity-60">{formatTimestamp(entry.timestamp)}</span>
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* Status bar */}
      <div class="flex items-center justify-between px-3 py-1 border-t border-base-300 text-xs text-base-content/50">
        <span>
          State {editorStore.historyIndex + 1} of {history().length}
        </span>
        <Show when={isLoading()}>
          <span class="animate-pulse">Loading...</span>
        </Show>
      </div>
    </div>
  );
}
