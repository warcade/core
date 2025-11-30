import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import {
  IconVolume,
  IconVolumeOff,
  IconHeadphones,
  IconMicrophone,
  IconAdjustments
} from '@tabler/icons-solidjs';

/**
 * VUMeter - Volume level meter
 */
function VUMeter(props) {
  const [level, setLevel] = createSignal(0);
  let animationFrame;

  onMount(() => {
    const updateLevel = () => {
      // Simulate level based on track activity
      // In a real implementation, this would read from the track's analyser
      if (props.track && !props.track.muted) {
        const activeVoices = props.track.activeVoices?.size || 0;
        const targetLevel = activeVoices > 0 ? 0.5 + Math.random() * 0.3 : 0;
        setLevel(prev => prev * 0.9 + targetLevel * 0.1);
      } else {
        setLevel(prev => prev * 0.9);
      }
      animationFrame = requestAnimationFrame(updateLevel);
    };
    updateLevel();
  });

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  const getLevelColor = (l) => {
    if (l > 0.9) return 'bg-red-500';
    if (l > 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div class="w-3 h-32 bg-base-300 rounded overflow-hidden flex flex-col-reverse">
      <div
        class={`w-full transition-all duration-75 ${getLevelColor(level())}`}
        style={{ height: `${level() * 100}%` }}
      />
    </div>
  );
}

/**
 * ChannelStrip - Single mixer channel
 */
function ChannelStrip(props) {
  const [volume, setVolume] = createSignal(props.track?.volume || 0.8);
  const [pan, setPan] = createSignal(props.track?.pan || 0);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    props.track?.setVolume(val);
  };

  const handlePanChange = (e) => {
    const val = parseFloat(e.target.value);
    setPan(val);
    props.track?.setPan(val);
  };

  const handleMute = () => {
    props.track?.setMuted(!props.track.muted);
    props.onUpdate?.();
  };

  const handleSolo = () => {
    props.track?.setSolo(!props.track.solo);
    props.project?.updateSoloState();
    props.onUpdate?.();
  };

  const handleArm = () => {
    props.track?.setArmed(!props.track.armed);
    props.onUpdate?.();
  };

  const volumeDb = () => {
    const v = volume();
    if (v <= 0) return '-∞';
    return (20 * Math.log10(v)).toFixed(1);
  };

  return (
    <div
      class={`flex flex-col items-center p-2 bg-base-200 rounded-lg min-w-[80px] border-2 ${
        props.selected ? 'border-primary' : 'border-transparent'
      }`}
      onClick={() => props.onSelect?.(props.track?.id)}
    >
      {/* Track name */}
      <div
        class="w-full h-2 rounded mb-2"
        style={{ "background-color": props.track?.color || '#666' }}
      />
      <div class="text-xs font-medium truncate w-full text-center mb-2">
        {props.track?.name || 'Track'}
      </div>

      {/* Pan knob */}
      <div class="mb-2">
        <div class="text-xs text-base-content/50 text-center mb-1">Pan</div>
        <input
          type="range"
          class="range range-xs w-16"
          min="-1"
          max="1"
          step="0.01"
          value={pan()}
          onInput={handlePanChange}
        />
        <div class="text-xs text-center font-mono">
          {pan() === 0 ? 'C' : pan() < 0 ? `L${Math.abs(Math.round(pan() * 100))}` : `R${Math.round(pan() * 100)}`}
        </div>
      </div>

      {/* Controls row */}
      <div class="flex gap-1 mb-2">
        <button
          class={`btn btn-xs btn-square ${props.track?.muted ? 'btn-error' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleMute(); }}
          title="Mute"
        >
          M
        </button>
        <button
          class={`btn btn-xs btn-square ${props.track?.solo ? 'btn-warning' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleSolo(); }}
          title="Solo"
        >
          S
        </button>
        <button
          class={`btn btn-xs btn-square ${props.track?.armed ? 'btn-error' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleArm(); }}
          title="Record"
        >
          R
        </button>
      </div>

      {/* Fader and meter */}
      <div class="flex gap-2 items-center flex-1">
        <VUMeter track={props.track} />

        <div class="flex flex-col items-center">
          <input
            type="range"
            class="range range-primary range-sm h-32"
            style={{ "writing-mode": "vertical-lr", direction: "rtl" }}
            min="0"
            max="1"
            step="0.01"
            value={volume()}
            onInput={handleVolumeChange}
          />
        </div>
      </div>

      {/* Volume display */}
      <div class="text-xs font-mono mt-2">{volumeDb()} dB</div>
    </div>
  );
}

/**
 * MasterChannel - Master output channel
 */
function MasterChannel(props) {
  const [volume, setVolume] = createSignal(0.8);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    props.engine?.setMasterVolume(val);
  };

  const volumeDb = () => {
    const v = volume();
    if (v <= 0) return '-∞';
    return (20 * Math.log10(v)).toFixed(1);
  };

  return (
    <div class="flex flex-col items-center p-2 bg-base-300 rounded-lg min-w-[80px] border-2 border-accent">
      {/* Label */}
      <div class="w-full h-2 rounded mb-2 bg-gradient-to-r from-primary to-secondary" />
      <div class="text-xs font-bold truncate w-full text-center mb-2">MASTER</div>

      {/* Spacer */}
      <div class="flex-1" />

      {/* Fader */}
      <div class="flex gap-2 items-center">
        <div class="w-3 h-32 bg-base-100 rounded overflow-hidden flex flex-col-reverse">
          <div
            class="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ height: `${volume() * 100}%` }}
          />
        </div>

        <input
          type="range"
          class="range range-accent range-sm h-32"
          style={{ "writing-mode": "vertical-lr", direction: "rtl" }}
          min="0"
          max="1"
          step="0.01"
          value={volume()}
          onInput={handleVolumeChange}
        />
      </div>

      {/* Volume display */}
      <div class="text-xs font-mono mt-2">{volumeDb()} dB</div>
    </div>
  );
}

/**
 * Mixer - Full mixer view with all channels
 */
export default function Mixer(props) {
  const [selectedTrackId, setSelectedTrackId] = createSignal(null);
  const [, setForceUpdate] = createSignal(0);

  const forceUpdate = () => setForceUpdate(n => n + 1);

  onMount(() => {
    if (props.project) {
      props.project.addListener(() => forceUpdate());
    }
  });

  return (
    <div class="flex flex-col h-full bg-base-100">
      {/* Toolbar */}
      <div class="flex items-center gap-2 p-2 bg-base-200 border-b border-base-content/10">
        <IconAdjustments class="w-5 h-5" />
        <span class="font-medium">Mixer</span>
        <div class="flex-1" />
        <span class="text-sm text-base-content/60">
          {props.project?.tracks?.length || 0} tracks
        </span>
      </div>

      {/* Channels */}
      <div class="flex-1 overflow-x-auto p-4">
        <div class="flex gap-2 h-full">
          {/* Track channels */}
          <For each={props.project?.tracks || []}>
            {(track) => (
              <ChannelStrip
                track={track}
                project={props.project}
                selected={selectedTrackId() === track.id}
                onSelect={setSelectedTrackId}
                onUpdate={forceUpdate}
              />
            )}
          </For>

          {/* Empty state */}
          <Show when={!props.project?.tracks?.length}>
            <div class="flex items-center justify-center flex-1 text-base-content/50">
              No tracks in project
            </div>
          </Show>

          {/* Spacer */}
          <div class="flex-1 min-w-[100px]" />

          {/* Master channel */}
          <MasterChannel engine={props.engine} />
        </div>
      </div>
    </div>
  );
}
