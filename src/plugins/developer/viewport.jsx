import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { CodeEditor } from './components/Editor';
import { NewPluginWizard } from './components/NewPluginWizard';
import { BuildConsole } from './components/BuildConsole';
import { IconPlus, IconPackage } from '@tabler/icons-solidjs';
import { bridge } from '@/api/bridge';

export default function PluginIDE() {
  const [currentPlugin, setCurrentPlugin] = createSignal(null);
  const [currentFile, setCurrentFile] = createSignal(null);
  const [showWizard, setShowWizard] = createSignal(false);
  const [isBuilding, setIsBuilding] = createSignal(false);
  const [buildStatus, setBuildStatus] = createSignal(null);

  // Listen for file selection events from the Files panel
  onMount(() => {
    const handleFileSelect = (event) => {
      console.log('File select event received:', event.detail);
      console.log('File object:', event.detail.file);
      console.log('Plugin:', event.detail.plugin);
      setCurrentPlugin(event.detail.plugin);
      setCurrentFile(event.detail.file);
      console.log('Current file after set:', currentFile());
      console.log('Current plugin after set:', currentPlugin());
    };

    window.addEventListener('plugin-ide:file-select', handleFileSelect);

    onCleanup(() => {
      window.removeEventListener('plugin-ide:file-select', handleFileSelect);
    });
  });

  const handlePluginCreated = (plugin) => {
    console.log('Plugin created:', plugin);
    // Dispatch event to refresh files panel
    window.dispatchEvent(new CustomEvent('plugin-ide:refresh-plugins'));
  };

  const handleBuild = async (andInstall = false) => {
    if (!currentPlugin() || isBuilding()) return;

    setIsBuilding(true);
    setBuildStatus({ type: 'loading', message: 'Building plugin...' });

    // Clear previous build logs
    window.dispatchEvent(new CustomEvent('plugin-ide:build-clear'));

    // Add initial log
    window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
      detail: {
        type: 'info',
        message: `Starting build for plugin: ${currentPlugin()}`,
        step: 'init',
        progress: 0
      }
    }));

    try {
      // Use fetch directly for streaming support
      const response = await fetch(`http://localhost:3001/developer/build/${currentPlugin()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Build failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);

              // Emit log event
              window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
                detail: {
                  type: data.type || 'info',
                  message: data.message,
                  step: data.step,
                  progress: data.progress
                }
              }));
            } catch (e) {
              // If not JSON, treat as plain log message
              window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
                detail: {
                  type: 'info',
                  message: line
                }
              }));
            }
          }
        }
      }

      setBuildStatus({ type: 'success', message: 'Build successful!' });
      window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
        detail: {
          type: 'success',
          message: 'Build completed successfully!',
          step: 'complete',
          progress: 1
        }
      }));

      // If andInstall is true, install the plugin
      if (andInstall) {
        window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
          detail: {
            type: 'info',
            message: 'Installing plugin...',
            step: 'install',
            progress: 1
          }
        }));

        const installResponse = await fetch(`http://localhost:3001/developer/install/${currentPlugin()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (installResponse.ok) {
          window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
            detail: {
              type: 'success',
              message: 'Plugin installed successfully!',
              step: 'install_complete',
              progress: 1
            }
          }));
          setBuildStatus({ type: 'success', message: 'Build & Install successful!' });
        } else {
          throw new Error('Installation failed');
        }
      }

      // Auto-clear success message after 3 seconds
      setTimeout(() => setBuildStatus(null), 3000);
    } catch (error) {
      console.error('Build error:', error);
      setBuildStatus({ type: 'error', message: error.message || 'Build failed' });
      window.dispatchEvent(new CustomEvent('plugin-ide:build-log', {
        detail: {
          type: 'error',
          message: `Build failed: ${error.message}`,
          step: 'error'
        }
      }));
    } finally {
      setIsBuilding(false);
    }
  };

  const handleBuildAndInstall = () => handleBuild(true);

  return (
    <div class="flex flex-col h-full bg-base-100">
      {/* Toolbar */}
      <div class="flex items-center justify-between px-4 py-2 bg-base-200 border-b border-base-content/10">
        <div class="flex items-center gap-2">
          <Show when={currentFile()}>
            <span class="text-sm text-base-content/60">
              {currentPlugin()} / {currentFile()?.name}
            </span>
          </Show>
        </div>

        <div class="flex items-center gap-2">
          <Show when={buildStatus()}>
            <div class={`alert alert-sm ${
              buildStatus().type === 'success' ? 'alert-success' :
              buildStatus().type === 'error' ? 'alert-error' :
              'alert-info'
            } py-1 px-3`}>
              <span class="text-xs">{buildStatus().message}</span>
            </div>
          </Show>

          <Show when={currentPlugin()}>
            <div class="dropdown dropdown-end">
              <button
                onClick={handleBuild}
                disabled={isBuilding()}
                class="btn btn-sm btn-success gap-2"
              >
                {isBuilding() ? (
                  <>
                    <span class="loading loading-spinner loading-xs"></span>
                    Building...
                  </>
                ) : (
                  <>
                    <IconPackage size={16} />
                    Build
                  </>
                )}
              </button>
              <ul tabindex="0" class="dropdown-content menu bg-base-200 rounded-box z-[1] w-52 p-2 shadow-xl border border-base-content/10 mt-1">
                <li>
                  <a onClick={handleBuild}>
                    <IconPackage size={16} />
                    Build Only
                  </a>
                </li>
                <li>
                  <a onClick={handleBuildAndInstall}>
                    <IconPackage size={16} />
                    Build & Install
                  </a>
                </li>
              </ul>
            </div>
          </Show>

          <button
            onClick={() => setShowWizard(true)}
            class="btn btn-sm btn-primary gap-2"
          >
            <IconPlus size={16} />
            New Plugin
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div class="flex-1 overflow-hidden">
        <CodeEditor
          file={currentFile()}
          currentPlugin={currentPlugin()}
          onSave={(file) => {
            console.log('File saved:', file.name);
          }}
        />
      </div>

      {/* Build Console */}
      <BuildConsole />

      {/* New Plugin Wizard */}
      <Show when={showWizard()}>
        <NewPluginWizard
          onClose={() => setShowWizard(false)}
          onCreate={handlePluginCreated}
        />
      </Show>
    </div>
  );
}
