import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { editorActions } from '@/layout/stores/EditorStore.jsx';

const PluginInstaller = () => {
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragType, setDragType] = createSignal(''); // 'plugin', 'image', or ''
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
        // Detect file type
        const fileItem = items.find(item => item.kind === 'file');
        if (fileItem && fileItem.type) {
          if (fileItem.type.startsWith('image/')) {
            setDragType('image');
          } else if (fileItem.type.startsWith('video/')) {
            setDragType('video');
          } else if (fileItem.type === 'application/zip' || fileItem.type === 'application/x-zip-compressed') {
            setDragType('plugin');
          } else {
            // Check extension for .webarcade files
            setDragType('plugin'); // Default to plugin for unknown types
          }
        }
        setIsDragging(true);
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;

    if (dragCounter === 0) {
      setIsDragging(false);
      setDragType('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentDragType = dragType();
    setIsDragging(false);
    setDragType('');
    dragCounter = 0;

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) {
      return;
    }

    const file = files[0];

    // Handle image files
    if (file.type.startsWith('image/')) {
      await uploadBackground(file, 'image');
      return;
    }

    // Handle video files
    if (file.type.startsWith('video/')) {
      await uploadBackground(file, 'video');
      return;
    }

    // Handle plugin files
    const zipFiles = files.filter(file =>
      file.name.endsWith('.zip') || file.name.endsWith('.webarcade')
    );

    if (zipFiles.length === 0) {
      showMessage('Please drop a .zip, .webarcade plugin file, an image file, or a video file', 'error');
      return;
    }

    if (zipFiles.length > 1) {
      showMessage('Please drop only one plugin file at a time', 'error');
      return;
    }

    await installPlugin(zipFiles[0]);
  };

  const uploadBackground = async (file, type) => {
    setIsInstalling(true);
    setMessage(`Uploading ${type}...`);
    setMessageType('info');

    try {
      const formData = new FormData();
      formData.append('background', file);

      const response = await fetch('http://localhost:3001/system/background/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload background');
      }

      const result = await response.json();

      // Set the background using the URL returned from the server
      editorActions.setBackgroundImage(result.url, type);

      showMessage(`Background ${type} set successfully!`, 'success');

    } catch (error) {
      console.error('Background upload failed:', error);
      showMessage(`Upload failed: ${error.message}`, 'error');
    } finally {
      setIsInstalling(false);
    }
  };

  const installPlugin = async (file) => {
    setIsInstalling(true);
    setMessage('Installing plugin...');
    setMessageType('info');

    try {
      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));

      // Call Tauri command to install plugin
      const result = await invoke('install_plugin_from_zip', {
        zipData: bytes,
        fileName: file.name
      });

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
      {/* Drag overlay */}
      <Show when={isDragging()}>
        <div class="fixed inset-0 z-[9999] pointer-events-none">
          <div class="absolute inset-0 bg-primary/20 backdrop-blur-sm border-4 border-primary border-dashed animate-pulse">
            <div class="flex items-center justify-center h-full">
              <div class="bg-base-100 px-8 py-6 rounded-lg shadow-2xl border-2 border-primary">
                <div class="text-center">
                  <div class="text-6xl mb-4">
                    {dragType() === 'image' ? '🖼️' : dragType() === 'video' ? '🎬' : '📦'}
                  </div>
                  <h3 class="text-2xl font-bold text-primary mb-2">
                    {dragType() === 'image' ? 'Drop Image Here' : dragType() === 'video' ? 'Drop Video Here' : 'Drop Plugin Here'}
                  </h3>
                  <p class="text-base-content/70">
                    {dragType() === 'image' ? 'Release to set as background' : dragType() === 'video' ? 'Release to set as background video' : 'Release to install the plugin'}
                  </p>
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
