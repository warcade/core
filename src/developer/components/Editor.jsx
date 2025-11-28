import { createSignal, createEffect, Show } from 'solid-js';
import { IconDeviceFloppy, IconPackage } from '@tabler/icons-solidjs';
import MonacoEditor from './MonacoEditor.jsx';
import { api } from '@/api/bridge';

export function CodeEditor(props) {
  const [content, setContent] = createSignal('');
  const [modified, setModified] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  let editorInstance = null;

  // Track the last loaded file/plugin combo to detect changes
  let lastLoadedKey = null;

  createEffect(() => {
    const file = props.file;
    const plugin = props.currentPlugin;

    if (file && plugin) {
      // Create a unique key to track what we've loaded
      const loadKey = `${plugin}:${file.path}`;

      // Check if the file belongs to the current plugin
      const filePath = file.path.replace(/\\/g, '/');
      const belongsToCurrentPlugin = filePath.startsWith(plugin + '/') ||
                                      filePath.startsWith(plugin + '\\') ||
                                      !filePath.includes('/'); // root-level file

      if (belongsToCurrentPlugin && loadKey !== lastLoadedKey) {
        lastLoadedKey = loadKey;
        setIsLoading(true);
        loadFile();
      } else if (!belongsToCurrentPlugin) {
        // File doesn't belong to current plugin - clear editor
        setContent('');
        setModified(false);
        lastLoadedKey = null;
      }
    } else {
      setContent('');
      setModified(false);
      lastLoadedKey = null;
    }
  });

  const loadFile = async () => {
    if (!props.file || !props.currentPlugin) return;

    try {
      let relativePath = props.file.path.replace(/\\/g, '/');

      if (relativePath.startsWith(props.currentPlugin + '/')) {
        relativePath = relativePath.substring(props.currentPlugin.length + 1);
      }

      const url = `developer/file/${props.currentPlugin}/${relativePath}`;
      const response = await api(url);
      const data = await response.json();
      const fileContent = data.content || '';

      setContent(fileContent);
      setModified(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load file:', error);
      setContent('// Error loading file');
      setIsLoading(false);
    }
  };

  const handleChange = (value) => {
    setContent(value);
    setModified(true);
  };

  const handleSave = async () => {
    if (!props.file || !props.currentPlugin || saving()) return;

    setSaving(true);
    try {
      let relativePath = props.file.path.replace(/\\/g, '/');

      if (relativePath.startsWith(props.currentPlugin + '/')) {
        relativePath = relativePath.substring(props.currentPlugin.length + 1);
      }

      await api(`developer/file/${props.currentPlugin}/${relativePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: content(),
      });

      setModified(false);
      props.onSave?.(props.file);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for save
  createEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const getLanguage = (filename) => {
    if (!filename) return 'javascript';
    const ext = filename.split('.').pop().toLowerCase();
    const languageMap = {
      'rs': 'rust',
      'jsx': 'javascript',
      'js': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'md': 'markdown',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'toml': 'ini',
      'html': 'html',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'txt': 'plaintext',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql',
      'py': 'python',
    };
    return languageMap[ext] || 'javascript';
  };

  const handleEditorMount = (editor, monaco) => {
    editorInstance = editor;
  };

  return (
    <Show
      when={props.file}
      fallback={
        <div class="flex flex-col items-center justify-center h-full bg-base-200">
          <div class="text-center">
            <h2 class="text-2xl font-bold mb-2">No file selected</h2>
            <p class="text-base-content/60">Select a file from the Files panel to start editing</p>
          </div>
        </div>
      }
    >
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between px-4 py-2 bg-base-300 border-b border-base-content/10">
          <span class="text-sm font-medium flex items-center gap-2">
            {props.file?.name}
            {modified() && <span class="text-primary text-xl">*</span>}
          </span>
          <div class="flex items-center gap-2">
            <Show when={props.buildStatus}>
              <div class={`alert alert-sm ${
                props.buildStatus.type === 'success' ? 'alert-success' :
                props.buildStatus.type === 'error' ? 'alert-error' :
                'alert-info'
              } py-1 px-3`}>
                <span class="text-xs">{props.buildStatus.message}</span>
              </div>
            </Show>

            <button
              onClick={handleSave}
              disabled={!modified() || saving()}
              class="btn btn-sm btn-primary gap-2"
            >
              <IconDeviceFloppy size={16} />
              {saving() ? 'Saving...' : 'Save'}
            </button>

            <Show when={props.currentPlugin}>
              <div class="dropdown dropdown-end">
                <button
                  onClick={props.onBuild}
                  disabled={props.isBuilding}
                  class="btn btn-sm btn-success gap-2"
                >
                  {props.isBuilding ? (
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
                    <a onClick={props.onBuild}>
                      <IconPackage size={16} />
                      Build Only
                    </a>
                  </li>
                  <li>
                    <a onClick={props.onBuildAndInstall}>
                      <IconPackage size={16} />
                      Build & Install
                    </a>
                  </li>
                </ul>
              </div>
            </Show>
          </div>
        </div>

        <div class="flex-1">
          <Show
            when={!isLoading()}
            fallback={
              <div class="flex items-center justify-center h-full bg-base-200">
                <div class="flex flex-col items-center gap-2">
                  <span class="loading loading-spinner loading-lg"></span>
                  <p class="text-base-content/60">Loading file...</p>
                </div>
              </div>
            }
          >
            <MonacoEditor
              value={content()}
              onChange={handleChange}
              language={getLanguage(props.file?.name)}
              theme="daisyui-theme"
              height="100%"
              onMount={handleEditorMount}
            />
          </Show>
        </div>
      </div>
    </Show>
  );
}
