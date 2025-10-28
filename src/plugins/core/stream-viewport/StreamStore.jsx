import { createSignal } from 'solid-js';

// Canvas dimensions (1920x1080 - standard streaming resolution)
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

const [sources, setSources] = createSignal([]);
const [selectedSourceId, setSelectedSourceId] = createSignal(null);
const [scenes, setScenes] = createSignal([]);
const [activeSceneId, setActiveSceneId] = createSignal(null);
const [isRecording, setIsRecording] = createSignal(false);
const [audioLevels, setAudioLevels] = createSignal({});

let nextSourceId = 1;
let nextSceneId = 1;

const StreamStore = {
  // Getters
  get sources() {
    return sources();
  },

  get selectedSourceId() {
    return selectedSourceId();
  },

  get selectedSource() {
    return sources().find(s => s.id === selectedSourceId());
  },

  get scenes() {
    return scenes();
  },

  get activeSceneId() {
    return activeSceneId();
  },

  get activeScene() {
    return scenes().find(s => s.id === activeSceneId());
  },

  get isRecording() {
    return isRecording();
  },

  get audioLevels() {
    return audioLevels();
  },

  // Actions
  addSource(type, config = {}) {
    console.log('StreamStore.addSource called with type:', type, 'config:', config);
    const newSource = {
      id: nextSourceId++,
      type, // 'webcam', 'display', 'image', 'text', 'browser', 'video'
      name: config.name || `${type} ${nextSourceId - 1}`,
      visible: true,
      locked: false,
      position: { x: config.x || 100, y: config.y || 100 },
      size: { width: config.width || 640, height: config.height || 480 },
      config: config // Additional configuration specific to source type
    };

    console.log('Creating new source:', newSource);
    setSources([...sources(), newSource]);
    console.log('Sources after add:', sources());
    setSelectedSourceId(newSource.id);
    return newSource;
  },

  removeSource(id) {
    setSources(sources().filter(s => s.id !== id));
    if (selectedSourceId() === id) {
      setSelectedSourceId(null);
    }
  },

  updateSource(id, updates) {
    setSources(sources().map(s => s.id === id ? { ...s, ...updates } : s));
  },

  moveSource(id, position) {
    this.updateSource(id, { position });
  },

  resizeSource(id, size) {
    this.updateSource(id, { size });
  },

  selectSource(id) {
    setSelectedSourceId(id);
  },

  toggleVisibility(id) {
    const source = sources().find(s => s.id === id);
    if (source) {
      this.updateSource(id, { visible: !source.visible });
    }
  },

  toggleLock(id) {
    const source = sources().find(s => s.id === id);
    if (source) {
      this.updateSource(id, { locked: !source.locked });
    }
  },

  moveSourceUp(id) {
    const index = sources().findIndex(s => s.id === id);
    if (index > 0) {
      const newSources = [...sources()];
      [newSources[index - 1], newSources[index]] = [newSources[index], newSources[index - 1]];
      setSources(newSources);
    }
  },

  moveSourceDown(id) {
    const index = sources().findIndex(s => s.id === id);
    if (index < sources().length - 1) {
      const newSources = [...sources()];
      [newSources[index], newSources[index + 1]] = [newSources[index + 1], newSources[index]];
      setSources(newSources);
    }
  },

  clearAllSources() {
    setSources([]);
    setSelectedSourceId(null);
  },

  // Scene Management
  saveScene(name) {
    const newScene = {
      id: nextSceneId++,
      name: name || `Scene ${nextSceneId - 1}`,
      sources: JSON.parse(JSON.stringify(sources())),
      createdAt: Date.now()
    };
    setScenes([...scenes(), newScene]);
    setActiveSceneId(newScene.id);
    return newScene;
  },

  loadScene(sceneId) {
    const scene = scenes().find(s => s.id === sceneId);
    if (scene) {
      setSources(JSON.parse(JSON.stringify(scene.sources)));
      nextSourceId = Math.max(...scene.sources.map(s => s.id), 0) + 1;
      setActiveSceneId(sceneId);
      setSelectedSourceId(null);
    }
  },

  deleteScene(sceneId) {
    setScenes(scenes().filter(s => s.id !== sceneId));
    if (activeSceneId() === sceneId) {
      setActiveSceneId(null);
    }
  },

  updateSceneName(sceneId, name) {
    setScenes(scenes().map(s => s.id === sceneId ? { ...s, name } : s));
  },

  // Recording
  setRecording(recording) {
    setIsRecording(recording);
  },

  // Audio Levels
  setAudioLevel(sourceId, level) {
    setAudioLevels({ ...audioLevels(), [sourceId]: level });
  },

  // Export/Import
  exportScene() {
    return {
      sources: sources(),
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT
    };
  },

  importScene(sceneData) {
    if (sceneData && sceneData.sources) {
      setSources(sceneData.sources);
      nextSourceId = Math.max(...sceneData.sources.map(s => s.id), 0) + 1;
      setSelectedSourceId(null);
    }
  },

  exportAllScenes() {
    return {
      scenes: scenes(),
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT
    };
  },

  importAllScenes(data) {
    if (data && data.scenes) {
      setScenes(data.scenes);
      nextSceneId = Math.max(...data.scenes.map(s => s.id), 0) + 1;
    }
  }
};

export default StreamStore;
