import { createSignal, onMount, onCleanup, For, Show, createEffect } from 'solid-js';
import {
  IconPencil,
  IconEraser,
  IconPointer,
  IconZoomIn,
  IconZoomOut,
  IconPlayerPlay,
  IconX
} from '@tabler/icons-solidjs';
import { MidiNote, midiToNoteName } from '../engine/MidiEngine.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Piano roll constants
const NOTE_HEIGHT = 16;
const MIN_NOTE = 24; // C1
const MAX_NOTE = 96; // C7
const NUM_NOTES = MAX_NOTE - MIN_NOTE;

/**
 * Piano keyboard on the left side
 */
function PianoKeys(props) {
  const isBlackKey = (note) => {
    const n = note % 12;
    return [1, 3, 6, 8, 10].includes(n);
  };

  const handleKeyClick = (note) => {
    props.onNotePreview?.(note);
  };

  return (
    <div class="flex flex-col-reverse border-r border-base-content/20">
      <For each={Array.from({ length: NUM_NOTES }, (_, i) => MIN_NOTE + i)}>
        {(note) => {
          const black = isBlackKey(note);
          const isC = note % 12 === 0;
          return (
            <div
              class={`h-4 flex items-center justify-end pr-1 text-xs cursor-pointer select-none ${
                black
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-800 border-b border-gray-200'
              } hover:bg-primary/30`}
              style={{ height: `${NOTE_HEIGHT}px` }}
              onClick={() => handleKeyClick(note)}
            >
              <span class={isC ? 'font-bold' : 'opacity-60'}>
                {midiToNoteName(note)}
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}

/**
 * Grid background
 */
function Grid(props) {
  const isBlackKey = (note) => {
    const n = note % 12;
    return [1, 3, 6, 8, 10].includes(n);
  };

  return (
    <div class="absolute inset-0 pointer-events-none">
      {/* Horizontal lines (note rows) */}
      <For each={Array.from({ length: NUM_NOTES }, (_, i) => MIN_NOTE + i)}>
        {(note) => {
          const black = isBlackKey(note);
          const y = (MAX_NOTE - note - 1) * NOTE_HEIGHT;
          return (
            <div
              class={`absolute left-0 right-0 border-b ${
                black ? 'bg-base-300/50 border-base-content/5' : 'border-base-content/10'
              }`}
              style={{ top: `${y}px`, height: `${NOTE_HEIGHT}px` }}
            />
          );
        }}
      </For>

      {/* Vertical lines (beat grid) */}
      <For each={Array.from({ length: Math.ceil(props.length) + 1 }, (_, i) => i)}>
        {(beat) => {
          const isBar = beat % (props.beatsPerBar || 4) === 0;
          return (
            <div
              class={`absolute top-0 bottom-0 ${
                isBar ? 'border-l border-base-content/30' : 'border-l border-base-content/10'
              }`}
              style={{ left: `${beat * props.pixelsPerBeat}px` }}
            />
          );
        }}
      </For>
    </div>
  );
}

/**
 * Note block component
 */
function NoteBlock(props) {
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);

  const getStyle = () => {
    const left = props.note.startTime * props.pixelsPerBeat;
    const width = Math.max(props.note.duration * props.pixelsPerBeat, 8);
    const top = (MAX_NOTE - props.note.note - 1) * NOTE_HEIGHT;
    const velocity = props.note.velocity / 127;

    return {
      left: `${left}px`,
      width: `${width}px`,
      top: `${top}px`,
      height: `${NOTE_HEIGHT - 1}px`,
      opacity: 0.5 + velocity * 0.5
    };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    // Check if clicking on resize handle
    const rect = e.currentTarget.getBoundingClientRect();
    const isRightEdge = e.clientX > rect.right - 8;

    if (isRightEdge) {
      setIsResizing(true);
      props.onResizeStart?.(props.note);
    } else {
      setIsDragging(true);
      props.onDragStart?.(props.note, e);
    }
  };

  return (
    <div
      class={`absolute rounded cursor-pointer border ${
        props.selected
          ? 'bg-primary border-primary-focus ring-2 ring-primary/50'
          : 'bg-accent border-accent-focus'
      } hover:brightness-110`}
      style={getStyle()}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect?.(props.note.id);
      }}
      onDblClick={(e) => {
        e.stopPropagation();
        props.onDelete?.(props.note.id);
      }}
    >
      {/* Velocity bar */}
      <div
        class="absolute bottom-0 left-0 right-0 bg-white/30"
        style={{ height: `${(props.note.velocity / 127) * 100}%` }}
      />

      {/* Resize handle */}
      <div class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30" />
    </div>
  );
}

/**
 * Velocity editor at the bottom
 */
function VelocityEditor(props) {
  const handleClick = (e) => {
    if (!props.selectedNote) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const velocity = Math.round((1 - y / rect.height) * 127);

    props.onVelocityChange?.(props.selectedNote, Math.max(1, Math.min(127, velocity)));
  };

  return (
    <div
      class="h-24 bg-base-200 border-t border-base-content/20 relative cursor-crosshair"
      onClick={handleClick}
    >
      <For each={props.notes || []}>
        {(note) => {
          const left = note.startTime * props.pixelsPerBeat;
          const width = Math.max(note.duration * props.pixelsPerBeat, 4);
          const height = (note.velocity / 127) * 100;

          return (
            <div
              class={`absolute bottom-0 ${
                props.selectedNote === note.id ? 'bg-primary' : 'bg-accent'
              }`}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                height: `${height}%`
              }}
            />
          );
        }}
      </For>
    </div>
  );
}

/**
 * Piano Roll - MIDI note editor
 */
export default function PianoRoll(props) {
  const [tool, setTool] = createSignal('pencil'); // pencil, eraser, select
  const [pixelsPerBeat, setPixelsPerBeat] = createSignal(40);
  const [selectedNoteId, setSelectedNoteId] = createSignal(null);
  const [, setForceUpdate] = createSignal(0);

  let gridRef;
  let scrollContainerRef;

  const forceUpdate = () => setForceUpdate(n => n + 1);

  const clip = () => props.clipInstance?.clip;
  const track = () => props.track;

  const handleGridClick = (e) => {
    if (!clip() || tool() !== 'pencil') return;

    const rect = gridRef.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollContainerRef.scrollLeft;
    const y = e.clientY - rect.top + scrollContainerRef.scrollTop;

    // Calculate note and time
    const beat = x / pixelsPerBeat();
    const noteNum = MAX_NOTE - 1 - Math.floor(y / NOTE_HEIGHT);

    if (noteNum >= MIN_NOTE && noteNum < MAX_NOTE) {
      // Snap to grid (quarter note)
      const snappedBeat = Math.floor(beat * 4) / 4;

      // Create new note
      const note = new MidiNote(noteNum, 100, snappedBeat, 0.5);
      clip().addNote(note);
      setSelectedNoteId(note.id);
      forceUpdate();

      // Preview the note
      if (track() && track().playNote) {
        track().playNote(noteNum, 100, 0.2);
      }
    }
  };

  const handleNoteSelect = (noteId) => {
    if (tool() === 'eraser') {
      clip()?.removeNote(noteId);
      forceUpdate();
    } else {
      setSelectedNoteId(noteId);
    }
  };

  const handleNoteDelete = (noteId) => {
    clip()?.removeNote(noteId);
    if (selectedNoteId() === noteId) {
      setSelectedNoteId(null);
    }
    forceUpdate();
  };

  const handleNotePreview = (note) => {
    if (track() && track().playNote) {
      track().playNote(note, 100, 0.3);
    }
  };

  const handleVelocityChange = (noteId, velocity) => {
    clip()?.updateNote(noteId, { velocity });
    forceUpdate();
  };

  const handleZoom = (direction) => {
    setPixelsPerBeat(prev => {
      if (direction > 0) return Math.min(prev * 1.2, 200);
      return Math.max(prev / 1.2, 10);
    });
  };

  const handlePlayClip = () => {
    if (!clip() || !track()) return;

    // Play all notes in the clip
    clip().notes.forEach(note => {
      const delay = note.startTime * (60 / (props.project?.bpm || 120));
      const duration = note.duration * (60 / (props.project?.bpm || 120));

      setTimeout(() => {
        track().playNote(note.note, note.velocity, duration);
      }, delay * 1000);
    });
  };

  const gridWidth = () => (clip()?.length || 4) * pixelsPerBeat();
  const gridHeight = () => NUM_NOTES * NOTE_HEIGHT;

  return (
    <div class="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div class="flex items-center gap-2 p-2 bg-base-200 border-b border-base-content/10">
        <Show when={clip()}>
          <span class="font-medium">{clip().name}</span>
          <span class="text-sm text-base-content/50">
            {clip().length} beats • {clip().notes.length} notes
          </span>
        </Show>

        <div class="flex-1" />

        {/* Tools */}
        <div class="btn-group">
          <button
            class={`btn btn-sm ${tool() === 'select' ? 'btn-active' : ''}`}
            onClick={() => setTool('select')}
            title="Select"
          >
            <IconPointer class="w-4 h-4" />
          </button>
          <button
            class={`btn btn-sm ${tool() === 'pencil' ? 'btn-active' : ''}`}
            onClick={() => setTool('pencil')}
            title="Draw"
          >
            <IconPencil class="w-4 h-4" />
          </button>
          <button
            class={`btn btn-sm ${tool() === 'eraser' ? 'btn-active' : ''}`}
            onClick={() => setTool('eraser')}
            title="Erase"
          >
            <IconEraser class="w-4 h-4" />
          </button>
        </div>

        <div class="divider divider-horizontal m-0" />

        {/* Zoom */}
        <button class="btn btn-sm btn-ghost" onClick={() => handleZoom(-1)}>
          <IconZoomOut class="w-4 h-4" />
        </button>
        <span class="text-xs w-12 text-center">{Math.round(pixelsPerBeat())}px</span>
        <button class="btn btn-sm btn-ghost" onClick={() => handleZoom(1)}>
          <IconZoomIn class="w-4 h-4" />
        </button>

        <div class="divider divider-horizontal m-0" />

        {/* Play clip */}
        <button class="btn btn-sm btn-primary" onClick={handlePlayClip}>
          <IconPlayerPlay class="w-4 h-4" />
          Play
        </button>

        {/* Close */}
        <button class="btn btn-sm btn-ghost" onClick={props.onClose}>
          <IconX class="w-4 h-4" />
        </button>
      </div>

      {/* Main editor area */}
      <Show
        when={clip()}
        fallback={
          <div class="flex-1 flex items-center justify-center text-base-content/50">
            Select a clip to edit
          </div>
        }
      >
        <div class="flex flex-1 overflow-hidden">
          {/* Piano keys */}
          <div class="w-16 overflow-y-auto" style={{ height: `${gridHeight()}px` }}>
            <PianoKeys onNotePreview={handleNotePreview} />
          </div>

          {/* Grid area */}
          <div
            ref={scrollContainerRef}
            class="flex-1 overflow-auto"
          >
            <div
              ref={gridRef}
              class="relative"
              style={{ width: `${gridWidth()}px`, height: `${gridHeight()}px` }}
              onClick={handleGridClick}
            >
              <Grid
                length={clip()?.length || 4}
                pixelsPerBeat={pixelsPerBeat()}
                beatsPerBar={props.project?.timeSignature?.numerator || 4}
              />

              {/* Notes */}
              <For each={clip()?.notes || []}>
                {(note) => (
                  <NoteBlock
                    note={note}
                    pixelsPerBeat={pixelsPerBeat()}
                    selected={selectedNoteId() === note.id}
                    onSelect={handleNoteSelect}
                    onDelete={handleNoteDelete}
                  />
                )}
              </For>
            </div>
          </div>
        </div>

        {/* Velocity editor */}
        <div class="w-full overflow-x-auto">
          <div style={{ width: `${gridWidth() + 64}px` }}>
            <div class="flex">
              <div class="w-16 bg-base-200 flex items-center justify-center text-xs text-base-content/50">
                Vel
              </div>
              <VelocityEditor
                notes={clip()?.notes || []}
                pixelsPerBeat={pixelsPerBeat()}
                selectedNote={selectedNoteId()}
                onVelocityChange={handleVelocityChange}
              />
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
