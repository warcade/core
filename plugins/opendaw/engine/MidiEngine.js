/**
 * MidiEngine - MIDI handling for the DAW
 * Supports Web MIDI API, MIDI file parsing, and note scheduling
 */

// MIDI note numbers to frequency conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function frequencyToMidi(frequency) {
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

export function midiToNoteName(midiNote) {
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = NOTE_NAMES[midiNote % 12];
  return `${noteName}${octave}`;
}

export function noteNameToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return null;
  const [, note, octave] = match;
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return null;
  return (parseInt(octave) + 1) * 12 + noteIndex;
}

/**
 * MIDI Note class
 */
export class MidiNote {
  constructor(note, velocity = 100, startTime = 0, duration = 0.5, channel = 0) {
    this.note = note; // MIDI note number (0-127)
    this.velocity = velocity; // 0-127
    this.startTime = startTime; // In beats
    this.duration = duration; // In beats
    this.channel = channel; // 0-15
    this.id = crypto.randomUUID();
  }

  get frequency() {
    return midiToFrequency(this.note);
  }

  get noteName() {
    return midiToNoteName(this.note);
  }

  get endTime() {
    return this.startTime + this.duration;
  }

  clone() {
    const cloned = new MidiNote(
      this.note,
      this.velocity,
      this.startTime,
      this.duration,
      this.channel
    );
    return cloned;
  }

  toJSON() {
    return {
      note: this.note,
      velocity: this.velocity,
      startTime: this.startTime,
      duration: this.duration,
      channel: this.channel,
      id: this.id
    };
  }

  static fromJSON(json) {
    const note = new MidiNote(
      json.note,
      json.velocity,
      json.startTime,
      json.duration,
      json.channel
    );
    note.id = json.id;
    return note;
  }
}

/**
 * MIDI Clip - collection of MIDI notes
 */
export class MidiClip {
  constructor(name = 'New Clip', length = 4) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.notes = [];
    this.length = length; // Length in beats
    this.color = this.generateColor();
  }

  generateColor() {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  addNote(note) {
    this.notes.push(note);
    this.sortNotes();
  }

  removeNote(noteId) {
    this.notes = this.notes.filter(n => n.id !== noteId);
  }

  updateNote(noteId, updates) {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      Object.assign(note, updates);
      this.sortNotes();
    }
  }

  sortNotes() {
    this.notes.sort((a, b) => a.startTime - b.startTime);
  }

  getNotesInRange(startBeat, endBeat) {
    return this.notes.filter(
      note => note.startTime < endBeat && note.endTime > startBeat
    );
  }

  clone() {
    const cloned = new MidiClip(this.name, this.length);
    cloned.notes = this.notes.map(n => n.clone());
    cloned.color = this.color;
    return cloned;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      notes: this.notes.map(n => n.toJSON()),
      length: this.length,
      color: this.color
    };
  }

  static fromJSON(json) {
    const clip = new MidiClip(json.name, json.length);
    clip.id = json.id;
    clip.notes = json.notes.map(n => MidiNote.fromJSON(n));
    clip.color = json.color;
    return clip;
  }
}

/**
 * MidiEngine class - handles MIDI I/O and scheduling
 */
export class MidiEngine {
  constructor() {
    this.midiAccess = null;
    this.inputs = new Map();
    this.outputs = new Map();
    this.listeners = new Set();
    this.isSupported = 'requestMIDIAccess' in navigator;
  }

  /**
   * Initialize Web MIDI API
   */
  async init() {
    if (!this.isSupported) {
      console.warn('[MidiEngine] Web MIDI not supported');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });

      // Setup inputs
      this.midiAccess.inputs.forEach((input, id) => {
        this.inputs.set(id, input);
        input.onmidimessage = (e) => this.handleMidiMessage(e, input);
      });

      // Setup outputs
      this.midiAccess.outputs.forEach((output, id) => {
        this.outputs.set(id, output);
      });

      // Listen for device changes
      this.midiAccess.onstatechange = (e) => this.handleStateChange(e);

      console.log('[MidiEngine] Initialized with', this.inputs.size, 'inputs and', this.outputs.size, 'outputs');
      return true;
    } catch (err) {
      console.error('[MidiEngine] Failed to initialize:', err);
      return false;
    }
  }

  /**
   * Handle incoming MIDI messages
   */
  handleMidiMessage(event, input) {
    const [status, data1, data2] = event.data;
    const channel = status & 0x0f;
    const command = status >> 4;

    let message = null;

    switch (command) {
      case 0x9: // Note On
        if (data2 > 0) {
          message = {
            type: 'noteOn',
            channel,
            note: data1,
            velocity: data2,
            input: input.name
          };
        } else {
          // Note On with velocity 0 is Note Off
          message = {
            type: 'noteOff',
            channel,
            note: data1,
            velocity: 0,
            input: input.name
          };
        }
        break;

      case 0x8: // Note Off
        message = {
          type: 'noteOff',
          channel,
          note: data1,
          velocity: data2,
          input: input.name
        };
        break;

      case 0xb: // Control Change
        message = {
          type: 'cc',
          channel,
          controller: data1,
          value: data2,
          input: input.name
        };
        break;

      case 0xe: // Pitch Bend
        message = {
          type: 'pitchBend',
          channel,
          value: (data2 << 7) | data1,
          input: input.name
        };
        break;

      case 0xc: // Program Change
        message = {
          type: 'programChange',
          channel,
          program: data1,
          input: input.name
        };
        break;
    }

    if (message) {
      this.notifyListeners(message);
    }
  }

  /**
   * Handle MIDI device state changes
   */
  handleStateChange(event) {
    const port = event.port;

    if (port.type === 'input') {
      if (port.state === 'connected') {
        this.inputs.set(port.id, port);
        port.onmidimessage = (e) => this.handleMidiMessage(e, port);
      } else {
        this.inputs.delete(port.id);
      }
    } else {
      if (port.state === 'connected') {
        this.outputs.set(port.id, port);
      } else {
        this.outputs.delete(port.id);
      }
    }

    this.notifyListeners({
      type: 'deviceChange',
      port: port.name,
      state: port.state
    });
  }

  /**
   * Send MIDI message to output
   */
  sendMidi(outputId, message) {
    const output = this.outputs.get(outputId);
    if (output) {
      output.send(message);
    }
  }

  /**
   * Send Note On
   */
  sendNoteOn(outputId, channel, note, velocity) {
    this.sendMidi(outputId, [0x90 | channel, note, velocity]);
  }

  /**
   * Send Note Off
   */
  sendNoteOff(outputId, channel, note) {
    this.sendMidi(outputId, [0x80 | channel, note, 0]);
  }

  /**
   * Send Control Change
   */
  sendCC(outputId, channel, controller, value) {
    this.sendMidi(outputId, [0xb0 | channel, controller, value]);
  }

  /**
   * Add listener for MIDI messages
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(message) {
    this.listeners.forEach(callback => {
      try {
        callback(message);
      } catch (err) {
        console.error('[MidiEngine] Listener error:', err);
      }
    });
  }

  /**
   * Get list of input devices
   */
  getInputDevices() {
    return Array.from(this.inputs.values()).map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer
    }));
  }

  /**
   * Get list of output devices
   */
  getOutputDevices() {
    return Array.from(this.outputs.values()).map(output => ({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer
    }));
  }

  /**
   * Dispose
   */
  dispose() {
    this.inputs.forEach(input => {
      input.onmidimessage = null;
    });
    this.inputs.clear();
    this.outputs.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let midiEngineInstance = null;

export function getMidiEngine() {
  if (!midiEngineInstance) {
    midiEngineInstance = new MidiEngine();
  }
  return midiEngineInstance;
}

export default MidiEngine;
