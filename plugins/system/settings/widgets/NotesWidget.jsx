import { createSignal, onMount, For } from 'solid-js';
import { IconNote, IconPlus, IconTrash, IconEdit } from '@tabler/icons-solidjs';

export default function NotesWidget() {
  const [notes, setNotes] = createSignal([]);
  const [newNoteText, setNewNoteText] = createSignal('');
  const [editingId, setEditingId] = createSignal(null);
  const [editText, setEditText] = createSignal('');

  onMount(() => {
    // Load notes from localStorage
    const savedNotes = localStorage.getItem('widget_notes');
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to load notes:', e);
      }
    }
  });

  const saveNotes = (updatedNotes) => {
    setNotes(updatedNotes);
    localStorage.setItem('widget_notes', JSON.stringify(updatedNotes));
  };

  const addNote = () => {
    const text = newNoteText().trim();
    if (!text) return;

    const newNote = {
      id: Date.now(),
      text,
      timestamp: new Date().toISOString()
    };

    saveNotes([newNote, ...notes()]);
    setNewNoteText('');
  };

  const deleteNote = (id) => {
    saveNotes(notes().filter(note => note.id !== id));
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    const id = editingId();
    if (!id) return;

    const text = editText().trim();
    if (!text) return;

    saveNotes(
      notes().map(note =>
        note.id === id ? { ...note, text } : note
      )
    );

    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      if (action === saveEdit) {
        cancelEdit();
      }
    }
  };

  return (
    <div class="card bg-gradient-to-br from-warning/20 to-warning/5 bg-base-100 shadow-lg h-full flex flex-col p-3">
      {/* Header */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-1.5">
          <IconNote size={16} class="text-warning opacity-80" />
          <span class="text-xs font-medium opacity-70">Notes</span>
        </div>
        {notes().length > 0 && (
          <div class="text-xs opacity-40">
            {notes().length}
          </div>
        )}
      </div>

      {/* Add Note Input */}
      <div class="flex gap-1.5 mb-2">
        <input
          type="text"
          placeholder="Add a note..."
          class="input input-xs input-bordered flex-1 bg-base-200/50 focus:bg-base-200 text-xs"
          value={newNoteText()}
          onInput={(e) => setNewNoteText(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addNote)}
        />
        <button
          class="btn btn-xs btn-warning"
          onClick={addNote}
          disabled={!newNoteText().trim()}
        >
          <IconPlus size={12} />
        </button>
      </div>

      {/* Notes List with Scrollbar */}
      <div class="flex-1 overflow-y-auto space-y-1.5 pr-1" style="scrollbar-width: thin;">
        <For each={notes()}>
          {(note) => (
            <div class="bg-base-200/50 rounded p-1.5 flex items-start gap-1.5 group hover:bg-base-200 transition-colors">
              <div class="flex-1 min-w-0">
                {editingId() === note.id ? (
                  <input
                    type="text"
                    class="input input-xs input-bordered w-full bg-base-100 text-xs"
                    value={editText()}
                    onInput={(e) => setEditText(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, saveEdit)}
                    onBlur={saveEdit}
                    autofocus
                  />
                ) : (
                  <div class="text-xs break-words leading-relaxed">{note.text}</div>
                )}
              </div>
              <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {editingId() !== note.id && (
                  <>
                    <button
                      class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0 w-5"
                      onClick={() => startEdit(note)}
                      title="Edit"
                    >
                      <IconEdit size={12} />
                    </button>
                    <button
                      class="btn btn-xs btn-ghost p-0.5 h-auto min-h-0 w-5 text-error"
                      onClick={() => deleteNote(note.id)}
                      title="Delete"
                    >
                      <IconTrash size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </For>

        {notes().length === 0 && (
          <div class="text-center text-xs opacity-40 py-4">
            No notes yet
          </div>
        )}
      </div>
    </div>
  );
}
