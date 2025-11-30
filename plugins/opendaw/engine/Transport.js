/**
 * Transport - Playback control and timing for the DAW
 */

import { getAudioEngine } from './AudioEngine.js';

export const PlayState = {
  STOPPED: 'stopped',
  PLAYING: 'playing',
  PAUSED: 'paused',
  RECORDING: 'recording'
};

/**
 * Transport class - handles playback timing and scheduling
 */
export class Transport {
  constructor() {
    this.engine = getAudioEngine();

    // Playback state
    this.state = PlayState.STOPPED;
    this.bpm = 120;
    this.timeSignature = { numerator: 4, denominator: 4 };

    // Position tracking
    this.currentBeat = 0;
    this.startBeat = 0;
    this.loopStart = 0;
    this.loopEnd = 16;
    this.loopEnabled = false;

    // Timing
    this.startTime = 0;
    this.pauseTime = 0;

    // Scheduling
    this.scheduleAheadTime = 0.1; // Schedule 100ms ahead
    this.schedulerInterval = null;
    this.lastScheduledBeat = 0;

    // Metronome
    this.metronomeEnabled = false;
    this.metronomeVolume = 0.5;

    // Listeners
    this.listeners = new Set();
    this.beatListeners = new Set();

    // Animation frame for UI updates
    this.animationFrame = null;
  }

  /**
   * Initialize transport
   */
  async init() {
    if (!this.engine.context) {
      await this.engine.init();
    }
  }

  /**
   * Get beats per second
   */
  get beatsPerSecond() {
    return this.bpm / 60;
  }

  /**
   * Get seconds per beat
   */
  get secondsPerBeat() {
    return 60 / this.bpm;
  }

  /**
   * Convert beats to seconds
   */
  beatsToSeconds(beats) {
    return beats * this.secondsPerBeat;
  }

  /**
   * Convert seconds to beats
   */
  secondsToBeats(seconds) {
    return seconds * this.beatsPerSecond;
  }

  /**
   * Get current playback position in beats
   */
  getCurrentBeat() {
    if (this.state === PlayState.STOPPED) {
      return this.startBeat;
    }

    if (this.state === PlayState.PAUSED) {
      return this.currentBeat;
    }

    const elapsed = this.engine.getCurrentTime() - this.startTime;
    let beat = this.startBeat + this.secondsToBeats(elapsed);

    // Handle looping
    if (this.loopEnabled && beat >= this.loopEnd) {
      const loopLength = this.loopEnd - this.loopStart;
      beat = this.loopStart + ((beat - this.loopStart) % loopLength);
    }

    return beat;
  }

  /**
   * Get current position as bar:beat:tick
   */
  getPosition() {
    const beat = this.getCurrentBeat();
    const beatsPerBar = this.timeSignature.numerator;

    const bar = Math.floor(beat / beatsPerBar) + 1;
    const beatInBar = Math.floor(beat % beatsPerBar) + 1;
    const tick = Math.floor((beat % 1) * 960); // 960 ticks per beat

    return { bar, beat: beatInBar, tick, totalBeats: beat };
  }

  /**
   * Format position as string
   */
  formatPosition() {
    const pos = this.getPosition();
    return `${pos.bar}.${pos.beat}.${pos.tick.toString().padStart(3, '0')}`;
  }

  /**
   * Set BPM
   */
  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(300, bpm));
    this.notifyListeners('bpmChange', this.bpm);
  }

  /**
   * Set time signature
   */
  setTimeSignature(numerator, denominator) {
    this.timeSignature = { numerator, denominator };
    this.notifyListeners('timeSignatureChange', this.timeSignature);
  }

  /**
   * Set playback position
   */
  setPosition(beat) {
    const wasPlaying = this.state === PlayState.PLAYING;

    if (wasPlaying) {
      this.pause();
    }

    this.currentBeat = Math.max(0, beat);
    this.startBeat = this.currentBeat;
    this.notifyListeners('positionChange', this.currentBeat);

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set loop region
   */
  setLoop(start, end, enabled = true) {
    this.loopStart = Math.max(0, start);
    this.loopEnd = Math.max(this.loopStart + 1, end);
    this.loopEnabled = enabled;
    this.notifyListeners('loopChange', { start: this.loopStart, end: this.loopEnd, enabled: this.loopEnabled });
  }

  /**
   * Toggle loop
   */
  toggleLoop() {
    this.loopEnabled = !this.loopEnabled;
    this.notifyListeners('loopChange', { start: this.loopStart, end: this.loopEnd, enabled: this.loopEnabled });
  }

  /**
   * Start playback
   */
  async play() {
    if (this.state === PlayState.PLAYING) return;

    await this.engine.resume();

    this.startTime = this.engine.getCurrentTime();
    this.startBeat = this.currentBeat;
    this.lastScheduledBeat = this.currentBeat;
    this.state = PlayState.PLAYING;

    // Start scheduler
    this.startScheduler();

    // Start UI update loop
    this.startUpdateLoop();

    this.notifyListeners('play');
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.state !== PlayState.PLAYING) return;

    this.currentBeat = this.getCurrentBeat();
    this.state = PlayState.PAUSED;

    this.stopScheduler();
    this.stopUpdateLoop();

    this.notifyListeners('pause');
  }

  /**
   * Stop playback
   */
  stop() {
    this.state = PlayState.STOPPED;
    this.currentBeat = this.startBeat;

    this.stopScheduler();
    this.stopUpdateLoop();

    this.notifyListeners('stop');
  }

  /**
   * Start recording
   */
  record() {
    if (this.state === PlayState.RECORDING) return;

    this.state = PlayState.RECORDING;
    this.play();

    this.notifyListeners('record');
  }

  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.state === PlayState.PLAYING) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Go to start
   */
  goToStart() {
    this.setPosition(0);
  }

  /**
   * Go to end
   */
  goToEnd(endBeat) {
    this.setPosition(endBeat);
  }

  /**
   * Skip forward/backward
   */
  skip(beats) {
    this.setPosition(this.getCurrentBeat() + beats);
  }

  /**
   * Start the scheduler for lookahead scheduling
   */
  startScheduler() {
    if (this.schedulerInterval) return;

    this.schedulerInterval = setInterval(() => {
      this.scheduleNotes();
    }, 25); // Run every 25ms
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Schedule notes ahead of playback
   */
  scheduleNotes() {
    if (this.state !== PlayState.PLAYING && this.state !== PlayState.RECORDING) return;

    const currentBeat = this.getCurrentBeat();
    const scheduleUntil = currentBeat + this.secondsToBeats(this.scheduleAheadTime);

    // Notify beat listeners for scheduling
    this.beatListeners.forEach(listener => {
      try {
        listener(this.lastScheduledBeat, scheduleUntil, this.bpm);
      } catch (err) {
        console.error('[Transport] Beat listener error:', err);
      }
    });

    // Schedule metronome clicks
    if (this.metronomeEnabled) {
      this.scheduleMetronome(this.lastScheduledBeat, scheduleUntil);
    }

    this.lastScheduledBeat = scheduleUntil;

    // Handle loop
    if (this.loopEnabled && currentBeat >= this.loopEnd) {
      this.setPosition(this.loopStart);
    }
  }

  /**
   * Schedule metronome clicks
   */
  scheduleMetronome(fromBeat, toBeat) {
    const beatsPerBar = this.timeSignature.numerator;
    let beat = Math.ceil(fromBeat);

    while (beat < toBeat) {
      const isDownbeat = beat % beatsPerBar === 0;
      const time = this.startTime + this.beatsToSeconds(beat - this.startBeat);

      this.playMetronomeClick(time, isDownbeat);
      beat++;
    }
  }

  /**
   * Play a metronome click
   */
  playMetronomeClick(time, isDownbeat) {
    const osc = this.engine.createOscillator('sine', isDownbeat ? 1000 : 800);
    const gain = this.engine.createGain(this.metronomeVolume * (isDownbeat ? 1 : 0.6));

    osc.connect(gain);
    gain.connect(this.engine.getMasterInput());

    gain.gain.setValueAtTime(this.metronomeVolume * (isDownbeat ? 1 : 0.6), time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Start UI update loop
   */
  startUpdateLoop() {
    const update = () => {
      if (this.state === PlayState.PLAYING || this.state === PlayState.RECORDING) {
        this.notifyListeners('tick', this.getCurrentBeat());
        this.animationFrame = requestAnimationFrame(update);
      }
    };
    this.animationFrame = requestAnimationFrame(update);
  }

  /**
   * Stop UI update loop
   */
  stopUpdateLoop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
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
   * Add beat listener (for scheduling)
   */
  addBeatListener(callback) {
    this.beatListeners.add(callback);
  }

  /**
   * Remove beat listener
   */
  removeBeatListener(callback) {
    this.beatListeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[Transport] Listener error:', err);
      }
    });
  }

  /**
   * Dispose
   */
  dispose() {
    this.stop();
    this.listeners.clear();
    this.beatListeners.clear();
  }

  toJSON() {
    return {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      loopStart: this.loopStart,
      loopEnd: this.loopEnd,
      loopEnabled: this.loopEnabled,
      metronomeEnabled: this.metronomeEnabled
    };
  }
}

// Singleton instance
let transportInstance = null;

export function getTransport() {
  if (!transportInstance) {
    transportInstance = new Transport();
  }
  return transportInstance;
}

export default Transport;
