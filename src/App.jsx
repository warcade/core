import { onMount, For } from 'solid-js'
import './base.css'
import { Engine, layoutComponents } from '@/api/plugin'
import Layout from './layout'
import DevNotice from './components/DevNotice'
import KeyboardShortcuts, { keyboardShortcuts } from './components/KeyboardShortcuts'
import PluginInstaller from './components/PluginInstaller'
import { usePluginAPI } from '@/api/plugin'
import { initDeveloper } from '@/developer'

// Component that initializes core modules after Engine/PluginAPIProvider is mounted
function CoreModuleInitializer() {
  onMount(() => {
    const api = usePluginAPI();

    // Initialize Developer IDE (built-in, not a plugin)
    initDeveloper(api);

    // Open engine viewport by default after plugins are loaded
    const unsubscribe = api.on('api-initialized', () => {
      // Small delay to ensure all plugins have registered their viewports
      setTimeout(() => {
        api.open('engine-viewport', { label: 'Engine' });
      }, 100);
      unsubscribe();
    });
  });

  return null;
}

export default function App() {
  onMount(async () => {
    // Initialize theme from localStorage
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Setup window close handling for Tauri (handles Alt+F4, system close, etc.)
    const setupWindowCloseHandler = async () => {
      try {
        // Check if we're in Tauri environment
        if (window.__TAURI__) {
          const { listen } = await import('@tauri-apps/api/event');

          // Listen for window close request from Tauri (triggered by system/OS close)
          await listen('window-close-requested', async () => {
            await handleWindowCloseRequest();
          });
        }
      } catch (error) {
      }
    };

    setupWindowCloseHandler();

    // Show window immediately
    setTimeout(async () => {
      if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const currentWindow = getCurrentWindow();
          await currentWindow.show();
        } catch (error) {
        }
      }
    }, 50);
  })

  // Simplified window close handler
  const handleWindowCloseRequest = async () => {
  };

  return (
    <Engine>
      <CoreModuleInitializer />
      <KeyboardShortcuts />
      <PluginInstaller />
      <div class="w-full h-full relative">
        <Layout />
        <DevNotice />

        {/* Render layout components from plugins */}
        <For each={Array.from(layoutComponents().values())}>
          {(layoutComponent) => {
            // Handle both old and new structure for backwards compatibility
            const Component = layoutComponent?.component || layoutComponent;
            return <Component />;
          }}
        </For>
      </div>
    </Engine>
  );
}
