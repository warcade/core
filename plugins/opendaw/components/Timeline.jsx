import { createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import {
  IconPlus,
  IconTrash,
  IconVolume,
  IconVolumeOff,
  IconHeadphones,
  IconMicrophone,
  IconGripVertical
} from '@tabler/icons-solidjs';

/**
 * TrackHeader - Track info and controls in the track list
 */
function TrackHeader(props) {
  const [volume, setVolume] = createSignal(props.track.volume);

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    props.track.setVolume(val);
  };

  const handleMute = () => {
    props.track.setMuted(!props.track.muted);
    props.onUpdate?.();
  };

  const handleSolo = () => {
    props.track.setSolo(!props.track.solo);
    props.project?.updateSoloState();
    props.onUpdate?.();
  };

  const handleArm = () => {
    props.track.setArmed(!props.track.armed);
    props.onUpdate?.();
  };

  return (
    <div
      class={`flex items-center gap-2 p-2 border-b border-base-content/10 h-20 ${
        props.selected ? 'bg-primary/20' : 'bg-base-200'
      }`}
      onClick={() => props.onSelect?.(props.track.id)}
    >
      {/* Drag Handle */}
      <div class="cursor-grab text-base-content/30 hover:text-base-content/60">
        <IconGripVertical class="w-4 h-4" />
      </div>

      {/* Color indicator */}
      <div
        class="w-2 h-12 rounded-full"
        style={{ "background-color": props.track.color }}
      />

      {/* Track Name */}
      <div class="flex-1 min-w-0">
        <input
          type="text"
          class="input input-xs input-ghost w-full font-medium"
          value={props.track.name}
          onInput={(e) => {
            props.track.name = e.target.value;
            props.onUpdate?.();
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <div class="text-xs text-base-content/50 uppercase">{props.track.type}</div>
      </div>

      {/* Track Controls */}
      <div class="flex items-center gap-1">
        <button
          class={`btn btn-xs btn-square ${props.track.muted ? 'btn-error' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleMute(); }}
          title="Mute"
        >
          {props.track.muted ? <IconVolumeOff class="w-3 h-3" /> : <IconVolume class="w-3 h-3" />}
        </button>

        <button
          class={`btn btn-xs btn-square ${props.track.solo ? 'btn-warning' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleSolo(); }}
          title="Solo"
        >
          <IconHeadphones class="w-3 h-3" />
        </button>

        <button
          class={`btn btn-xs btn-square ${props.track.armed ? 'btn-error' : 'btn-ghost'}`}
          onClick={(e) => { e.stopPropagation(); handleArm(); }}
          title="Record Arm"
        >
          <IconMicrophone class="w-3 h-3" />
        </button>
      </div>

      {/* Volume Fader */}
      <input
        type="range"
        class="range range-xs range-primary w-16"
        min="0"
        max="1"
        step="0.01"
        value={volume()}
        onInput={handleVolumeChange}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Delete */}
      <button
        class="btn btn-xs btn-square btn-ghost text-error"
        onClick={(e) => { e.stopPropagation(); props.onDelete?.(props.track.id); }}
        title="Delete track"
      >
        <IconTrash class="w-3 h-3" />
      </button>
    </div>
  );
}

/**
 * ClipView - Visual representation of a clip on the timeline
 */
function ClipView(props) {
  const getClipStyle = () => {
    const left = props.instance.startBeat * props.pixelsPerBeat;
    const width = props.instance.clip.length * props.pixelsPerBeat;
    return {
      left: `${left}px`,
      width: `${Math.max(width, 20)}px`,
      "background-color": props.instance.clip.color
    };
  };

  return (
    <div
      class={`absolute top-1 bottom-1 rounded cursor-pointer opacity-90 hover:opacity-100 border border-white/20 ${
        props.selected ? 'ring-2 ring-primary' : ''
      } ${props.instance.muted ? 'opacity-50' : ''}`}
      style={getClipStyle()}
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect?.(props.instance.id);
      }}
      onDblClick={(e) => {
        e.stopPropagation();
        props.onDoubleClick?.(props.instance);
      }}
    >
      <div class="px-1 py-0.5 text-xs text-white truncate font-medium">
        {props.instance.clip.name}
      </div>

      {/* Note visualization for MIDI clips */}
      <div class="absolute inset-x-1 top-5 bottom-1 overflow-hidden">
        <For each={props.instance.clip.notes}>
          {(note) => {
            const left = (note.startTime / props.instance.clip.length) * 100;
            const width = (note.duration / props.instance.clip.length) * 100;
            const bottom = ((note.note - 36) / 48) * 100; // C2 to C6 range
            return (
              <div
                class="absolute h-1 bg-white/60 rounded-sm"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 1)}%`,
                  bottom: `${Math.max(0, Math.min(100, bottom))}%`
                }}
              />
            );
          }}
        </For>
      </div>
    </div>
  );
}

/**
 * TrackLane - The timeline area for a single track
 */
function TrackLane(props) {
  const handleClick = (e) => {
    // Calculate click position in beats
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (props.scrollLeft || 0);
    const beat = Math.floor(x / props.pixelsPerBeat);

    if (e.detail === 2) {
      // Double click - create new clip
      props.onCreateClip?.(props.track.id, beat);
    }
  };

  return (
    <div
      class={`relative h-20 border-b border-base-content/10 ${
        props.selected ? 'bg-primary/5' : 'bg-base-100'
      }`}
      onClick={handleClick}
    >
      {/* Clip instances */}
      <For each={props.track.clipInstances}>
        {(instance) => (
          <ClipView
            instance={instance}
            pixelsPerBeat={props.pixelsPerBeat}
            selected={props.selectedClipId === instance.id}
            onSelect={props.onSelectClip}
            onDoubleClick={props.onEditClip}
          />
        )}
      </For>
    </div>
  );
}

/**
 * TimeRuler - Beat/bar ruler at the top
 */
function TimeRuler(props) {
  const markers = () => {
    const result = [];
    const beatsPerBar = props.timeSignature?.numerator || 4;
    const totalBars = Math.ceil(props.totalBeats / beatsPerBar);

    for (let bar = 0; bar <= totalBars; bar++) {
      const beat = bar * beatsPerBar;
      result.push({
        beat,
        bar: bar + 1,
        isBar: true
      });

      // Add beat markers
      for (let b = 1; b < beatsPerBar; b++) {
        result.push({
          beat: beat + b,
          bar: bar + 1,
          isBar: false
        });
      }
    }

    return result;
  };

  return (
    <div
      class="h-6 bg-base-200 border-b border-base-content/20 relative"
      style={{ width: `${props.totalBeats * props.pixelsPerBeat}px` }}
    >
      <For each={markers()}>
        {(marker) => (
          <div
            class={`absolute top-0 bottom-0 ${marker.isBar ? 'border-l border-base-content/30' : 'border-l border-base-content/10'}`}
            style={{ left: `${marker.beat * props.pixelsPerBeat}px` }}
          >
            {marker.isBar && (
              <span class="text-xs text-base-content/60 ml-1">{marker.bar}</span>
            )}
          </div>
        )}
      </For>
    </div>
  );
}

/**
 * Playhead - Current position indicator
 */
function Playhead(props) {
  return (
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${props.beat * props.pixelsPerBeat}px` }}
    >
      <div class="w-3 h-3 bg-red-500 -ml-1 rounded-b" />
    </div>
  );
}

/**
 * Timeline - Main arrangement view
 */
export default function Timeline(props) {
  const [pixelsPerBeat, setPixelsPerBeat] = createSignal(40);
  const [scrollLeft, setScrollLeft] = createSignal(0);
  const [playheadBeat, setPlayheadBeat] = createSignal(0);
  const [selectedTrackId, setSelectedTrackId] = createSignal(null);
  const [selectedClipId, setSelectedClipId] = createSignal(null);
  const [, setForceUpdate] = createSignal(0);

  let timelineRef;
  let scrollContainerRef;

  const forceUpdate = () => setForceUpdate(n => n + 1);

  onMount(() => {
    // Update playhead position
    if (props.transport) {
      props.transport.addListener((event, data) => {
        if (event === 'tick') {
          setPlayheadBeat(data);
        }
      });
    }

    // Listen for project changes
    if (props.project) {
      props.project.addListener((event, data) => {
        forceUpdate();
      });
    }
  });

  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
  };

  const handleZoom = (direction) => {
    setPixelsPerBeat(prev => {
      if (direction > 0) return Math.min(prev * 1.2, 200);
      return Math.max(prev / 1.2, 10);
    });
  };

  const handleAddTrack = (type) => {
    if (props.project) {
      if (type === 'midi') {
        props.project.createMidiTrack();
      } else {
        props.project.createAudioTrack();
      }
      forceUpdate();
    }
  };

  const handleDeleteTrack = (trackId) => {
    if (props.project) {
      props.project.deleteTrack(trackId);
      forceUpdate();
    }
  };

  const handleSelectTrack = (trackId) => {
    setSelectedTrackId(trackId);
    if (props.project) {
      props.project.selectTrack(trackId);
    }
  };

  const handleCreateClip = (trackId, startBeat) => {
    if (props.project) {
      const track = props.project.getTrack(trackId);
      if (track && track.type === 'midi') {
        const clip = props.project.createMidiClip('New Clip', 4);
        track.addClipInstance(clip, startBeat);
        forceUpdate();
      }
    }
  };

  const handleSelectClip = (clipId) => {
    setSelectedClipId(clipId);
  };

  const handleEditClip = (instance) => {
    props.onEditClip?.(instance);
  };

  const totalBeats = () => props.project?.calculateLength() || 64;

  return (
    <div class="flex flex-col h-full bg-base-100">
      {/* Toolbar */}
      <div class="flex items-center gap-2 p-2 bg-base-200 border-b border-base-content/10">
        <div class="dropdown">
          <label tabIndex={0} class="btn btn-sm btn-primary gap-1">
            <IconPlus class="w-4 h-4" />
            Add Track
          </label>
          <ul tabIndex={0} class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
            <li><a onClick={() => handleAddTrack('midi')}>MIDI Track</a></li>
            <li><a onClick={() => handleAddTrack('audio')}>Audio Track</a></li>
          </ul>
        </div>

        <div class="flex-1" />

        {/* Zoom controls */}
        <div class="flex items-center gap-1">
          <button class="btn btn-xs btn-ghost" onClick={() => handleZoom(-1)}>-</button>
          <span class="text-xs w-12 text-center">{Math.round(pixelsPerBeat())}px</span>
          <button class="btn btn-xs btn-ghost" onClick={() => handleZoom(1)}>+</button>
        </div>
      </div>

      {/* Main content */}
      <div class="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <div class="w-64 flex-shrink-0 overflow-y-auto bg-base-200 border-r border-base-content/10">
          {/* Spacer for ruler */}
          <div class="h-6 border-b border-base-content/20" />

          <For each={props.project?.tracks || []}>
            {(track) => (
              <TrackHeader
                track={track}
                project={props.project}
                selected={selectedTrackId() === track.id}
                onSelect={handleSelectTrack}
                onDelete={handleDeleteTrack}
                onUpdate={forceUpdate}
              />
            )}
          </For>

          {/* Empty state */}
          <Show when={!props.project?.tracks?.length}>
            <div class="p-4 text-center text-base-content/50 text-sm">
              No tracks yet. Click "Add Track" to get started.
            </div>
          </Show>
        </div>

        {/* Timeline area */}
        <div
          ref={scrollContainerRef}
          class="flex-1 overflow-auto relative"
          onScroll={handleScroll}
        >
          <div
            ref={timelineRef}
            class="relative"
            style={{ width: `${totalBeats() * pixelsPerBeat()}px`, "min-height": '100%' }}
          >
            {/* Time ruler */}
            <TimeRuler
              pixelsPerBeat={pixelsPerBeat()}
              totalBeats={totalBeats()}
              timeSignature={props.project?.timeSignature}
            />

            {/* Track lanes */}
            <For each={props.project?.tracks || []}>
              {(track) => (
                <TrackLane
                  track={track}
                  project={props.project}
                  pixelsPerBeat={pixelsPerBeat()}
                  scrollLeft={scrollLeft()}
                  selected={selectedTrackId() === track.id}
                  selectedClipId={selectedClipId()}
                  onSelectClip={handleSelectClip}
                  onCreateClip={handleCreateClip}
                  onEditClip={handleEditClip}
                />
              )}
            </For>

            {/* Grid lines */}
            <div class="absolute inset-0 pointer-events-none" style={{ top: '24px' }}>
              <For each={Array.from({ length: totalBeats() }, (_, i) => i)}>
                {(beat) => (
                  <div
                    class={`absolute top-0 bottom-0 ${
                      beat % (props.project?.timeSignature?.numerator || 4) === 0
                        ? 'border-l border-base-content/20'
                        : 'border-l border-base-content/5'
                    }`}
                    style={{ left: `${beat * pixelsPerBeat()}px` }}
                  />
                )}
              </For>
            </div>

            {/* Playhead */}
            <div class="absolute" style={{ top: '0', bottom: '0', left: '0', right: '0', "pointer-events": 'none' }}>
              <Playhead beat={playheadBeat()} pixelsPerBeat={pixelsPerBeat()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
