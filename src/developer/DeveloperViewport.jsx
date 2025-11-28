import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { CodeEditor } from './components/Editor.jsx';
import { NewPluginWizard } from './components/NewPluginWizard.jsx';
import { pluginAPI } from '@/api/plugin';

export default function DeveloperViewport() {
  const [currentPlugin, setCurrentPlugin] = createSignal(null);
  const [currentFile, setCurrentFile] = createSignal(null);
  const [showWizard, setShowWizard] = createSignal(false);
  const [isBuilding, setIsBuilding] = createSignal(false);
  const [buildStatus, setBuildStatus] = createSignal(null);

  // Listen for file selection events from the Files panel
  onMount(() => {
    const handleFileSelect = (event) => {
      console.log('File select event received:', event.detail);
      setCurrentPlugin(event.detail.plugin);
      setCurrentFile(event.detail.file);
    };

    window.addEventListener('developer:file-select', handleFileSelect);

    onCleanup(() => {
      window.removeEventListener('developer:file-select', handleFileSelect);
    });
  });

  const handlePluginCreated = (plugin) => {
    console.log('Plugin created:', plugin);
    window.dispatchEvent(new CustomEvent('developer:refresh-plugins'));
  };

  const handleBuild = async (andInstall = false) => {
    if (!currentPlugin() || isBuilding()) return;

    setIsBuilding(true);
    setBuildStatus({ type: 'loading', message: 'Building plugin...' });

    // Dispatch build start event to show the console
    window.dispatchEvent(new CustomEvent('developer:build-start'));
    window.dispatchEvent(new CustomEvent('developer:build-clear'));

    window.dispatchEvent(new CustomEvent('developer:build-log', {
      detail: {
        type: 'info',
        message: `Starting build for plugin: ${currentPlugin()}`,
        step: 'init',
        progress: 0
      }
    }));

    try {
      // Use the core bridge build API
      const response = await fetch(`http://localhost:3001/api/build/${currentPlugin()}`, {
        method: 'POST'
      });

      const data = await response.json();

      // Display all build logs from the response
      if (data.logs && Array.isArray(data.logs)) {
        for (const log of data.logs) {
          window.dispatchEvent(new CustomEvent('developer:build-log', {
            detail: {
              type: log.log_type || 'info',
              message: log.message,
              step: log.step || 'build'
            }
          }));
        }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Build failed');
      }

      window.dispatchEvent(new CustomEvent('developer:build-log', {
        detail: {
          type: 'success',
          message: data.message || 'Build completed',
          step: 'complete',
          progress: 1
        }
      }));

      setBuildStatus({ type: 'success', message: 'Build successful!' });

      // If andInstall is true, reload the plugin
      if (andInstall) {
        window.dispatchEvent(new CustomEvent('developer:build-log', {
          detail: {
            type: 'info',
            message: 'Reloading plugin...',
            step: 'install',
            progress: 1
          }
        }));

        try {
          const pluginId = currentPlugin();
          await pluginAPI.reloadRuntimePlugin(pluginId);

          window.dispatchEvent(new CustomEvent('developer:build-log', {
            detail: {
              type: 'success',
              message: 'Plugin reloaded successfully!',
              step: 'install_complete',
              progress: 1
            }
          }));
          setBuildStatus({ type: 'success', message: 'Build & Reload successful!' });
        } catch (reloadErr) {
          console.warn('Reload warning:', reloadErr);
          window.dispatchEvent(new CustomEvent('developer:build-log', {
            detail: {
              type: 'warning',
              message: `Reload warning: ${reloadErr.message || 'Unknown error'}. You may need to refresh (F5).`,
              step: 'reload_warning',
              progress: 1
            }
          }));
        }
      }

      window.dispatchEvent(new CustomEvent('developer:build-complete', {
        detail: { success: true }
      }));

      setTimeout(() => setBuildStatus(null), 3000);
    } catch (error) {
      console.error('Build error:', error);
      setBuildStatus({ type: 'error', message: error.message || 'Build failed' });
      window.dispatchEvent(new CustomEvent('developer:build-log', {
        detail: {
          type: 'error',
          message: `Build failed: ${error.message}`,
          step: 'error'
        }
      }));

      window.dispatchEvent(new CustomEvent('developer:build-complete', {
        detail: { success: false, error: error.message }
      }));
    } finally {
      setIsBuilding(false);
    }
  };

  const handleBuildAndInstall = () => handleBuild(true);

  return (
    <div class="flex flex-col h-full bg-base-100">
      <div class="flex-1 overflow-hidden">
        <CodeEditor
          file={currentFile()}
          currentPlugin={currentPlugin()}
          onSave={(file) => {
            console.log('File saved:', file.name);
          }}
          onBuild={handleBuild}
          onBuildAndInstall={handleBuildAndInstall}
          isBuilding={isBuilding()}
          buildStatus={buildStatus()}
        />
      </div>

      <Show when={showWizard()}>
        <NewPluginWizard
          onClose={() => setShowWizard(false)}
          onCreate={handlePluginCreated}
        />
      </Show>
    </div>
  );
}
