import { createSignal, For, Show, onMount } from 'solid-js';
import { usePluginAPI } from '@/api/plugin';
import { IconGripVertical, IconX, IconColumns1, IconColumns2 } from '@tabler/icons-solidjs';

export default function WidgetGrid() {
  const api = usePluginAPI();
  const [widgetLayout, setWidgetLayout] = createSignal([]);
  const [availableWidgets, setAvailableWidgets] = createSignal([]);
  const [draggedItem, setDraggedItem] = createSignal(null);
  const [dragOverIndex, setDragOverIndex] = createSignal(null);
  const [isDragging, setIsDragging] = createSignal(false);

  onMount(() => {
    // Small delay to ensure plugins are loaded
    setTimeout(() => {
      // Get all available widgets
      const allWidgets = api.getWidgets();
      console.log('[WidgetGrid] All widgets:', allWidgets);
      setAvailableWidgets(allWidgets);

      // Load widget layout from localStorage
      const savedLayout = localStorage.getItem('dashboard-widget-layout');
      let layout = null;

      if (savedLayout) {
        try {
          layout = JSON.parse(savedLayout);
          console.log('[WidgetGrid] Loaded layout from storage:', layout);
        } catch (e) {
          layout = null;
        }
      }

      // Always ensure all widgets are in the layout
      if (allWidgets.length > 0) {
        if (!layout || layout.length === 0) {
          // No saved layout, add all widgets
          layout = allWidgets.map((widget, index) => ({
            id: widget.id,
            order: index,
            columns: 1
          }));
          console.log('[WidgetGrid] Created new layout:', layout);
        } else {
          // Merge saved layout with new widgets
          const existingIds = new Set(layout.map(item => item.id));
          const newWidgets = allWidgets
            .filter(widget => !existingIds.has(widget.id))
            .map((widget, index) => ({
              id: widget.id,
              order: layout.length + index,
              columns: 1
            }));

          if (newWidgets.length > 0) {
            layout = [...layout, ...newWidgets];
            console.log('[WidgetGrid] Added new widgets:', newWidgets);
          }
        }

        setWidgetLayout(layout);
        saveLayout(layout);
        console.log('[WidgetGrid] Final layout:', layout);
        console.log('[WidgetGrid] Widget layout count:', widgetLayout().length);
      } else {
        console.warn('[WidgetGrid] No widgets available from API!');
      }
    }, 200);
  });

  const saveLayout = (layout) => {
    localStorage.setItem('dashboard-widget-layout', JSON.stringify(layout));
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be created
    setTimeout(() => {
      e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = draggedItem();

    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newLayout = [...widgetLayout()];
    const [movedItem] = newLayout.splice(dragIndex, 1);
    newLayout.splice(dropIndex, 0, movedItem);

    // Update order
    const updatedLayout = newLayout.map((item, index) => ({
      ...item,
      order: index
    }));

    setWidgetLayout(updatedLayout);
    saveLayout(updatedLayout);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverIndex(null);
    setIsDragging(false);
  };

  const removeWidget = (widgetId) => {
    const newLayout = widgetLayout().filter(item => item.id !== widgetId);
    const updatedLayout = newLayout.map((item, index) => ({
      ...item,
      order: index
    }));
    setWidgetLayout(updatedLayout);
    saveLayout(updatedLayout);
  };

  const addWidget = (widgetId) => {
    const newLayout = [...widgetLayout(), {
      id: widgetId,
      order: widgetLayout().length,
      columns: 1 // Default to 1 column
    }];
    setWidgetLayout(newLayout);
    saveLayout(newLayout);
  };

  const toggleWidgetColumns = (widgetId) => {
    const newLayout = widgetLayout().map(item => {
      if (item.id === widgetId) {
        return {
          ...item,
          columns: item.columns === 2 ? 1 : 2
        };
      }
      return item;
    });
    setWidgetLayout(newLayout);
    saveLayout(newLayout);
  };

  const getWidgetById = (widgetId) => {
    return availableWidgets().find(w => w.id === widgetId);
  };

  return (
    <div class="h-full overflow-y-auto bg-gradient-to-br from-base-300 to-base-200 p-4">
      <div class="max-w-7xl mx-auto">
        {/* Widget Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <For each={widgetLayout()}>
            {(layoutItem, index) => {
              const widget = getWidgetById(layoutItem.id);
              if (!widget) return null;

              const WidgetComponent = widget.component;
              const isBeingDragged = draggedItem() === index();
              const isDragOver = dragOverIndex() === index();
              const columns = layoutItem.columns || 1;

              return (
                <>
                  {/* Drop Zone Before Widget */}
                  <Show when={isDragging() && !isBeingDragged}>
                    <div
                      class={`transition-all duration-200 rounded-lg border-2 border-dashed ${
                        isDragOver ? 'border-primary bg-primary/10 scale-105' : 'border-base-300 bg-base-200/50'
                      }`}
                      classList={{
                        'md:col-span-2 lg:col-span-2': columns === 2,
                        'md:col-span-1 lg:col-span-1': columns === 1
                      }}
                      style={{
                        'min-height': '100px',
                        'display': 'flex',
                        'align-items': 'center',
                        'justify-content': 'center'
                      }}
                      onDragOver={(e) => handleDragOver(e, index())}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index())}
                    >
                      <div class={`text-xs transition-opacity ${isDragOver ? 'opacity-100' : 'opacity-40'}`}>
                        Drop here
                      </div>
                    </div>
                  </Show>

                  {/* Widget Container with Controls */}
                  <div
                    class={`relative group transition-all duration-200 ${
                      isBeingDragged ? 'opacity-40 scale-95' : ''
                    }`}
                    classList={{
                      'md:col-span-2 lg:col-span-2': columns === 2,
                      'md:col-span-1 lg:col-span-1': columns === 1
                    }}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index())}
                    onDragOver={(e) => handleDragOver(e, index())}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index())}
                    onDragEnd={handleDragEnd}
                    style={{
                      'cursor': 'grab'
                    }}
                  >
                    {/* Floating Control Bar */}
                    <div class="absolute -top-2 -right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div class="flex items-center gap-1 bg-base-100 shadow-lg rounded-lg p-1 border border-base-300">
                        <div class="cursor-grab active:cursor-grabbing px-1" title="Drag to reorder">
                          <IconGripVertical size={14} class="text-base-content/50" />
                        </div>
                        <div class="w-px h-4 bg-base-300"></div>
                        <button
                          class="btn btn-ghost btn-xs btn-square hover:bg-base-300"
                          onClick={() => toggleWidgetColumns(widget.id)}
                          title={`Switch to ${columns === 1 ? '2' : '1'} column${columns === 1 ? 's' : ''}`}
                        >
                          {columns === 1 ? <IconColumns2 size={14} /> : <IconColumns1 size={14} />}
                        </button>
                        <button
                          class="btn btn-ghost btn-xs btn-square hover:bg-error hover:text-error-content"
                          onClick={() => removeWidget(widget.id)}
                          title="Remove widget"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Widget Content (the widget IS the card) */}
                    <div class={`h-full transition-all duration-200 ${
                      isBeingDragged ? 'ring-2 ring-primary' : ''
                    }`}>
                      <WidgetComponent />
                    </div>
                  </div>
                </>
              );
            }}
          </For>

          {/* Drop Zone at End */}
          <Show when={isDragging()}>
            <div
              class={`transition-all duration-200 rounded-lg border-2 border-dashed ${
                dragOverIndex() === widgetLayout().length ? 'border-primary bg-primary/10 scale-105' : 'border-base-300 bg-base-200/50'
              }`}
              style={{
                'min-height': '100px',
                'display': 'flex',
                'align-items': 'center',
                'justify-content': 'center'
              }}
              onDragOver={(e) => handleDragOver(e, widgetLayout().length)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, widgetLayout().length)}
            >
              <div class={`text-xs transition-opacity ${dragOverIndex() === widgetLayout().length ? 'opacity-100' : 'opacity-40'}`}>
                Drop at end
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}
