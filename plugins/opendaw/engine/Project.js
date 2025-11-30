/**
 * Project - Top-level project management for the DAW
 */

import { MidiTrack, AudioTrack } from './Track.js';
import { MidiClip } from './MidiEngine.js';
import { getTransport } from './Transport.js';
import { getAudioEngine } from './AudioEngine.js';

/**
 * Project class - manages all tracks, clips, and project settings
 */
export class Project {
  constructor(name = 'Untitled Project') {
    this.id = crypto.randomUUID();
    this.name = name;
    this.created = new Date().toISOString();
    this.modified = new Date().toISOString();

    // Project settings
    this.bpm = 120;
    this.timeSignature = { numerator: 4, denominator: 4 };
    this.sampleRate = 44100;

    // Tracks
    this.tracks = [];

    // Clip library
    this.clips = new Map();

    // Selection state
    this.selectedTrackId = null;
    this.selectedClipIds = new Set();

    // Playback range
    this.startBeat = 0;
    this.endBeat = 64;

    // Undo/Redo stacks
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;

    // Listeners
    this.listeners = new Set();

    // References
    this.transport = getTransport();
    this.engine = getAudioEngine();
  }

  /**
   * Initialize the project
   */
  async init() {
    await this.engine.init();
    await this.transport.init();

    this.transport.setBpm(this.bpm);
    this.transport.setTimeSignature(this.timeSignature.numerator, this.timeSignature.denominator);

    // Set up beat listener for scheduling
    this.transport.addBeatListener((fromBeat, toBeat, bpm) => {
      this.schedulePlayback(fromBeat, toBeat, bpm);
    });
  }

  /**
   * Create a new MIDI track
   */
  createMidiTrack(name = 'MIDI Track') {
    const track = new MidiTrack(name || `MIDI ${this.tracks.length + 1}`);
    track.init();
    this.tracks.push(track);

    if (!this.selectedTrackId) {
      this.selectedTrackId = track.id;
    }

    this.notifyListeners('trackAdded', track);
    return track;
  }

  /**
   * Create a new audio track
   */
  createAudioTrack(name = 'Audio Track') {
    const track = new AudioTrack(name || `Audio ${this.tracks.length + 1}`);
    track.init();
    this.tracks.push(track);

    if (!this.selectedTrackId) {
      this.selectedTrackId = track.id;
    }

    this.notifyListeners('trackAdded', track);
    return track;
  }

  /**
   * Delete a track
   */
  deleteTrack(trackId) {
    const index = this.tracks.findIndex(t => t.id === trackId);
    if (index === -1) return;

    const track = this.tracks[index];
    track.dispose();
    this.tracks.splice(index, 1);

    if (this.selectedTrackId === trackId) {
      this.selectedTrackId = this.tracks.length > 0 ? this.tracks[0].id : null;
    }

    this.notifyListeners('trackRemoved', trackId);
  }

  /**
   * Move a track
   */
  moveTrack(trackId, newIndex) {
    const oldIndex = this.tracks.findIndex(t => t.id === trackId);
    if (oldIndex === -1 || newIndex < 0 || newIndex >= this.tracks.length) return;

    const [track] = this.tracks.splice(oldIndex, 1);
    this.tracks.splice(newIndex, 0, track);

    this.notifyListeners('trackMoved', { trackId, newIndex });
  }

  /**
   * Get track by ID
   */
  getTrack(trackId) {
    return this.tracks.find(t => t.id === trackId);
  }

  /**
   * Get selected track
   */
  getSelectedTrack() {
    return this.getTrack(this.selectedTrackId);
  }

  /**
   * Select a track
   */
  selectTrack(trackId) {
    this.selectedTrackId = trackId;
    this.notifyListeners('trackSelected', trackId);
  }

  /**
   * Create a new MIDI clip
   */
  createMidiClip(name = 'New Clip', length = 4) {
    const clip = new MidiClip(name, length);
    this.clips.set(clip.id, clip);
    this.notifyListeners('clipCreated', clip);
    return clip;
  }

  /**
   * Delete a clip
   */
  deleteClip(clipId) {
    if (!this.clips.has(clipId)) return;

    // Remove all instances of this clip from tracks
    this.tracks.forEach(track => {
      track.clipInstances = track.clipInstances.filter(ci => ci.clip.id !== clipId);
    });

    this.clips.delete(clipId);
    this.notifyListeners('clipDeleted', clipId);
  }

  /**
   * Get clip by ID
   */
  getClip(clipId) {
    return this.clips.get(clipId);
  }

  /**
   * Schedule playback for all tracks
   */
  schedulePlayback(fromBeat, toBeat, bpm) {
    this.tracks.forEach(track => {
      if (track.muted) return;

      const instances = track.getClipInstancesInRange(fromBeat, toBeat);
      instances.forEach(instance => {
        if (track instanceof MidiTrack) {
          track.scheduleClip(instance, 0, bpm);
        }
      });
    });
  }

  /**
   * Handle solo state
   */
  updateSoloState() {
    const hasSolo = this.tracks.some(t => t.solo);

    this.tracks.forEach(track => {
      if (hasSolo) {
        // Mute all non-solo tracks
        track.setMuted(!track.solo);
      } else {
        // Restore original mute state (would need to track this)
        track.setMuted(track.muted);
      }
    });
  }

  /**
   * Set BPM
   */
  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(300, bpm));
    this.transport.setBpm(this.bpm);
    this.modified = new Date().toISOString();
    this.notifyListeners('bpmChanged', this.bpm);
  }

  /**
   * Set time signature
   */
  setTimeSignature(numerator, denominator) {
    this.timeSignature = { numerator, denominator };
    this.transport.setTimeSignature(numerator, denominator);
    this.modified = new Date().toISOString();
    this.notifyListeners('timeSignatureChanged', this.timeSignature);
  }

  /**
   * Calculate project length based on clips
   */
  calculateLength() {
    let maxEnd = 0;
    this.tracks.forEach(track => {
      track.clipInstances.forEach(ci => {
        maxEnd = Math.max(maxEnd, ci.endBeat);
      });
    });
    return Math.max(maxEnd, 16); // Minimum 16 beats
  }

  /**
   * Save project state for undo
   */
  saveState() {
    const state = this.toJSON();
    this.undoStack.push(JSON.stringify(state));

    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.undoStack.length === 0) return;

    const currentState = JSON.stringify(this.toJSON());
    this.redoStack.push(currentState);

    const previousState = this.undoStack.pop();
    this.loadFromJSON(JSON.parse(previousState));

    this.notifyListeners('undo');
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (this.redoStack.length === 0) return;

    const currentState = JSON.stringify(this.toJSON());
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    this.loadFromJSON(JSON.parse(nextState));

    this.notifyListeners('redo');
  }

  /**
   * Stop all playback
   */
  stopAll() {
    this.transport.stop();
    this.tracks.forEach(track => {
      track.stopAllVoices();
    });
  }

  /**
   * Add listener
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
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[Project] Listener error:', err);
      }
    });
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      created: this.created,
      modified: this.modified,
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      tracks: this.tracks.map(t => t.toJSON()),
      clips: Array.from(this.clips.values()).map(c => c.toJSON())
    };
  }

  /**
   * Load from JSON
   */
  loadFromJSON(json) {
    // Clear existing
    this.tracks.forEach(t => t.dispose());
    this.tracks = [];
    this.clips.clear();

    // Load settings
    this.id = json.id;
    this.name = json.name;
    this.created = json.created;
    this.modified = json.modified;
    this.bpm = json.bpm;
    this.timeSignature = json.timeSignature;

    // Load clips
    json.clips.forEach(clipJson => {
      const clip = MidiClip.fromJSON(clipJson);
      this.clips.set(clip.id, clip);
    });

    // Load tracks
    json.tracks.forEach(trackJson => {
      let track;
      if (trackJson.type === 'midi') {
        track = new MidiTrack(trackJson.name);
        track.oscillatorType = trackJson.oscillatorType;
        track.attack = trackJson.attack;
        track.decay = trackJson.decay;
        track.sustain = trackJson.sustain;
        track.release = trackJson.release;
        track.filterFreq = trackJson.filterFreq;
        track.filterQ = trackJson.filterQ;
      } else {
        track = new AudioTrack(trackJson.name);
      }

      track.id = trackJson.id;
      track.color = trackJson.color;
      track.volume = trackJson.volume;
      track.pan = trackJson.pan;
      track.muted = trackJson.muted;
      track.solo = trackJson.solo;
      track.armed = trackJson.armed;

      track.init();

      // Restore clip instances
      trackJson.clipInstances.forEach(ciJson => {
        const clip = this.clips.get(ciJson.clipId);
        if (clip) {
          const instance = track.addClipInstance(clip, ciJson.startBeat);
          instance.id = ciJson.id;
          instance.muted = ciJson.muted;
        }
      });

      this.tracks.push(track);
    });

    this.notifyListeners('projectLoaded');
  }

  /**
   * Dispose of the project
   */
  dispose() {
    this.stopAll();
    this.tracks.forEach(t => t.dispose());
    this.tracks = [];
    this.clips.clear();
    this.listeners.clear();
  }
}

// Singleton instance
let projectInstance = null;

export function getProject() {
  if (!projectInstance) {
    projectInstance = new Project();
  }
  return projectInstance;
}

export function createNewProject(name) {
  if (projectInstance) {
    projectInstance.dispose();
  }
  projectInstance = new Project(name);
  return projectInstance;
}

export default Project;
