import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import { editorStore } from './store.jsx';
import {
  IconSun,
  IconContrast,
  IconDroplet,
  IconColorFilter,
  IconExposure,
  IconTemperature,
  IconSparkles,
  IconShadow,
  IconHighlight,
  IconAdjustments,
  IconLayersSubtract,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconPhoto,
  IconChevronDown,
  IconChevronRight,
  IconRefresh
} from '@tabler/icons-solidjs';

const adjustmentPresets = [
  { id: 'vivid', name: 'Vivid', adjustments: { saturation: 30, contrast: 10 } },
  { id: 'warm', name: 'Warm', adjustments: { temperature: 30 } },
  { id: 'cool', name: 'Cool', adjustments: { temperature: -30 } },
  { id: 'dramatic', name: 'Dramatic', adjustments: { contrast: 30, shadows: -20, highlights: 20 } },
  { id: 'faded', name: 'Faded', adjustments: { contrast: -20, brightness: 10 } },
  { id: 'noir', name: 'Noir', adjustments: { saturation: -100, contrast: 30 } },
];

export default function PropertiesPanel() {
  const state = editorStore.state;
  const [activeTab, setActiveTab] = createSignal('adjustments');
  const [expandedSections, setExpandedSections] = createSignal(['basic', 'layers']);
  const [isApplying, setIsApplying] = createSignal(false);
  const [layers, setLayers] = createSignal([]);

  // Adjustment values (local state for live preview)
  const [adjustments, setAdjustments] = createSignal({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    exposure: 0,
    temperature: 0,
    vibrance: 0,
    shadows: 0,
    highlights: 0
  });

  const refreshLayers = () => {
    // Get layer info from store
    const layerInfo = editorStore.layers.map(l => ({
      id: l.id,
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      data_url: l.toDataURL()
    }));
    setLayers(layerInfo);
  };

  onMount(() => {
    refreshLayers();

    // Refresh layers periodically
    const interval = setInterval(refreshLayers, 1000);

    return () => clearInterval(interval);
  });

  const toggleSection = (section) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const applyAdjustment = (type, value) => {
    setIsApplying(true);

    editorStore.applyFilter(type, { value });
    window.dispatchEvent(new CustomEvent('snapshot:render'));

    setIsApplying(false);
  };

  const applyFilter = (filterName) => {
    editorStore.applyFilter(filterName);
    window.dispatchEvent(new CustomEvent('snapshot:render'));
  };

  const applyPreset = (preset) => {
    setIsApplying(true);

    for (const [type, value] of Object.entries(preset.adjustments)) {
      editorStore.applyFilter(type, { value });
    }

    window.dispatchEvent(new CustomEvent('snapshot:render'));
    setIsApplying(false);
  };

  const resetAdjustments = () => {
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      exposure: 0,
      temperature: 0,
      vibrance: 0,
      shadows: 0,
      highlights: 0
    });
  };

  // Layer management
  const addLayer = () => {
    editorStore.addLayer();
    refreshLayers();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
  };

  const deleteLayer = (layerId) => {
    editorStore.removeLayer(layerId);
    refreshLayers();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
  };

  const toggleLayerVisibility = (layer) => {
    const storeLayer = editorStore.getLayer(layer.id);
    if (storeLayer) {
      storeLayer.visible = !storeLayer.visible;
      refreshLayers();
      window.dispatchEvent(new CustomEvent('snapshot:render'));
    }
  };

  const selectLayer = (layerId) => {
    editorStore.setActiveLayer(layerId);
  };

  const updateLayerOpacity = (layerId, opacity) => {
    const storeLayer = editorStore.getLayer(layerId);
    if (storeLayer) {
      storeLayer.opacity = opacity;
      refreshLayers();
      window.dispatchEvent(new CustomEvent('snapshot:render'));
    }
  };

  const updateLayerBlendMode = (layerId, blendMode) => {
    const storeLayer = editorStore.getLayer(layerId);
    if (storeLayer) {
      storeLayer.blendMode = blendMode;
      refreshLayers();
      window.dispatchEvent(new CustomEvent('snapshot:render'));
    }
  };

  const moveLayerUp = (layerId) => {
    editorStore.moveLayer(layerId, 'up');
    refreshLayers();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
  };

  const moveLayerDown = (layerId) => {
    editorStore.moveLayer(layerId, 'down');
    refreshLayers();
    window.dispatchEvent(new CustomEvent('snapshot:render'));
  };

  return (
    <div class="h-full flex flex-col bg-base-200 overflow-hidden">
      {/* Tabs */}
      <div class="flex border-b border-base-300">
        <button
          class={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab() === 'adjustments'
              ? 'bg-base-100 text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content/80'
          }`}
          onClick={() => setActiveTab('adjustments')}
        >
          <IconAdjustments class="w-4 h-4 inline-block mr-1" />
          Adjustments
        </button>
        <button
          class={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab() === 'layers'
              ? 'bg-base-100 text-primary border-b-2 border-primary'
              : 'text-base-content/60 hover:text-base-content/80'
          }`}
          onClick={() => setActiveTab('layers')}
        >
          <IconLayersSubtract class="w-4 h-4 inline-block mr-1" />
          Layers
        </button>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-y-auto">
        <Show when={activeTab() === 'adjustments'}>
          <div class="p-3">
            {/* Presets */}
            <div class="mb-4">
              <button
                class="flex items-center justify-between w-full text-xs font-medium text-base-content/70 mb-2"
                onClick={() => toggleSection('presets')}
              >
                <span>Presets</span>
                {expandedSections().includes('presets') ? <IconChevronDown class="w-4 h-4" /> : <IconChevronRight class="w-4 h-4" />}
              </button>
              <Show when={expandedSections().includes('presets')}>
                <div class="grid grid-cols-3 gap-1">
                  <For each={adjustmentPresets}>
                    {(preset) => (
                      <button
                        class="px-2 py-1.5 text-xs bg-base-300 hover:bg-base-100 rounded transition-colors"
                        onClick={() => applyPreset(preset)}
                        disabled={isApplying()}
                      >
                        {preset.name}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            {/* Basic Adjustments */}
            <div class="mb-4">
              <button
                class="flex items-center justify-between w-full text-xs font-medium text-base-content/70 mb-2"
                onClick={() => toggleSection('basic')}
              >
                <span>Basic</span>
                {expandedSections().includes('basic') ? <IconChevronDown class="w-4 h-4" /> : <IconChevronRight class="w-4 h-4" />}
              </button>
              <Show when={expandedSections().includes('basic')}>
                <div class="space-y-3">
                  <AdjustmentSlider
                    icon={IconSun}
                    label="Brightness"
                    value={adjustments().brightness}
                    onChange={(v) => setAdjustments(prev => ({ ...prev, brightness: v }))}
                    onChangeEnd={(v) => applyAdjustment('brightness', v)}
                    min={-100}
                    max={100}
                    disabled={isApplying()}
                  />
                  <AdjustmentSlider
                    icon={IconContrast}
                    label="Contrast"
                    value={adjustments().contrast}
                    onChange={(v) => setAdjustments(prev => ({ ...prev, contrast: v }))}
                    onChangeEnd={(v) => applyAdjustment('contrast', v)}
                    min={-100}
                    max={100}
                    disabled={isApplying()}
                  />
                  <AdjustmentSlider
                    icon={IconDroplet}
                    label="Saturation"
                    value={adjustments().saturation}
                    onChange={(v) => setAdjustments(prev => ({ ...prev, saturation: v }))}
                    onChangeEnd={(v) => applyAdjustment('saturation', v)}
                    min={-100}
                    max={100}
                    disabled={isApplying()}
                  />
                </div>
              </Show>
            </div>

            {/* Filters */}
            <div class="mb-4">
              <button
                class="flex items-center justify-between w-full text-xs font-medium text-base-content/70 mb-2"
                onClick={() => toggleSection('filters')}
              >
                <span>Quick Filters</span>
                {expandedSections().includes('filters') ? <IconChevronDown class="w-4 h-4" /> : <IconChevronRight class="w-4 h-4" />}
              </button>
              <Show when={expandedSections().includes('filters')}>
                <div class="grid grid-cols-2 gap-1">
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('grayscale')}>Grayscale</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('sepia')}>Sepia</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('invert')}>Invert</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('emboss')}>Emboss</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('edge')}>Edge Detect</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('blur')}>Blur</button>
                  <button class="btn btn-xs btn-ghost justify-start" onClick={() => applyFilter('sharpen')}>Sharpen</button>
                </div>
              </Show>
            </div>

            {/* Reset button */}
            <button
              class="btn btn-sm btn-outline btn-block mt-4"
              onClick={resetAdjustments}
            >
              <IconRefresh class="w-4 h-4 mr-1" />
              Reset All
            </button>
          </div>
        </Show>

        <Show when={activeTab() === 'layers'}>
          <div class="p-3">
            {/* Layer controls */}
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-base-content/70">Layers</span>
              <div class="flex gap-1">
                <button
                  class="btn btn-xs btn-ghost btn-square"
                  onClick={addLayer}
                  title="Add Layer"
                >
                  <IconPlus class="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Layer list */}
            <div class="space-y-1">
              <For each={[...layers()].reverse()}>
                {(layer) => (
                  <div
                    class={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer ${
                      state().activeLayerId === layer.id
                        ? 'bg-primary/20 border border-primary/40'
                        : 'bg-base-300 hover:bg-base-100'
                    }`}
                    onClick={() => selectLayer(layer.id)}
                  >
                    {/* Thumbnail */}
                    <div class="w-10 h-10 bg-base-100 rounded overflow-hidden flex-shrink-0">
                      <Show when={layer.data_url}>
                        <img
                          src={layer.data_url}
                          class="w-full h-full object-cover"
                          alt={layer.name}
                        />
                      </Show>
                      <Show when={!layer.data_url}>
                        <div class="w-full h-full flex items-center justify-center">
                          <IconPhoto class="w-4 h-4 text-base-content/30" />
                        </div>
                      </Show>
                    </div>

                    {/* Layer info */}
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-medium truncate">{layer.name}</div>
                      <div class="text-xs text-base-content/50">
                        {Math.round(layer.opacity * 100)}% opacity
                      </div>
                    </div>

                    {/* Layer actions */}
                    <div class="flex items-center gap-1">
                      <button
                        class="btn btn-xs btn-ghost btn-square"
                        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer); }}
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? <IconEye class="w-3 h-3" /> : <IconEyeOff class="w-3 h-3" />}
                      </button>
                      <button
                        class="btn btn-xs btn-ghost btn-square"
                        onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
                        title="Move Up"
                      >
                        <IconArrowUp class="w-3 h-3" />
                      </button>
                      <button
                        class="btn btn-xs btn-ghost btn-square"
                        onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
                        title="Move Down"
                      >
                        <IconArrowDown class="w-3 h-3" />
                      </button>
                      <button
                        class="btn btn-xs btn-ghost btn-square text-error"
                        onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                        title="Delete Layer"
                        disabled={layers().length <= 1}
                      >
                        <IconTrash class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>

            {/* Layer opacity */}
            <Show when={state().activeLayerId}>
              <div class="mt-4 p-3 bg-base-300 rounded">
                <div class="text-xs font-medium mb-2">Layer Opacity</div>
                <input
                  type="range"
                  class="range range-primary range-xs w-full"
                  min="0"
                  max="100"
                  value={(layers().find(l => l.id === state().activeLayerId)?.opacity || 1) * 100}
                  onInput={(e) => {
                    const opacity = parseInt(e.target.value) / 100;
                    updateLayerOpacity(state().activeLayerId, opacity);
                  }}
                />
              </div>
            </Show>

            {/* Blend modes */}
            <Show when={state().activeLayerId}>
              <div class="mt-3">
                <div class="text-xs font-medium mb-2">Blend Mode</div>
                <select
                  class="select select-bordered select-xs w-full"
                  value={layers().find(l => l.id === state().activeLayerId)?.blendMode || 'source-over'}
                  onChange={(e) => {
                    updateLayerBlendMode(state().activeLayerId, e.target.value);
                  }}
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="darken">Darken</option>
                  <option value="lighten">Lighten</option>
                  <option value="color-dodge">Color Dodge</option>
                  <option value="color-burn">Color Burn</option>
                  <option value="hard-light">Hard Light</option>
                  <option value="soft-light">Soft Light</option>
                  <option value="difference">Difference</option>
                  <option value="exclusion">Exclusion</option>
                </select>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}

function AdjustmentSlider(props) {
  const [localValue, setLocalValue] = createSignal(props.value);

  createEffect(() => {
    setLocalValue(props.value);
  });

  return (
    <div class="space-y-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-base-content/70">
          <props.icon class="w-3.5 h-3.5" />
          <span>{props.label}</span>
        </div>
        <span class="text-xs font-mono text-base-content/50">
          {localValue() > 0 ? '+' : ''}{localValue()}
        </span>
      </div>
      <input
        type="range"
        class="range range-primary range-xs w-full"
        min={props.min}
        max={props.max}
        value={localValue()}
        disabled={props.disabled}
        onInput={(e) => {
          const value = parseInt(e.target.value);
          setLocalValue(value);
          props.onChange?.(value);
        }}
        onChange={(e) => {
          const value = parseInt(e.target.value);
          props.onChangeEnd?.(value);
        }}
      />
    </div>
  );
}
