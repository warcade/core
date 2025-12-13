import { onMount, For } from 'solid-js'
import './base.css'
import { Engine, layoutComponents } from '@/api/plugin'
import Layout from './layout'
import DevNotice from './components/DevNotice'
import PluginInstaller from './components/PluginInstaller'
import { usePluginAPI } from '@/api/plugin'

// Component that initializes core modules after Engine/PluginAPIProvider is mounted
function CoreModuleInitializer() {
  onMount(() => {
    const api = usePluginAPI();

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

    // Setup window close handling (handles Alt+F4, system close, etc.)
    const setupWindowCloseHandler = async () => {
      try {
        // Check if we're in WebArcade environment
        if (window.__WEBARCADE__) {
          // WebArcade handles close via IPC
          window.__WEBARCADE__.event.listen('window-close-requested', async () => {
            await handleWindowCloseRequest();
          });
        }
      } catch (error) {
      }
    };

    setupWindowCloseHandler();
  })

  // Simplified window close handler
  const handleWindowCloseRequest = async () => {
  };

  return (
    <Engine>
      <CoreModuleInitializer />
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
