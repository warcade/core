/**
 * Theme Editor Viewport
 *
 * Comprehensive UI for editing and customizing themes
 */

import { createSignal, createMemo, For, Show, createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';
import themeEngine, { useTheme } from './ThemeEngine.js';
import { componentSchema, spacingTokens, radiusTokens, shadowTokens, fontSizeTokens, opacityTokens, borderWidthTokens } from './schema.js';
import {
  IconPalette, IconDownload, IconUpload, IconPlus, IconTrash, IconCopy,
  IconChevronRight, IconChevronDown, IconPencil, IconCheck, IconX
} from '@tabler/icons-solidjs';

const ThemeEditor = () => {
  const [selectedCategory, setSelectedCategory] = createSignal('layout');
  const [selectedComponent, setSelectedComponent] = createSignal(null);
  const [expandedCategories, setExpandedCategories] = createStore({});
  const [searchQuery, setSearchQuery] = createSignal('');
  const [, setRefreshTrigger] = createSignal(0); // Force refresh trigger

  // Use reactive theme hook
  const theme = useTheme();
  const currentTheme = () => theme.getTheme();

  // Available component categories
  const categories = [
    { id: 'layout', label: 'Layout', icon: '📐' },
    { id: 'viewport', label: 'Viewport', icon: '🖼️' },
    { id: 'navigation', label: 'Navigation', icon: '🧭' },
    { id: 'form', label: 'Forms', icon: '📝' },
    { id: 'button', label: 'Buttons', icon: '🔘' },
    { id: 'modal', label: 'Modals', icon: '🪟' },
    { id: 'dropdown', label: 'Dropdowns', icon: '▼' },
    { id: 'card', label: 'Cards', icon: '🃏' },
    { id: 'list', label: 'Lists', icon: '📋' },
    { id: 'table', label: 'Tables', icon: '📊' },
    { id: 'properties', label: 'Properties', icon: '⚙️' },
    { id: 'tree', label: 'Tree', icon: '🌳' },
    { id: 'console', label: 'Console', icon: '💻' },
    { id: 'widget', label: 'Widgets', icon: '🧩' },
    { id: 'scrollbar', label: 'Scrollbar', icon: '↕️' },
  ];

  // Get components for selected category
  const componentsInCategory = createMemo(() => {
    const category = selectedCategory();
    const theme = currentTheme();
    if (!theme || !theme[category]) return [];

    // Recursively flatten component tree
    const flatten = (obj, path = []) => {
      const results = [];
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = [...path, key];
        const pathString = currentPath.join('.');

        // If it has states (default/hover/etc), it's a terminal component
        if (value && typeof value === 'object' && (value.default || value.hover || value.active)) {
          results.push({
            path: currentPath,
            pathString: `${category}.${pathString}`,
            displayName: currentPath.map(p =>
              p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
            ).join(' > '),
            states: value
          });
        } else if (value && typeof value === 'object') {
          results.push(...flatten(value, currentPath));
        }
      });
      return results;
    };

    return flatten(theme[category]);
  });

  // Filter components by search query
  const filteredComponents = createMemo(() => {
    const query = searchQuery().toLowerCase();
    if (!query) return componentsInCategory();
    return componentsInCategory().filter(comp =>
      comp.displayName.toLowerCase().includes(query)
    );
  });

  // Handle component selection
  const selectComponent = (component) => {
    setSelectedComponent(component);
  };

  // Update a component style property
  const updateProperty = (componentPath, state, property, value) => {
    const customizations = {};
    const parts = componentPath.split('.');

    // Build nested customization object
    let current = customizations;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = {
          [state]: {
            [property]: value
          }
        };
      } else {
        current[part] = current[part] || {};
        current = current[part];
      }
    });

    themeEngine.customize(customizations);

    // Trigger re-render to show updated values
    setRefreshTrigger(prev => prev + 1);
  };

  // Export current theme
  const exportTheme = () => {
    const json = themeEngine.exportTheme();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTheme().name}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import theme
  const importTheme = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const theme = themeEngine.importTheme(event.target.result);
          if (theme) {
            themeEngine.setTheme(theme.name);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Clear all customizations
  const resetCustomizations = () => {
    themeEngine.clearCustomizations();
    setRefreshTrigger(prev => prev + 1);
  };

  // Save customizations to localStorage
  const saveCustomizations = () => {
    const customizations = theme.getCustomizations();
    localStorage.setItem('theme-customizations', JSON.stringify(customizations));
    localStorage.setItem('theme-customizations-for', currentTheme().name);
    console.log('[Theme Editor] Saved customizations');
  };

  // Load customizations from localStorage
  const loadCustomizations = () => {
    const savedTheme = localStorage.getItem('theme-customizations-for');
    if (savedTheme === currentTheme().name) {
      const saved = localStorage.getItem('theme-customizations');
      if (saved) {
        try {
          const customizations = JSON.parse(saved);
          themeEngine.customize(customizations);
          setRefreshTrigger(prev => prev + 1);
          console.log('[Theme Editor] Loaded customizations');
        } catch (e) {
          console.error('[Theme Editor] Failed to load customizations', e);
        }
      }
    }
  };

  return (
    <div class="h-full w-full flex flex-col bg-base-100">
      {/* Header */}
      <div class="bg-base-200 border-b border-base-300 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <IconPalette size={24} class="text-primary" />
            <div>
              <h1 class="text-xl font-bold text-base-content">Theme Editor</h1>
              <p class="text-sm text-base-content/60">
                Customize every aspect of {currentTheme()?.displayName || 'the theme'}
              </p>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              class="btn btn-sm btn-ghost gap-2"
              onClick={loadCustomizations}
              title="Load saved customizations"
            >
              <IconUpload size={16} />
              Load
            </button>
            <button
              class="btn btn-sm btn-ghost gap-2"
              onClick={saveCustomizations}
              title="Save customizations to browser"
            >
              <IconDownload size={16} />
              Save
            </button>
            <button
              class="btn btn-sm btn-ghost gap-2"
              onClick={resetCustomizations}
              title="Reset all customizations"
            >
              <IconTrash size={16} />
              Reset
            </button>
            <div class="divider divider-horizontal mx-1"></div>
            <button
              class="btn btn-sm btn-ghost gap-2"
              onClick={importTheme}
              title="Import theme from file"
            >
              <IconUpload size={16} />
              Import
            </button>
            <button
              class="btn btn-sm btn-ghost gap-2"
              onClick={exportTheme}
              title="Export theme to file"
            >
              <IconDownload size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div class="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Category Selection */}
        <div class="w-56 bg-base-200 border-r border-base-300 overflow-y-auto">
          <div class="p-4">
            <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-3">
              Categories
            </div>
            <div class="space-y-1">
              <For each={categories}>
                {(category) => (
                  <button
                    class={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                      selectedCategory() === category.id
                        ? 'bg-primary text-primary-content font-medium'
                        : 'hover:bg-base-300 text-base-content'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span class="text-lg">{category.icon}</span>
                    <span>{category.label}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Component List */}
        <div class="w-64 bg-base-100 border-r border-base-300 flex flex-col">
          <div class="p-3 border-b border-base-300">
            <input
              type="text"
              placeholder="Search components..."
              class="input input-sm input-bordered w-full"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div class="flex-1 overflow-y-auto p-2">
            <div class="space-y-1">
              <For each={filteredComponents()}>
                {(component) => (
                  <button
                    class={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedComponent()?.pathString === component.pathString
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'hover:bg-base-200 text-base-content'
                    }`}
                    onClick={() => selectComponent(component)}
                  >
                    <div class="font-medium text-xs">{component.path[component.path.length - 1]}</div>
                    <div class="text-[10px] text-base-content/60 truncate">
                      {component.pathString}
                    </div>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Center - Property Editor */}
        <div class="flex-1 overflow-y-auto bg-base-100">
          <Show
            when={selectedComponent()}
            fallback={
              <div class="h-full flex items-center justify-center text-base-content/40">
                <div class="text-center">
                  <IconPalette size={64} class="mx-auto mb-4 opacity-20" />
                  <p class="text-lg">Select a component to edit its styles</p>
                </div>
              </div>
            }
          >
            <div class="p-6">
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-base-content mb-1">
                  {selectedComponent().path[selectedComponent().path.length - 1]}
                </h2>
                <p class="text-sm text-base-content/60">{selectedComponent().pathString}</p>
              </div>

              {/* States */}
              <For each={Object.entries(selectedComponent().states)}>
                {([state, styles]) => (
                  <div class="mb-8">
                    <div class="flex items-center gap-2 mb-4">
                      <div class={`px-3 py-1 rounded-full text-xs font-semibold ${
                        state === 'default' ? 'bg-primary/20 text-primary' :
                        state === 'hover' ? 'bg-info/20 text-info' :
                        state === 'active' ? 'bg-success/20 text-success' :
                        state === 'focus' ? 'bg-warning/20 text-warning' :
                        state === 'disabled' ? 'bg-error/20 text-error' :
                        'bg-base-300 text-base-content'
                      }`}>
                        {state.toUpperCase()}
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                      <For each={Object.entries(styles)}>
                        {([property, value]) => (
                          <PropertyEditor
                            componentPath={selectedComponent().pathString}
                            state={state}
                            property={property}
                            value={value}
                            onUpdate={updateProperty}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Right Panel - Live Preview */}
        <div class="w-96 bg-base-200 border-l border-base-300 overflow-y-auto">
          <div class="p-4">
            <div class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-4">
              Live Preview
            </div>

            <div class="space-y-6">
              {/* Buttons Preview */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Buttons</div>
                <div class="flex flex-wrap gap-2">
                  <button class="theme-button-primary px-4 py-2 rounded">Primary</button>
                  <button class="theme-button-secondary px-4 py-2 rounded">Secondary</button>
                  <button class="theme-button-ghost px-4 py-2 rounded">Ghost</button>
                  <button class="theme-button-icon p-2 rounded">🎨</button>
                </div>
              </div>

              {/* Form Elements */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Form Elements</div>
                <div class="space-y-3">
                  <input type="text" placeholder="Input field" class="input input-bordered w-full input-sm" />
                  <select class="select select-bordered w-full select-sm">
                    <option>Select option</option>
                    <option>Option 1</option>
                    <option>Option 2</option>
                  </select>
                  <div class="flex items-center gap-2">
                    <input type="checkbox" class="checkbox checkbox-sm" />
                    <span class="text-sm">Checkbox</span>
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Cards</div>
                <div class="card bg-base-200 border border-base-300">
                  <div class="card-body p-3">
                    <h3 class="card-title text-sm">Card Title</h3>
                    <p class="text-xs">This is a sample card component</p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Badges</div>
                <div class="flex flex-wrap gap-2">
                  <span class="badge badge-primary badge-sm">Primary</span>
                  <span class="badge badge-secondary badge-sm">Secondary</span>
                  <span class="badge badge-accent badge-sm">Accent</span>
                  <span class="badge badge-sm">Default</span>
                </div>
              </div>

              {/* Typography */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Typography</div>
                <div class="space-y-2">
                  <h1 class="text-2xl font-bold">Heading 1</h1>
                  <h2 class="text-xl font-semibold">Heading 2</h2>
                  <h3 class="text-lg font-medium">Heading 3</h3>
                  <p class="text-sm text-base-content/70">Body text with some content</p>
                  <p class="text-xs text-base-content/50">Small text for details</p>
                </div>
              </div>

              {/* Colors */}
              <div class="bg-base-100 rounded-lg p-4 border border-base-300">
                <div class="text-xs font-semibold text-base-content/70 mb-3">Color Palette</div>
                <div class="grid grid-cols-3 gap-2">
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-primary"></div>
                    <span class="text-[10px]">Primary</span>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-secondary"></div>
                    <span class="text-[10px]">Secondary</span>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-accent"></div>
                    <span class="text-[10px]">Accent</span>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-base-100 border border-base-300"></div>
                    <span class="text-[10px]">Base 100</span>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-base-200"></div>
                    <span class="text-[10px]">Base 200</span>
                  </div>
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-12 h-12 rounded bg-base-300"></div>
                    <span class="text-[10px]">Base 300</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Property Editor Component
 */
const PropertyEditor = (props) => {
  const theme = useTheme();
  const currentTheme = () => theme.getTheme();

  // Get the current value (including customizations)
  const getCurrentValue = () => {
    const customizations = theme.getCustomizations();
    const parts = props.componentPath.split('.');

    // Try to get customized value first
    let current = customizations;
    for (const part of parts) {
      if (current?.[part]) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }

    // If we found a customization for this state and property, use it
    if (current?.[props.state]?.[props.property] !== undefined) {
      return current[props.state][props.property];
    }

    // Otherwise use the original value
    return props.value;
  };

  const renderInput = () => {
    const { property, componentPath, state, onUpdate } = props;
    const value = getCurrentValue();

    // Color properties
    if (property.includes('color') || property === 'background') {
      const actualValue = typeof value === 'string' && value.startsWith('#')
        ? value
        : currentTheme().colors[value] || value;

      return (
        <div class="flex gap-2">
          <input
            type="color"
            value={actualValue}
            onInput={(e) => onUpdate(componentPath, state, property, e.target.value)}
            class="w-12 h-8 rounded border border-base-300 cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onInput={(e) => onUpdate(componentPath, state, property, e.target.value)}
            class="input input-sm input-bordered flex-1"
            placeholder="Color token or hex"
          />
        </div>
      );
    }

    // Spacing properties
    if (property.includes('padding') || property.includes('margin') || property === 'gap') {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, e.target.value)}
          class="select select-sm select-bordered w-full"
        >
          <For each={Object.keys(spacingTokens)}>
            {(token) => <option value={token}>{token} ({spacingTokens[token]})</option>}
          </For>
        </select>
      );
    }

    // Border radius
    if (property.includes('radius')) {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, e.target.value)}
          class="select select-sm select-bordered w-full"
        >
          <For each={Object.keys(radiusTokens)}>
            {(token) => <option value={token}>{token} ({radiusTokens[token]})</option>}
          </For>
        </select>
      );
    }

    // Shadow
    if (property === 'shadow') {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, e.target.value)}
          class="select select-sm select-bordered w-full"
        >
          <For each={Object.keys(shadowTokens)}>
            {(token) => <option value={token}>{token}</option>}
          </For>
        </select>
      );
    }

    // Font size
    if (property === 'fontSize') {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, e.target.value)}
          class="select select-sm select-bordered w-full"
        >
          <For each={Object.keys(fontSizeTokens)}>
            {(token) => <option value={token}>{token} ({fontSizeTokens[token]})</option>}
          </For>
        </select>
      );
    }

    // Opacity
    if (property === 'opacity') {
      return (
        <div class="flex gap-2 items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={value}
            onInput={(e) => onUpdate(componentPath, state, property, parseInt(e.target.value))}
            class="range range-sm flex-1"
          />
          <span class="text-sm text-base-content/60 w-12 text-right">{value}%</span>
        </div>
      );
    }

    // Border width
    if (property.includes('borderWidth')) {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, e.target.value)}
          class="select select-sm select-bordered w-full"
        >
          <For each={Object.keys(borderWidthTokens)}>
            {(token) => <option value={token}>{token} ({borderWidthTokens[token]})</option>}
          </For>
        </select>
      );
    }

    // Font weight
    if (property === 'fontWeight') {
      return (
        <select
          value={value}
          onChange={(e) => onUpdate(componentPath, state, property, parseInt(e.target.value))}
          class="select select-sm select-bordered w-full"
        >
          <option value="100">Thin (100)</option>
          <option value="200">Extra Light (200)</option>
          <option value="300">Light (300)</option>
          <option value="400">Normal (400)</option>
          <option value="500">Medium (500)</option>
          <option value="600">Semi Bold (600)</option>
          <option value="700">Bold (700)</option>
          <option value="800">Extra Bold (800)</option>
          <option value="900">Black (900)</option>
        </select>
      );
    }

    // Default text input
    return (
      <input
        type="text"
        value={value}
        onInput={(e) => onUpdate(componentPath, state, property, e.target.value)}
        class="input input-sm input-bordered w-full"
      />
    );
  };

  return (
    <div>
      <label class="block text-xs font-medium text-base-content/70 mb-1">
        {props.property.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
      </label>
      {renderInput()}
    </div>
  );
};

export default ThemeEditor;
