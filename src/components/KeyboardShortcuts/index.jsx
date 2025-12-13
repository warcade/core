import { onMount, onCleanup } from 'solid-js';
import { pluginAPI } from '@/api/plugin';

const KeyboardShortcuts = () => {
  onMount(() => {
    const isInputFocused = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;

      const tagName = activeElement.tagName.toLowerCase();
      const inputTypes = ['input', 'textarea', 'select'];
      const contentEditable = activeElement.contentEditable === 'true';

      if (inputTypes.includes(tagName) || contentEditable) {
        return true;
      }

      // Check if it's inside a code editor
      if (activeElement.closest('.monaco-editor') ||
          activeElement.closest('[data-mode-id]') ||
          activeElement.closest('.CodeMirror') ||
          activeElement.closest('[contenteditable]')) {
        return true;
      }

      return false;
    };

    const handleKeyDown = (event) => {
      if (pluginAPI.shortcut.isDisabled()) return;
      if (isInputFocused()) return;

      // Run all handlers registered via api.shortcut.register()
      const handlers = pluginAPI.shortcut.getHandlers();
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[KeyboardShortcuts] Handler error:', error);
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  return null;
};

export default KeyboardShortcuts;
