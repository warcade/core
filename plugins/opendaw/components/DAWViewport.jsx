import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import {
  IconMusic,
  IconLayoutRows,
  IconAdjustments,
  IconPiano,
  IconDeviceFloppy,
  IconFolderOpen,
  IconPlus,
  IconSettings
} from '@tabler/icons-solidjs';

import { getAudioEngine } from '../engine/AudioEngine.js';
import { getMidiEngine } from '../engine/MidiEngine.js';
import { getTransport, PlayState } from '../engine/Transport.js';
import { getProject, createNewProject } from '../engine/Project.js';

import TransportBar from './TransportBar.jsx';
import Timeline from './Timeline.jsx';
import Mixer from './Mixer.jsx';
import PianoRoll from './PianoRoll.jsx';

/**
 * Main DAW Viewport
 */
export default function DAWViewport() {
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [activeView, setActiveView] = createSignal('arrange'); // arrange, mixer, pianoroll
  const [bottomPanelView, setBottomPanelView] = createSignal(null); // null, mixer, pianoroll
  const [editingClip, setEditingClip] = createSignal(null);
  const [, setForceUpdate] = createSignal(0);

  let engine;
  let midiEngine;
  let transport;
  let project;

  const forceUpdate = () => setForceUpdate(n => n + 1);

  onMount(async () => {
    // Initialize engines
    engine = getAudioEngine();
    midiEngine = getMidiEngine();
    transport = getTransport();
    project = getProject();

    await engine.init();
    await transport.init();
    await midiEngine.init();
    await project.init();

    // Set default project settings
    project.name = 'New Project';
    project.setBpm(120);

    // Create initial track
    const track = project.createMidiTrack('Synth Lead');
    track.oscillatorType = 'sawtooth';
    track.filterFreq = 3000;

    setIsInitialized(true);
    forceUpdate();

    console.log('[OpenDAW] Initialized');
  });

  onCleanup(() => {
    if (project) {
      project.stopAll();
    }
  });

  const handleNewProject = () => {
    if (project) {
      project.dispose();
    }
    project = createNewProject('Untitled Project');
    project.init();
    forceUpdate();
  };

  const handleSaveProject = () => {
    if (!project) return;

    const json = JSON.stringify(project.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}.opendaw`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleLoadProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.opendaw,.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const text = await file.text();
      const json = JSON.parse(text);

      if (project) {
        project.dispose();
      }

      project = createNewProject();
      await project.init();
      project.loadFromJSON(json);
      forceUpdate();
    };

    input.click();
  };

  const handleEditClip = (clipInstance) => {
    setEditingClip(clipInstance);
    setBottomPanelView('pianoroll');
  };

  const handleCloseEditor = () => {
    setEditingClip(null);
    setBottomPanelView(null);
  };

  const getEditingTrack = () => {
    if (!editingClip() || !project) return null;
    return project.tracks.find(t =>
      t.clipInstances.some(ci => ci.id === editingClip().id)
    );
  };

  return (
    <div class="w-full h-full flex flex-col bg-base-100 overflow-hidden">
      {/* Top Menu Bar */}
      <div class="flex items-center gap-2 px-4 py-1 bg-base-300 border-b border-base-content/10">
        <div class="flex items-center gap-2">
          <IconMusic class="w-5 h-5 text-primary" />
          <span class="font-bold">OpenDAW</span>
        </div>

        <div class="divider divider-horizontal m-0" />

        {/* File operations */}
        <button class="btn btn-xs btn-ghost gap-1" onClick={handleNewProject}>
          <IconPlus class="w-3 h-3" />
          New
        </button>
        <button class="btn btn-xs btn-ghost gap-1" onClick={handleLoadProject}>
          <IconFolderOpen class="w-3 h-3" />
          Open
        </button>
        <button class="btn btn-xs btn-ghost gap-1" onClick={handleSaveProject}>
          <IconDeviceFloppy class="w-3 h-3" />
          Save
        </button>

        <div class="flex-1" />

        {/* View toggles */}
        <div class="btn-group">
          <button
            class={`btn btn-xs ${activeView() === 'arrange' ? 'btn-active' : ''}`}
            onClick={() => setActiveView('arrange')}
          >
            <IconLayoutRows class="w-4 h-4" />
          </button>
          <button
            class={`btn btn-xs ${activeView() === 'mixer' ? 'btn-active' : ''}`}
            onClick={() => setActiveView('mixer')}
          >
            <IconAdjustments class="w-4 h-4" />
          </button>
        </div>

        <div class="divider divider-horizontal m-0" />

        {/* Bottom panel toggles */}
        <button
          class={`btn btn-xs ${bottomPanelView() === 'mixer' ? 'btn-active' : 'btn-ghost'}`}
          onClick={() => setBottomPanelView(bottomPanelView() === 'mixer' ? null : 'mixer')}
          title="Toggle Mixer"
        >
          <IconAdjustments class="w-4 h-4" />
        </button>
        <button
          class={`btn btn-xs ${bottomPanelView() === 'pianoroll' ? 'btn-active' : 'btn-ghost'}`}
          onClick={() => setBottomPanelView(bottomPanelView() === 'pianoroll' ? null : 'pianoroll')}
          title="Toggle Piano Roll"
        >
          <IconPiano class="w-4 h-4" />
        </button>
      </div>

      {/* Transport Bar */}
      <Show when={isInitialized()}>
        <TransportBar
          transport={transport}
          project={project}
        />
      </Show>

      {/* Main Content */}
      <div class="flex-1 flex flex-col overflow-hidden">
        <Show
          when={isInitialized()}
          fallback={
            <div class="flex-1 flex items-center justify-center">
              <div class="flex flex-col items-center gap-4">
                <span class="loading loading-spinner loading-lg text-primary" />
                <span class="text-base-content/60">Initializing audio engine...</span>
              </div>
            </div>
          }
        >
          {/* Main view area */}
          <div class={`flex-1 overflow-hidden ${bottomPanelView() ? 'h-1/2' : ''}`}>
            <Show when={activeView() === 'arrange'}>
              <Timeline
                project={project}
                transport={transport}
                onEditClip={handleEditClip}
              />
            </Show>

            <Show when={activeView() === 'mixer'}>
              <Mixer
                project={project}
                engine={engine}
              />
            </Show>
          </div>

          {/* Bottom panel */}
          <Show when={bottomPanelView()}>
            <div class="h-1/2 border-t border-base-content/20">
              <Show when={bottomPanelView() === 'mixer'}>
                <Mixer
                  project={project}
                  engine={engine}
                />
              </Show>

              <Show when={bottomPanelView() === 'pianoroll'}>
                <PianoRoll
                  project={project}
                  clipInstance={editingClip()}
                  track={getEditingTrack()}
                  onClose={handleCloseEditor}
                />
              </Show>
            </div>
          </Show>
        </Show>
      </div>

      {/* Status Bar */}
      <div class="flex items-center justify-between px-4 py-1 bg-base-300 border-t border-base-content/10 text-xs text-base-content/60">
        <div class="flex items-center gap-4">
          <span>Sample Rate: {engine?.sampleRate || 44100}Hz</span>
          <span>MIDI: {midiEngine?.inputs?.size || 0} in / {midiEngine?.outputs?.size || 0} out</span>
        </div>
        <div class="flex items-center gap-4">
          <span>{project?.tracks?.length || 0} tracks</span>
          <span>{project?.clips?.size || 0} clips</span>
        </div>
      </div>
    </div>
  );
}
