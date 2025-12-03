import { createSignal, Show, onMount, onCleanup } from 'solid-js';

const PluginInstaller = () => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [isInstalling, setIsInstalling] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [messageType, setMessageType] = createSignal('info'); // 'info', 'success', 'error'

  let dragCounter = 0;

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;

    // Check if the dragged item contains files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = Array.from(e.dataTransfer.items);
      const hasFiles = items.some(item => item.kind === 'file');

      if (hasFiles) {
        // Only handle plugin files (zip/webarcade)
        const fileItem = items.find(item => item.kind === 'file');
        if (fileItem && fileItem.type) {
          if (fileItem.type === 'application/zip' || fileItem.type === 'application/x-zip-compressed') {
            setIsDragging(true);
          }
        }
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;

    if (dragCounter === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter = 0;

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    // Handle plugin files only (images/videos handled by background plugin)
    const zipFiles = files.filter(file =>
      file.name.endsWith('.zip') || file.name.endsWith('.webarcade')
    );

    if (zipFiles.length === 0) {
      // Not a plugin file, ignore (background plugin will handle images/videos)
      return;
    }

    if (zipFiles.length > 1) {
      showMessage('Please drop only one plugin file at a time', 'error');
      return;
    }

    await installPlugin(zipFiles[0]);
  };

  const installPlugin = async (file) => {
    setIsInstalling(true);
    setMessage('Installing plugin...');
    setMessageType('info');

    try {
      // Read file as array buffer and convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...bytes));

      // Call bridge API to install plugin
      const response = await fetch('http://127.0.0.1:3001/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip_data_base64: base64,
          file_name: file.name
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Installation failed');
      }

      const result = await response.json();

      showMessage(`Plugin "${result.plugin_name}" installed successfully!`, 'success');

      // Show a message asking user to restart
      setTimeout(() => {
        showMessage('Please restart the application to load the new plugin', 'info');
      }, 2000);

    } catch (error) {
      console.error('Plugin installation failed:', error);
      showMessage(`Installation failed: ${error}`, 'error');
    } finally {
      setIsInstalling(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);

    // Auto-hide all messages after 3 seconds
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  onMount(() => {
    // Add global drag-and-drop listeners
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
  });

  onCleanup(() => {
    // Remove listeners on cleanup
    document.removeEventListener('dragenter', handleDragEnter);
    document.removeEventListener('dragleave', handleDragLeave);
    document.removeEventListener('dragover', handleDragOver);
    document.removeEventListener('drop', handleDrop);
  });

  const getMessageColor = () => {
    switch (messageType()) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <>
      {/* Drag overlay - only for plugin files */}
      <Show when={isDragging()}>
        <div class="fixed inset-0 z-[9999] pointer-events-none">
          <div class="absolute inset-0 bg-primary/20 backdrop-blur-sm border-4 border-primary border-dashed animate-pulse">
            <div class="flex items-center justify-center h-full">
              <div class="bg-base-100 px-8 py-6 rounded-lg shadow-2xl border-2 border-primary">
                <div class="text-center">
                  <div class="text-6xl mb-4">📦</div>
                  <h3 class="text-2xl font-bold text-primary mb-2">Drop Plugin Here</h3>
                  <p class="text-base-content/70">Release to install the plugin</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Installing overlay */}
      <Show when={isInstalling()}>
        <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div class="bg-base-100 px-8 py-6 rounded-lg shadow-2xl border border-base-300 min-w-[300px]">
            <div class="text-center">
              <div class="loading loading-spinner loading-lg text-primary mb-4"></div>
              <p class="text-base-content font-semibold">{message()}</p>
            </div>
          </div>
        </div>
      </Show>

      {/* Message toast */}
      <Show when={message() && !isInstalling()}>
        <div class="fixed bottom-4 right-4 z-[9999] animate-in slide-in-from-right">
          <div class={`${getMessageColor()} text-white px-6 py-4 rounded-lg shadow-lg max-w-md`}>
            <p class="font-semibold">{message()}</p>
          </div>
        </div>
      </Show>
    </>
  );
};

export default PluginInstaller;
