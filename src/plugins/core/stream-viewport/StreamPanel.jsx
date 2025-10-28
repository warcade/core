import { createSignal, For, Show } from 'solid-js';
import {
  IconPlus,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  IconArrowUp,
  IconArrowDown,
  IconVideo,
  IconDeviceDesktop,
  IconPhoto,
  IconTextSize,
  IconBrowser,
  IconPlayerPlay,
  IconPlayerStop,
  IconSettings,
  IconDownload,
  IconUpload,
  IconCircle,
  IconMovie,
  IconDeviceFloppy,
  IconX,
  IconEdit
} from '@tabler/icons-solidjs';
import StreamStore from './StreamStore.jsx';
import AdvancedTextDialog from './AdvancedTextDialog.jsx';
import NativeScreenCapture from './NativeScreenCapture.jsx';

export default function StreamPanel() {
  const [showAdvancedTextDialog, setShowAdvancedTextDialog] = createSignal(false);
  const [showBrowserDialog, setShowBrowserDialog] = createSignal(false);
  const [showChromaKeyDialog, setShowChromaKeyDialog] = createSignal(false);
  const [showScenesPanel, setShowScenesPanel] = createSignal(false);
  const [showSaveSceneDialog, setShowSaveSceneDialog] = createSignal(false);
  const [showDisplaySelectDialog, setShowDisplaySelectDialog] = createSignal(false);
  const [availableDisplays, setAvailableDisplays] = createSignal([]);
  const [browserUrl, setBrowserUrl] = createSignal('');
  const [sceneName, setSceneName] = createSignal('');
  const [editingTextSource, setEditingTextSource] = createSignal(null);

  // Chroma key settings
  const [chromaKeyColor, setChromaKeyColor] = createSignal('#00ff00');
  const [chromaKeySimilarity, setChromaKeySimilarity] = createSignal(0.4);
  const [chromaKeySmoothness, setChromaKeySmoothness] = createSignal(0.1);

  const addWebcam = async () => {
    console.log('addWebcam clicked');
    try {
      console.log('Requesting webcam access...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Webcam stream obtained:', stream);
      StreamStore.addSource('webcam', {
        name: 'Webcam',
        x: 100,
        y: 100,
        width: 640,
        height: 480,
        stream,
        chromaKeyEnabled: false
      });
      console.log('Source added to store');
    } catch (error) {
      console.error('Webcam error:', error);
      alert('Failed to access webcam: ' + error.message);
    }
  };

  const addDisplayCapture = async () => {
    console.log('addDisplayCapture clicked - using native capture');
    try {
      const nativeCapture = new NativeScreenCapture();
      const displays = await nativeCapture.listDisplays();

      if (displays.length === 0) {
        alert('No displays found');
        return;
      }

      setAvailableDisplays(displays);
      setShowDisplaySelectDialog(true);
    } catch (error) {
      console.error('Display capture error:', error);
      alert('Failed to list displays: ' + error.message);
    }
  };

  const confirmDisplayCapture = async (screenId) => {
    try {
      console.log(`Starting native capture for screen ${screenId}`);
      const nativeCapture = new NativeScreenCapture();
      const success = await nativeCapture.startCapture(screenId);

      if (success) {
        const display = availableDisplays().find(d => d.id === screenId);
        StreamStore.addSource('display', {
          name: `Display ${screenId + 1}`,
          x: 100,
          y: 100,
          width: display?.width || 1280,
          height: display?.height || 720,
          nativeCapture: nativeCapture
        });
        console.log('Native display source added to store');
      } else {
        alert('Failed to start native capture');
      }

      setShowDisplaySelectDialog(false);
    } catch (error) {
      console.error('Display capture error:', error);
      alert('Failed to capture display: ' + error.message);
    }
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          StreamStore.addSource('image', {
            name: file.name,
            x: 100,
            y: 100,
            width: 400,
            height: 400,
            imageData: event.target.result
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const addText = () => {
    setEditingTextSource(null);
    setShowAdvancedTextDialog(true);
  };

  const editText = (source) => {
    setEditingTextSource(source);
    setShowAdvancedTextDialog(true);
  };

  const confirmAddText = (config) => {
    if (editingTextSource()) {
      StreamStore.updateSource(editingTextSource().id, { config });
    } else {
      StreamStore.addSource('text', {
        name: 'Text',
        x: 100,
        y: 100,
        width: 600,
        height: 150,
        ...config
      });
    }
    setShowAdvancedTextDialog(false);
    setEditingTextSource(null);
  };

  const addBrowser = () => {
    setShowBrowserDialog(true);
  };

  const confirmAddBrowser = () => {
    if (browserUrl()) {
      StreamStore.addSource('browser', {
        name: 'Browser Source',
        x: 100,
        y: 100,
        width: 1280,
        height: 720,
        url: browserUrl()
      });
      setShowBrowserDialog(false);
      setBrowserUrl('');
    }
  };

  const addVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        StreamStore.addSource('video', {
          name: file.name,
          x: 100,
          y: 100,
          width: 1280,
          height: 720,
          videoUrl: url
        });
      }
    };
    input.click();
  };

  const openChromaKeySettings = (source) => {
    if (source.config.chromaKeyEnabled) {
      setChromaKeyColor(source.config.chromaKeyColor || '#00ff00');
      setChromaKeySimilarity(source.config.chromaKeySimilarity || 0.4);
      setChromaKeySmoothness(source.config.chromaKeySmoothness || 0.1);
    }
    StreamStore.selectSource(source.id);
    setShowChromaKeyDialog(true);
  };

  const applyChromaKey = () => {
    const source = StreamStore.selectedSource;
    if (source && (source.type === 'webcam' || source.type === 'video')) {
      StreamStore.updateSource(source.id, {
        config: {
          ...source.config,
          chromaKeyEnabled: true,
          chromaKeyColor: chromaKeyColor(),
          chromaKeySimilarity: chromaKeySimilarity(),
          chromaKeySmoothness: chromaKeySmoothness()
        }
      });
    }
    setShowChromaKeyDialog(false);
  };

  const disableChromaKey = () => {
    const source = StreamStore.selectedSource;
    if (source) {
      StreamStore.updateSource(source.id, {
        config: {
          ...source.config,
          chromaKeyEnabled: false
        }
      });
    }
    setShowChromaKeyDialog(false);
  };

  const exportScene = () => {
    const sceneData = StreamStore.exportScene();
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stream-scene.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScene = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const sceneData = JSON.parse(event.target.result);
            StreamStore.importScene(sceneData);
          } catch (error) {
            alert('Failed to import scene: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const saveCurrentScene = () => {
    setShowSaveSceneDialog(true);
  };

  const confirmSaveScene = () => {
    if (sceneName().trim()) {
      StreamStore.saveScene(sceneName());
      setSceneName('');
      setShowSaveSceneDialog(false);
    }
  };

  const exportAllScenes = () => {
    const data = StreamStore.exportAllScenes();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-scenes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAllScenes = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            StreamStore.importAllScenes(data);
          } catch (error) {
            alert('Failed to import scenes: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div class="h-full flex flex-col bg-base-200">
      {/* Header */}
      <div class="p-4 bg-base-100 border-b border-base-300">
        <h2 class="text-lg font-semibold flex items-center gap-2">
          <IconVideo size={24} />
          Stream Control
        </h2>
      </div>

      {/* Tabs */}
      <div class="tabs tabs-boxed mx-4 mt-4">
        <a class={`tab ${!showScenesPanel() ? 'tab-active' : ''}`} onClick={() => setShowScenesPanel(false)}>
          Sources
        </a>
        <a class={`tab ${showScenesPanel() ? 'tab-active' : ''}`} onClick={() => setShowScenesPanel(true)}>
          Scenes
        </a>
      </div>

      {/* Sources Panel */}
      <Show when={!showScenesPanel()}>
        <div class="p-4 space-y-2">
          {/* Add Source Button */}
          <details class="dropdown dropdown-bottom w-full">
            <summary class="btn btn-primary w-full gap-2">
              <IconPlus size={20} />
              Add Source
            </summary>
            <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full mt-2 z-50">
              <li>
                <a onClick={addWebcam}>
                  <IconVideo size={18} />
                  Webcam
                </a>
              </li>
              <li>
                <a onClick={addDisplayCapture}>
                  <IconDeviceDesktop size={18} />
                  Display Capture
                </a>
              </li>
              <li>
                <a onClick={addImage}>
                  <IconPhoto size={18} />
                  Image
                </a>
              </li>
              <li>
                <a onClick={addText}>
                  <IconTextSize size={18} />
                  Text
                </a>
              </li>
              <li>
                <a onClick={addBrowser}>
                  <IconBrowser size={18} />
                  Browser Source
                </a>
              </li>
              <li>
                <a onClick={addVideo}>
                  <IconPlayerPlay size={18} />
                  Video
                </a>
              </li>
            </ul>
          </details>

          {/* Quick Actions */}
          <div class="flex gap-2">
            <button class="btn btn-sm btn-ghost flex-1 gap-1" onClick={exportScene}>
              <IconDownload size={16} />
              Export
            </button>
            <button class="btn btn-sm btn-ghost flex-1 gap-1" onClick={importScene}>
              <IconUpload size={16} />
              Import
            </button>
          </div>
        </div>

        {/* Sources List */}
        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <Show
            when={StreamStore.sources.length > 0}
            fallback={
              <div class="text-center text-base-content/50 py-8">
                <IconVideo size={48} class="mx-auto mb-2 opacity-30" />
                <p class="text-sm">No sources added yet</p>
                <p class="text-xs mt-1">Click "Add Source" to get started</p>
              </div>
            }
          >
            <For each={StreamStore.sources}>
              {(source) => (
                <div
                  class={`card bg-base-100 shadow-sm cursor-pointer transition-all ${StreamStore.selectedSourceId === source.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => StreamStore.selectSource(source.id)}
                >
                  <div class="card-body p-3">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        {source.type === 'webcam' && <IconVideo size={18} class="text-primary flex-shrink-0" />}
                        {source.type === 'display' && <IconDeviceDesktop size={18} class="text-success flex-shrink-0" />}
                        {source.type === 'image' && <IconPhoto size={18} class="text-secondary flex-shrink-0" />}
                        {source.type === 'text' && <IconTextSize size={18} class="text-accent flex-shrink-0" />}
                        {source.type === 'browser' && <IconBrowser size={18} class="text-warning flex-shrink-0" />}
                        {source.type === 'video' && <IconPlayerPlay size={18} class="text-error flex-shrink-0" />}
                        <span class="font-semibold text-sm truncate">{source.name}</span>
                      </div>
                      <div class="flex gap-1">
                        {source.type === 'text' && (
                          <button
                            class="btn btn-ghost btn-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              editText(source);
                            }}
                            title="Edit Text"
                          >
                            <IconEdit size={14} />
                          </button>
                        )}
                        {(source.type === 'webcam' || source.type === 'video') && (
                          <button
                            class={`btn btn-xs ${source.config?.chromaKeyEnabled ? 'btn-success' : 'btn-ghost'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              openChromaKeySettings(source);
                            }}
                            title="Chroma Key"
                          >
                            <IconSettings size={14} />
                          </button>
                        )}
                        <button
                          class="btn btn-ghost btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            StreamStore.removeSource(source.id);
                          }}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>

                    <div class="text-xs text-base-content/60 mb-2">
                      Position: {Math.round(source.position.x)}, {Math.round(source.position.y)} |
                      Size: {Math.round(source.size.width)}x{Math.round(source.size.height)}
                    </div>

                    <div class="flex gap-1 flex-wrap">
                      <button
                        class={`btn btn-xs ${source.visible ? 'btn-ghost' : 'btn-error'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          StreamStore.toggleVisibility(source.id);
                        }}
                        title={source.visible ? 'Hide' : 'Show'}
                      >
                        {source.visible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                      </button>
                      <button
                        class={`btn btn-xs ${source.locked ? 'btn-warning' : 'btn-ghost'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          StreamStore.toggleLock(source.id);
                        }}
                        title={source.locked ? 'Unlock' : 'Lock'}
                      >
                        {source.locked ? <IconLock size={14} /> : <IconLockOpen size={14} />}
                      </button>
                      <button
                        class="btn btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          StreamStore.moveSourceUp(source.id);
                        }}
                        title="Move Up"
                      >
                        <IconArrowUp size={14} />
                      </button>
                      <button
                        class="btn btn-xs btn-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          StreamStore.moveSourceDown(source.id);
                        }}
                        title="Move Down"
                      >
                        <IconArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>

      {/* Scenes Panel */}
      <Show when={showScenesPanel()}>
        <div class="p-4 space-y-2">
          <button class="btn btn-primary w-full gap-2" onClick={saveCurrentScene}>
            <IconDeviceFloppy size={20} />
            Save Current Scene
          </button>

          <div class="flex gap-2">
            <button class="btn btn-sm btn-ghost flex-1 gap-1" onClick={exportAllScenes}>
              <IconDownload size={16} />
              Export All
            </button>
            <button class="btn btn-sm btn-ghost flex-1 gap-1" onClick={importAllScenes}>
              <IconUpload size={16} />
              Import All
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          <Show
            when={StreamStore.scenes.length > 0}
            fallback={
              <div class="text-center text-base-content/50 py-8">
                <IconMovie size={48} class="mx-auto mb-2 opacity-30" />
                <p class="text-sm">No scenes saved yet</p>
                <p class="text-xs mt-1">Save your current sources as a scene</p>
              </div>
            }
          >
            <For each={StreamStore.scenes}>
              {(scene) => (
                <div
                  class={`card bg-base-100 shadow-sm cursor-pointer transition-all ${StreamStore.activeSceneId === scene.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => StreamStore.loadScene(scene.id)}
                >
                  <div class="card-body p-3">
                    <div class="flex items-center justify-between">
                      <div class="flex-1">
                        <div class="font-semibold">{scene.name}</div>
                        <div class="text-xs text-base-content/60">
                          {scene.sources.length} sources
                        </div>
                      </div>
                      <button
                        class="btn btn-ghost btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete scene "${scene.name}"?`)) {
                            StreamStore.deleteScene(scene.id);
                          }
                        }}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>

      {/* Advanced Text Dialog */}
      <Show when={showAdvancedTextDialog()}>
        <AdvancedTextDialog
          initialConfig={editingTextSource()?.config}
          isEdit={!!editingTextSource()}
          onConfirm={confirmAddText}
          onCancel={() => {
            setShowAdvancedTextDialog(false);
            setEditingTextSource(null);
          }}
        />
      </Show>

      {/* Browser Dialog */}
      <Show when={showBrowserDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBrowserDialog(false)}>
          <div class="card bg-base-100 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div class="card-body">
              <h3 class="card-title">Add Browser Source</h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">URL</span>
                </label>
                <input
                  type="url"
                  class="input input-bordered"
                  placeholder="https://example.com"
                  value={browserUrl()}
                  onInput={(e) => setBrowserUrl(e.target.value)}
                />
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-ghost" onClick={() => setShowBrowserDialog(false)}>
                  Cancel
                </button>
                <button class="btn btn-primary" onClick={confirmAddBrowser}>
                  Add Browser Source
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Chroma Key Dialog */}
      <Show when={showChromaKeyDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowChromaKeyDialog(false)}>
          <div class="card bg-base-100 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div class="card-body">
              <h3 class="card-title">Chroma Key Settings</h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Key Color</span>
                </label>
                <div class="flex gap-2">
                  <input
                    type="color"
                    class="input input-bordered h-12 flex-1"
                    value={chromaKeyColor()}
                    onInput={(e) => setChromaKeyColor(e.target.value)}
                  />
                  <button class="btn btn-sm" onClick={() => setChromaKeyColor('#00ff00')}>Green</button>
                  <button class="btn btn-sm" onClick={() => setChromaKeyColor('#0000ff')}>Blue</button>
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Similarity ({chromaKeySimilarity().toFixed(2)})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chromaKeySimilarity()}
                  onInput={(e) => setChromaKeySimilarity(parseFloat(e.target.value))}
                  class="range"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Smoothness ({chromaKeySmoothness().toFixed(2)})</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={chromaKeySmoothness()}
                  onInput={(e) => setChromaKeySmoothness(parseFloat(e.target.value))}
                  class="range"
                />
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-ghost" onClick={disableChromaKey}>
                  Disable
                </button>
                <button class="btn btn-primary" onClick={applyChromaKey}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Save Scene Dialog */}
      <Show when={showSaveSceneDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveSceneDialog(false)}>
          <div class="card bg-base-100 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div class="card-body">
              <h3 class="card-title">Save Scene</h3>

              <div class="form-control">
                <label class="label">
                  <span class="label-text">Scene Name</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered"
                  placeholder="My Scene"
                  value={sceneName()}
                  onInput={(e) => setSceneName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && confirmSaveScene()}
                />
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-ghost" onClick={() => setShowSaveSceneDialog(false)}>
                  Cancel
                </button>
                <button class="btn btn-primary" onClick={confirmSaveScene}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Display Select Dialog */}
      <Show when={showDisplaySelectDialog()}>
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDisplaySelectDialog(false)}>
          <div class="card bg-base-100 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div class="card-body">
              <h3 class="card-title">Select Display</h3>

              <div class="space-y-2">
                <For each={availableDisplays()}>
                  {(display) => (
                    <button
                      class="btn btn-outline w-full justify-start"
                      onClick={() => confirmDisplayCapture(display.id)}
                    >
                      <IconDeviceDesktop size={20} />
                      <div class="flex-1 text-left">
                        <div class="font-semibold">{display.name}</div>
                        <div class="text-xs opacity-70">
                          {display.width}x{display.height} @ ({display.x}, {display.y})
                        </div>
                      </div>
                    </button>
                  )}
                </For>
              </div>

              <div class="card-actions justify-end">
                <button class="btn btn-ghost" onClick={() => setShowDisplaySelectDialog(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
