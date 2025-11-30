/**
 * Track System - Tracks, Clips, and Routing for the DAW
 */

import { getAudioEngine } from './AudioEngine.js';
import { MidiClip, MidiNote, midiToFrequency } from './MidiEngine.js';

/**
 * Clip placement on a track (references a clip at a specific position)
 */
export class ClipInstance {
  constructor(clip, startBeat = 0) {
    this.id = crypto.randomUUID();
    this.clip = clip;
    this.startBeat = startBeat;
    this.muted = false;
  }

  get endBeat() {
    return this.startBeat + this.clip.length;
  }

  toJSON() {
    return {
      id: this.id,
      clipId: this.clip.id,
      startBeat: this.startBeat,
      muted: this.muted
    };
  }
}

/**
 * Base Track class
 */
export class Track {
  constructor(name = 'Track', type = 'midi') {
    this.id = crypto.randomUUID();
    this.name = name;
    this.type = type; // 'midi', 'audio', 'bus'
    this.color = this.generateColor();

    // Audio routing
    this.engine = getAudioEngine();
    this.gainNode = null;
    this.pannerNode = null;
    this.muted = false;
    this.solo = false;
    this.armed = false;

    // Track settings
    this.volume = 0.8;
    this.pan = 0;

    // Clips on this track
    this.clipInstances = [];

    // Active voices (for playback)
    this.activeVoices = new Map();
  }

  generateColor() {
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e',
      '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
      '#06b6d4', '#84cc16', '#f43f5e', '#a855f7'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Initialize audio nodes
   */
  async init() {
    if (!this.engine.context) {
      await this.engine.init();
    }

    this.gainNode = this.engine.createGain(this.volume);
    this.pannerNode = this.engine.createPanner(this.pan);

    // Connect: panner -> gain -> master
    this.pannerNode.connect(this.gainNode);
    this.gainNode.connect(this.engine.getMasterInput());
  }

  /**
   * Get the input node for this track
   */
  getInput() {
    return this.pannerNode;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode && !this.muted) {
      this.gainNode.gain.setTargetAtTime(
        this.volume,
        this.engine.context.currentTime,
        0.01
      );
    }
  }

  /**
   * Set pan (-1 to 1)
   */
  setPan(value) {
    this.pan = Math.max(-1, Math.min(1, value));
    if (this.pannerNode) {
      this.pannerNode.pan.setTargetAtTime(
        this.pan,
        this.engine.context.currentTime,
        0.01
      );
    }
  }

  /**
   * Toggle mute
   */
  setMuted(muted) {
    this.muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(
        muted ? 0 : this.volume,
        this.engine.context.currentTime,
        0.01
      );
    }
  }

  /**
   * Toggle solo
   */
  setSolo(solo) {
    this.solo = solo;
  }

  /**
   * Toggle record arm
   */
  setArmed(armed) {
    this.armed = armed;
  }

  /**
   * Add a clip instance to this track
   */
  addClipInstance(clip, startBeat = 0) {
    const instance = new ClipInstance(clip, startBeat);
    this.clipInstances.push(instance);
    this.sortClipInstances();
    return instance;
  }

  /**
   * Remove a clip instance
   */
  removeClipInstance(instanceId) {
    this.clipInstances = this.clipInstances.filter(ci => ci.id !== instanceId);
  }

  /**
   * Move a clip instance
   */
  moveClipInstance(instanceId, newStartBeat) {
    const instance = this.clipInstances.find(ci => ci.id === instanceId);
    if (instance) {
      instance.startBeat = Math.max(0, newStartBeat);
      this.sortClipInstances();
    }
  }

  /**
   * Sort clip instances by start time
   */
  sortClipInstances() {
    this.clipInstances.sort((a, b) => a.startBeat - b.startBeat);
  }

  /**
   * Get clip instances in range
   */
  getClipInstancesInRange(startBeat, endBeat) {
    return this.clipInstances.filter(
      ci => ci.startBeat < endBeat && ci.endBeat > startBeat && !ci.muted
    );
  }

  /**
   * Dispose of audio nodes
   */
  dispose() {
    this.stopAllVoices();
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.pannerNode) {
      this.pannerNode.disconnect();
      this.pannerNode = null;
    }
  }

  /**
   * Stop all active voices
   */
  stopAllVoices() {
    this.activeVoices.forEach((voice) => {
      try {
        if (voice.oscillator) voice.oscillator.stop();
        if (voice.source) voice.source.stop();
      } catch (e) {}
    });
    this.activeVoices.clear();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      color: this.color,
      volume: this.volume,
      pan: this.pan,
      muted: this.muted,
      solo: this.solo,
      armed: this.armed,
      clipInstances: this.clipInstances.map(ci => ci.toJSON())
    };
  }
}

/**
 * MIDI Track - plays MIDI clips through a synthesizer
 */
export class MidiTrack extends Track {
  constructor(name = 'MIDI Track') {
    super(name, 'midi');

    // Synth settings
    this.oscillatorType = 'sawtooth';
    this.attack = 0.01;
    this.decay = 0.1;
    this.sustain = 0.7;
    this.release = 0.3;
    this.filterFreq = 2000;
    this.filterQ = 1;
  }

  /**
   * Play a single note
   */
  playNote(midiNote, velocity = 100, duration = null) {
    if (!this.engine.context || this.muted) return null;

    const noteId = crypto.randomUUID();
    const now = this.engine.context.currentTime;
    const freq = midiToFrequency(midiNote);
    const vol = (velocity / 127) * this.volume;

    // Create oscillator
    const oscillator = this.engine.createOscillator(this.oscillatorType, freq);

    // Create filter
    const filter = this.engine.createFilter('lowpass', this.filterFreq, this.filterQ);

    // Create envelope gain
    const envelope = this.engine.createGain(0);

    // Connect: oscillator -> filter -> envelope -> track input
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.getInput());

    // Apply ADSR envelope
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(vol, now + this.attack);
    envelope.gain.linearRampToValueAtTime(vol * this.sustain, now + this.attack + this.decay);

    oscillator.start(now);

    // Store voice
    const voice = {
      oscillator,
      filter,
      envelope,
      noteId,
      midiNote,
      startTime: now
    };
    this.activeVoices.set(noteId, voice);

    // If duration specified, schedule note off
    if (duration !== null) {
      this.scheduleNoteOff(noteId, duration);
    }

    return noteId;
  }

  /**
   * Stop a specific note
   */
  stopNote(noteId) {
    const voice = this.activeVoices.get(noteId);
    if (!voice) return;

    const now = this.engine.context.currentTime;

    // Release envelope
    voice.envelope.gain.cancelScheduledValues(now);
    voice.envelope.gain.setValueAtTime(voice.envelope.gain.value, now);
    voice.envelope.gain.linearRampToValueAtTime(0, now + this.release);

    // Stop oscillator after release
    voice.oscillator.stop(now + this.release + 0.1);

    // Remove from active voices after release
    setTimeout(() => {
      this.activeVoices.delete(noteId);
    }, (this.release + 0.2) * 1000);
  }

  /**
   * Schedule note off
   */
  scheduleNoteOff(noteId, duration) {
    setTimeout(() => {
      this.stopNote(noteId);
    }, duration * 1000);
  }

  /**
   * Stop all notes for a specific MIDI note number
   */
  stopNoteByMidi(midiNote) {
    this.activeVoices.forEach((voice, noteId) => {
      if (voice.midiNote === midiNote) {
        this.stopNote(noteId);
      }
    });
  }

  /**
   * Schedule notes from a clip for playback
   */
  scheduleClip(clipInstance, transportTime, bpm) {
    if (clipInstance.muted || this.muted) return;

    const clip = clipInstance.clip;
    const beatsPerSecond = bpm / 60;

    clip.notes.forEach(note => {
      const noteStartTime = (clipInstance.startBeat + note.startTime) / beatsPerSecond;
      const noteDuration = note.duration / beatsPerSecond;
      const delay = noteStartTime - transportTime;

      if (delay >= 0) {
        setTimeout(() => {
          if (!this.muted) {
            const voiceId = this.playNote(note.note, note.velocity, noteDuration);
          }
        }, delay * 1000);
      }
    });
  }

  toJSON() {
    return {
      ...super.toJSON(),
      oscillatorType: this.oscillatorType,
      attack: this.attack,
      decay: this.decay,
      sustain: this.sustain,
      release: this.release,
      filterFreq: this.filterFreq,
      filterQ: this.filterQ
    };
  }
}

/**
 * Audio Track - plays audio clips
 */
export class AudioTrack extends Track {
  constructor(name = 'Audio Track') {
    super(name, 'audio');
    this.audioBuffers = new Map(); // clipId -> AudioBuffer
  }

  /**
   * Load audio for a clip
   */
  async loadAudio(clipId, url) {
    try {
      const buffer = await this.engine.loadAudioFile(url);
      this.audioBuffers.set(clipId, buffer);
      return buffer;
    } catch (err) {
      console.error('[AudioTrack] Failed to load audio:', err);
      return null;
    }
  }

  /**
   * Play audio buffer
   */
  playBuffer(buffer, startTime = 0, offset = 0, duration = null) {
    if (!this.engine.context || this.muted) return null;

    const source = this.engine.createBufferSource(buffer);
    source.connect(this.getInput());

    const voiceId = crypto.randomUUID();
    this.activeVoices.set(voiceId, { source });

    if (duration !== null) {
      source.start(startTime, offset, duration);
    } else {
      source.start(startTime, offset);
    }

    source.onended = () => {
      this.activeVoices.delete(voiceId);
    };

    return voiceId;
  }

  toJSON() {
    return {
      ...super.toJSON()
    };
  }
}

export default Track;
