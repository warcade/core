import { onMount, onCleanup, createSignal } from 'solid-js';

let isDisabled = false;
let activeHandlers = [];
let contextMenuEnabled = false;
let contextMenuHandler = null;
let mousePosition = { x: 0, y: 0 };

const KeyboardShortcuts = () => {
  onMount(() => {
    const handleMouseMove = (e) => {
      mousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleContextMenuShortcut = (event) => {
      if (!contextMenuEnabled || !contextMenuHandler) return false;

      // Handle Shift+A for context menu
      if (event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        const elementAtMouse = document.elementFromPoint(mousePosition.x, mousePosition.y);
        let currentElement = elementAtMouse;
        let context = null;
        
        while (currentElement && currentElement !== document.body) {
          const className = currentElement.className || '';
          
          // Check for right panel (scene hierarchy)
          if (className.includes('absolute') && className.includes('top-0') && className.includes('right-0')) {
            context = 'scene';
            break;
          }
          
          // Check for bottom panel
          if (className.includes('absolute') && className.includes('pointer-events-auto') && 
              (className.includes('no-select') || className.includes('z-'))) {
            context = 'bottom-panel';
            break;
          }
          
          currentElement = currentElement.parentElement;
        }
        
        if (context && contextMenuHandler) {
          const syntheticEvent = {
            clientX: mousePosition.x,
            clientY: mousePosition.y,
            preventDefault: () => {},
            stopPropagation: () => {}
          };
          contextMenuHandler(syntheticEvent, null, context);
        }
        return true;
      }
      return false;
    };

    const isInputFocused = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      
      const tagName = activeElement.tagName.toLowerCase();
      const inputTypes = ['input', 'textarea', 'select'];
      const contentEditable = activeElement.contentEditable === 'true';
      
      // Check if it's an input element or content editable
      if (inputTypes.includes(tagName) || contentEditable) {
        return true;
      }
      
      // Check if it's inside a Monaco Editor or any other code editor
      if (activeElement.closest('.monaco-editor') || 
          activeElement.closest('[data-mode-id]') ||
          activeElement.closest('.CodeMirror') ||
          activeElement.closest('[contenteditable]')) {
        return true;
      }
      
      // Check if any modal/overlay is open by looking for common modal patterns
      const modalSelectors = [
        '[role="dialog"]',
        '[role="modal"]', 
        '.modal',
        '.overlay',
        '.dialog',
        '.popup',
        '.dropdown-content',
        '.menu',
        '[data-modal]',
        '[data-overlay]'
      ];
      
      for (const selector of modalSelectors) {
        const modal = document.querySelector(selector);
        if (modal && modal.offsetParent !== null) { // offsetParent is null for hidden elements
          return true;
        }
      }
      
      // Check if element is inside a dropdown or overlay container
      if (activeElement.closest('.dropdown') ||
          activeElement.closest('.popover') ||
          activeElement.closest('.tooltip') ||
          activeElement.closest('[data-dropdown]')) {
        return true;
      }
      
      return false;
    };

    const handleKeyDown = (event) => {
      // Skip if shortcuts are disabled manually (e.g., by Monaco Editor)
      if (isDisabled) return;
      
      // Skip if any input is focused globally
      if (isInputFocused()) {
        // When inputs are focused, let the browser handle ALL events naturally
        // Don't prevent default or run any shortcut handlers
        return;
      }

      // Handle built-in context menu shortcut first
      if (handleContextMenuShortcut(event)) {
        return; // Context menu shortcut handled, don't run other handlers
      }

      // Run all active keyboard handlers
      activeHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
    });
  });

  return null; // This component doesn't render anything
};

// Public API for managing keyboard shortcuts
export const keyboardShortcuts = {
  // Disable all shortcuts (useful when text input is focused)
  disable() {
    isDisabled = true;
    // Keyboard shortcuts temporarily disabled
  },

  // Re-enable shortcuts
  enable() {
    isDisabled = false;
    // Keyboard shortcuts re-enabled
  },

  // Register a keyboard shortcut handler
  register(handler) {
    if (typeof handler !== 'function') {
      return;
    }
    
    activeHandlers.push(handler);
    // Keyboard shortcut handler registered
    
    // Return unregister function
    return () => {
      const index = activeHandlers.indexOf(handler);
      if (index > -1) {
        activeHandlers.splice(index, 1);
        // Keyboard shortcut handler unregistered
      }
    };
  },

  // Helper to create common shortcut patterns
  createHandler(shortcuts) {
    return (event) => {
      for (const [key, callback] of Object.entries(shortcuts)) {
        if (matchesKey(event, key)) {
          event.preventDefault();
          event.stopPropagation();
          callback(event);
          break;
        }
      }
    };
  },

  // Get current state
  isDisabled() {
    return isDisabled;
  },

  // Get number of active handlers
  getHandlerCount() {
    return activeHandlers.length;
  },

  // Context menu functionality
  enableContextMenu(handler) {
    contextMenuEnabled = true;
    contextMenuHandler = handler;
  },

  disableContextMenu() {
    contextMenuEnabled = false;
    contextMenuHandler = null;
  },

  // Check if any input is currently focused or modal is open
  isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    const contentEditable = activeElement.contentEditable === 'true';
    
    // Check if it's an input element or content editable
    if (inputTypes.includes(tagName) || contentEditable) {
      return true;
    }
    
    // Check if it's inside a Monaco Editor or any other code editor
    if (activeElement.closest('.monaco-editor') || 
        activeElement.closest('[data-mode-id]') ||
        activeElement.closest('.CodeMirror') ||
        activeElement.closest('[contenteditable]')) {
      return true;
    }
    
    // Check if any modal/overlay is open by looking for common modal patterns
    const modalSelectors = [
      '[role="dialog"]',
      '[role="modal"]', 
      '.modal',
      '.overlay',
      '.dialog',
      '.popup',
      '.dropdown-content',
      '.menu',
      '[data-modal]',
      '[data-overlay]'
    ];
    
    for (const selector of modalSelectors) {
      const modal = document.querySelector(selector);
      if (modal && modal.offsetParent !== null) { // offsetParent is null for hidden elements
        return true;
      }
    }
    
    // Check if element is inside a dropdown or overlay container
    if (activeElement.closest('.dropdown') ||
        activeElement.closest('.popover') ||
        activeElement.closest('.tooltip') ||
        activeElement.closest('[data-dropdown]')) {
      return true;
    }
    
    return false;
  }
};

// Helper function to match key combinations
function matchesKey(event, keyPattern) {
  const parts = keyPattern.toLowerCase().split('+');
  const key = parts.pop(); // Last part is the actual key
  
  // Check modifiers
  const needsCtrl = parts.includes('ctrl') || parts.includes('cmd');
  const needsAlt = parts.includes('alt');
  const needsShift = parts.includes('shift');
  
  const hasCtrl = event.ctrlKey || event.metaKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;
  
  // Check if modifiers match
  if (needsCtrl !== hasCtrl || needsAlt !== hasAlt || needsShift !== hasShift) {
    return false;
  }
  
  // Check the actual key
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code?.toLowerCase();
  
  return eventKey === key || eventCode === key || eventCode === `key${key}`;
}

export default KeyboardShortcuts;