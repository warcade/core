import { createSignal, createContext, useContext, onCleanup } from 'solid-js';
import ContextMenu from './ContextMenu.jsx';
import { pluginAPI } from '@/api/plugin';

// Context for sharing context menu state across components
const ViewportContextMenuContext = createContext();

export function ViewportContextMenuProvider(props) {
  const [contextMenuState, setContextMenuState] = createSignal(null);

  const showContextMenu = (event, context = 'viewport', data = null) => {
    if (!event) return;

    event.preventDefault();
    event.stopPropagation();

    const { clientX: x, clientY: y } = event;

    // Get items from PluginAPI's context registry
    const registeredItems = pluginAPI.context.getItems(context);

    // Transform items to include the data in action calls
    const items = registeredItems.map(item => ({
      ...item,
      action: () => item.action?.(data, context)
    }));

    // Don't show empty menu
    if (items.length === 0) return;

    setContextMenuState({
      position: { x, y },
      items,
      visible: true,
      context,
      data
    });
  };

  const hideContextMenu = () => {
    setContextMenuState(null);
  };

  // Close context menu on escape key
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      hideContextMenu();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  const contextValue = {
    showContextMenu,
    hideContextMenu,
    contextMenuState
  };

  return (
    <ViewportContextMenuContext.Provider value={contextValue}>
      {props.children}
      {contextMenuState() && (
        <ContextMenu
          items={contextMenuState().items}
          position={contextMenuState().position}
          onClose={hideContextMenu}
        />
      )}
    </ViewportContextMenuContext.Provider>
  );
}

export function useViewportContextMenu() {
  const context = useContext(ViewportContextMenuContext);
  if (!context) {
    throw new Error('useViewportContextMenu must be used within ViewportContextMenuProvider');
  }
  return context;
}

// Higher-order component to add context menu support to any component
export function withContextMenu(Component, contextType) {
  return function WrappedComponent(props) {
    const { showContextMenu } = useViewportContextMenu();

    const handleContextMenu = (event, data = null) => {
      showContextMenu(event, contextType, data);
    };

    return (
      <Component
        {...props}
        onContextMenu={handleContextMenu}
      />
    );
  };
}
