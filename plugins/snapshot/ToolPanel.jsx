import { editorStore } from './store.jsx';

export default function ToolPanel() {
  const state = editorStore.state;

  const swapColors = () => {
    editorStore.swapColors();
  };

  const resetColors = () => {
    editorStore.setColor('#000000');
    editorStore.setSecondaryColor('#ffffff');
  };

  return (
    <div class="h-full flex flex-col bg-base-200 overflow-hidden">
      {/* Header */}
      <div class="px-3 py-2 border-b border-base-300">
        <h3 class="text-sm font-semibold text-base-content/70">Colors & Brush</h3>
      </div>

      {/* Color picker section */}
      <div class="p-3">
        <div class="flex items-center gap-3">
          {/* Foreground/Background color boxes */}
          <div class="relative w-16 h-16">
            {/* Background color */}
            <div
              class="absolute bottom-0 right-0 w-10 h-10 rounded border-2 border-base-content/20 cursor-pointer"
              style={{ "background-color": state().secondaryColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = state().secondaryColor;
                input.onchange = (e) => editorStore.setSecondaryColor(e.target.value);
                input.click();
              }}
              title="Background Color"
            />
            {/* Foreground color */}
            <div
              class="absolute top-0 left-0 w-10 h-10 rounded border-2 border-base-content/40 cursor-pointer shadow-md z-10"
              style={{ "background-color": state().color }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = state().color;
                input.onchange = (e) => editorStore.setColor(e.target.value);
                input.click();
              }}
              title="Foreground Color"
            />
          </div>

          {/* Swap and reset buttons */}
          <div class="flex flex-col gap-1">
            <button
              class="btn btn-xs btn-ghost"
              onClick={swapColors}
              title="Swap Colors (X)"
            >
              ⇄
            </button>
            <button
              class="btn btn-xs btn-ghost"
              onClick={resetColors}
              title="Reset Colors (D)"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Quick color swatches */}
        <div class="mt-3">
          <div class="text-xs text-base-content/60 mb-1">Quick Colors</div>
          <div class="flex flex-wrap gap-1">
            {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff'].map(color => (
              <button
                class="w-5 h-5 rounded border border-base-content/20 hover:scale-110 transition-transform"
                style={{ "background-color": color }}
                onClick={() => editorStore.setColor(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Brush settings */}
      <div class="border-t border-base-300 p-3">
        <div class="text-xs text-base-content/60 mb-2">Brush Settings</div>

        {/* Size */}
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span>Size</span>
            <span>{state().brushSize}px</span>
          </div>
          <input
            type="range"
            class="range range-primary range-xs w-full"
            min="1"
            max="200"
            value={state().brushSize}
            onInput={(e) => editorStore.setBrushSize(parseInt(e.target.value))}
          />
        </div>

        {/* Opacity */}
        <div class="mb-3">
          <div class="flex justify-between text-xs mb-1">
            <span>Opacity</span>
            <span>{Math.round(state().brushOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            class="range range-primary range-xs w-full"
            min="0"
            max="100"
            value={state().brushOpacity * 100}
            onInput={(e) => editorStore.setBrushOpacity(parseInt(e.target.value) / 100)}
          />
        </div>

        {/* Hardness */}
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span>Hardness</span>
            <span>{Math.round(state().brushHardness * 100)}%</span>
          </div>
          <input
            type="range"
            class="range range-primary range-xs w-full"
            min="0"
            max="100"
            value={state().brushHardness * 100}
            onInput={(e) => editorStore.setState(prev => ({ ...prev, brushHardness: parseInt(e.target.value) / 100 }))}
          />
        </div>
      </div>

      {/* Current tool indicator */}
      <div class="border-t border-base-300 p-3 mt-auto">
        <div class="text-xs text-base-content/60 mb-1">Current Tool</div>
        <div class="text-sm font-medium text-base-content capitalize">{state().tool}</div>
      </div>
    </div>
  );
}
