import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRepeat,
  IconMetronome,
  IconRecordMail
} from '@tabler/icons-solidjs';

/**
 * TransportBar - Playback controls and position display
 */
export default function TransportBar(props) {
  const [position, setPosition] = createSignal('1.1.000');
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [isRecording, setIsRecording] = createSignal(false);
  const [bpm, setBpm] = createSignal(props.project?.bpm || 120);
  const [loopEnabled, setLoopEnabled] = createSignal(false);
  const [metronomeEnabled, setMetronomeEnabled] = createSignal(false);

  let positionInterval;

  onMount(() => {
    if (props.transport) {
      // Update position display
      positionInterval = setInterval(() => {
        setPosition(props.transport.formatPosition());
      }, 50);

      // Listen for transport events
      props.transport.addListener((event, data) => {
        switch (event) {
          case 'play':
            setIsPlaying(true);
            break;
          case 'pause':
          case 'stop':
            setIsPlaying(false);
            break;
          case 'record':
            setIsRecording(true);
            break;
          case 'bpmChange':
            setBpm(data);
            break;
          case 'loopChange':
            setLoopEnabled(data.enabled);
            break;
        }
      });
    }
  });

  onCleanup(() => {
    if (positionInterval) {
      clearInterval(positionInterval);
    }
  });

  const handlePlay = async () => {
    if (props.transport) {
      await props.transport.play();
    }
  };

  const handlePause = () => {
    if (props.transport) {
      props.transport.pause();
    }
  };

  const handleStop = () => {
    if (props.transport) {
      props.transport.stop();
      setIsRecording(false);
    }
  };

  const handleRecord = () => {
    if (props.transport) {
      props.transport.record();
    }
  };

  const handleSkipBack = () => {
    if (props.transport) {
      props.transport.goToStart();
    }
  };

  const handleSkipForward = () => {
    if (props.transport) {
      props.transport.skip(4);
    }
  };

  const handleBpmChange = (e) => {
    const newBpm = parseInt(e.target.value);
    if (props.project && !isNaN(newBpm)) {
      props.project.setBpm(newBpm);
      setBpm(newBpm);
    }
  };

  const handleToggleLoop = () => {
    if (props.transport) {
      props.transport.toggleLoop();
      setLoopEnabled(!loopEnabled());
    }
  };

  const handleToggleMetronome = () => {
    if (props.transport) {
      props.transport.metronomeEnabled = !props.transport.metronomeEnabled;
      setMetronomeEnabled(props.transport.metronomeEnabled);
    }
  };

  return (
    <div class="flex items-center gap-4 bg-base-300 px-4 py-2 border-b border-base-content/10">
      {/* Transport Controls */}
      <div class="flex items-center gap-1">
        <button
          class="btn btn-sm btn-square btn-ghost"
          onClick={handleSkipBack}
          title="Go to start"
        >
          <IconPlayerSkipBack class="w-4 h-4" />
        </button>

        <button
          class={`btn btn-sm btn-square ${isRecording() ? 'btn-error' : 'btn-ghost'}`}
          onClick={handleRecord}
          title="Record"
        >
          <IconRecordMail class="w-4 h-4" />
        </button>

        <Show
          when={isPlaying()}
          fallback={
            <button
              class="btn btn-sm btn-square btn-primary"
              onClick={handlePlay}
              title="Play"
            >
              <IconPlayerPlay class="w-5 h-5" />
            </button>
          }
        >
          <button
            class="btn btn-sm btn-square btn-primary"
            onClick={handlePause}
            title="Pause"
          >
            <IconPlayerPause class="w-5 h-5" />
          </button>
        </Show>

        <button
          class="btn btn-sm btn-square btn-ghost"
          onClick={handleStop}
          title="Stop"
        >
          <IconPlayerStop class="w-4 h-4" />
        </button>

        <button
          class="btn btn-sm btn-square btn-ghost"
          onClick={handleSkipForward}
          title="Skip forward"
        >
          <IconPlayerSkipForward class="w-4 h-4" />
        </button>
      </div>

      {/* Position Display */}
      <div class="bg-base-100 px-3 py-1 rounded font-mono text-lg min-w-[120px] text-center border border-base-content/10">
        {position()}
      </div>

      {/* BPM Control */}
      <div class="flex items-center gap-2">
        <span class="text-sm text-base-content/60">BPM</span>
        <input
          type="number"
          class="input input-sm input-bordered w-20 font-mono text-center"
          value={bpm()}
          min={20}
          max={300}
          onInput={handleBpmChange}
        />
      </div>

      {/* Time Signature */}
      <div class="flex items-center gap-1 text-sm">
        <span class="font-mono">{props.project?.timeSignature?.numerator || 4}</span>
        <span class="text-base-content/40">/</span>
        <span class="font-mono">{props.project?.timeSignature?.denominator || 4}</span>
      </div>

      {/* Loop Toggle */}
      <button
        class={`btn btn-sm btn-square ${loopEnabled() ? 'btn-accent' : 'btn-ghost'}`}
        onClick={handleToggleLoop}
        title="Toggle loop"
      >
        <IconRepeat class="w-4 h-4" />
      </button>

      {/* Metronome Toggle */}
      <button
        class={`btn btn-sm btn-square ${metronomeEnabled() ? 'btn-warning' : 'btn-ghost'}`}
        onClick={handleToggleMetronome}
        title="Toggle metronome"
      >
        <IconMetronome class="w-4 h-4" />
      </button>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Project Name */}
      <div class="text-sm text-base-content/60">
        {props.project?.name || 'Untitled Project'}
      </div>
    </div>
  );
}
