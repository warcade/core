import { createSignal, createEffect, Show, For, onMount, onCleanup } from 'solid-js';
import { ProjectTree } from './ProjectTree.jsx';
import { NewPluginWizard } from './NewPluginWizard.jsx';
import { IconPlus } from '@tabler/icons-solidjs';
import { api } from '@/api/bridge';

export default function FilesPanel(props) {
  const [showWizard, setShowWizard] = createSignal(false);
  const [currentPlugin, setCurrentPlugin] = createSignal(null);
  const [plugins, setPlugins] = createSignal([]);

  createEffect(() => {
    loadPlugins();
  });

  onMount(() => {
    window.addEventListener('developer:plugin-created', handlePluginCreated);
    onCleanup(() => {
      window.removeEventListener('developer:plugin-created', handlePluginCreated);
    });
  });

  const handlePluginCreated = async (plugin) => {
    console.log('[FilesPanel] Plugin created:', plugin);
    await loadPlugins();
    setCurrentPlugin(plugin.id);
    setShowWizard(false);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('developer:file-select', {
        detail: {
          file: {
            path: `plugins/developer/projects/${plugin.id}/index.jsx`,
            name: 'index.jsx',
            type: 'file'
          },
          plugin: plugin.id
        }
      }));
    }, 100);
  };

  const loadPlugins = async () => {
    try {
      const response = await api('developer/plugins');
      const data = await response.json();
      setPlugins(data);

      if (data.length > 0 && !currentPlugin()) {
        setCurrentPlugin(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  };

  const handleFileSelect = (file) => {
    if (file.type === 'file') {
      window.dispatchEvent(new CustomEvent('developer:file-select', {
        detail: { file, plugin: currentPlugin() }
      }));
    }
  };

  const handleCreateFile = async (parentPath, type, name) => {
    try {
      const pluginPath = `plugins/${currentPlugin()}`;
      let relativePath = '';

      if (parentPath.includes(pluginPath)) {
        relativePath = parentPath.split(pluginPath + '/')[1] || parentPath.split(pluginPath + '\\')[1] || '';
      }

      await api(`developer/file/${currentPlugin()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: relativePath,
          type: type,
          name: name,
        }),
      });
    } catch (error) {
      console.error('Failed to create file:', error);
      alert('Failed to create file: ' + error.message);
    }
  };

  const handleDeleteFile = async (filePath) => {
    try {
      const pluginPath = `plugins/${currentPlugin()}`;
      let relativePath = filePath;

      if (relativePath.includes(pluginPath)) {
        relativePath = relativePath.split(pluginPath + '/')[1] || relativePath.split(pluginPath + '\\')[1];
      }

      await api(`developer/file/${currentPlugin()}/${relativePath}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file: ' + error.message);
    }
  };

  return (
    <div class="h-full flex flex-col bg-base-100">
      <div class="p-3 border-b border-base-content/10 bg-base-200">
        <label class="text-xs font-semibold text-base-content/60 mb-1 block">Plugin</label>
        <select
          class="select select-bordered select-sm w-full mb-2"
          value={currentPlugin() || ''}
          onChange={(e) => {
            const newPlugin = e.target.value;
            setCurrentPlugin(newPlugin);
            // Clear file selection when plugin changes
            window.dispatchEvent(new CustomEvent('developer:file-select', {
              detail: { file: null, plugin: newPlugin }
            }));
          }}
        >
          <option value="" disabled>Select a plugin...</option>
          <For each={plugins()}>
            {(p) => (
              <option value={p.id}>
                {p.name}
                {p.has_backend && ' [Rust]'}
                {p.has_frontend && ' [JSX]'}
              </option>
            )}
          </For>
        </select>
        <button
          onClick={() => setShowWizard(true)}
          class="btn btn-sm btn-primary w-full gap-2"
        >
          <IconPlus size={16} />
          New Plugin
        </button>
      </div>

      <div class="flex-1 overflow-hidden">
        <Show
          when={currentPlugin()}
          fallback={
            <div class="flex items-center justify-center h-full p-4 text-center text-base-content/60">
              <p>Select a plugin to view its files</p>
            </div>
          }
        >
          <ProjectTree
            currentPlugin={currentPlugin()}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
          />
        </Show>
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
