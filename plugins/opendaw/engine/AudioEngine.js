/**
 * AudioEngine - Core Web Audio API engine for the DAW
 * Handles audio context, master bus, and DSP processing
 */

export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.analyser = null;
    this.compressor = null;
    this.isRunning = false;
    this.sampleRate = 44100;

    // Time tracking
    this.startTime = 0;
    this.pauseTime = 0;

    // Listeners
    this.listeners = new Set();
  }

  /**
   * Initialize the audio context and master chain
   */
  async init() {
    if (this.context) return;

    this.context = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
      latencyHint: 'interactive'
    });

    // Master compressor for limiting
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -6;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Master gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;

    // Analyser for visualization
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect master chain: compressor -> gain -> analyser -> destination
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    console.log('[AudioEngine] Initialized with sample rate:', this.context.sampleRate);
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Get the master output node for connecting tracks
   */
  getMasterInput() {
    return this.compressor;
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, value)),
        this.context.currentTime,
        0.01
      );
    }
  }

  /**
   * Get current audio time
   */
  getCurrentTime() {
    return this.context ? this.context.currentTime : 0;
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  /**
   * Get waveform data for visualization
   */
  getWaveformData() {
    if (!this.analyser) return new Uint8Array(0);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Create an oscillator node
   */
  createOscillator(type = 'sine', frequency = 440) {
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    return osc;
  }

  /**
   * Create a gain node
   */
  createGain(value = 1) {
    const gain = this.context.createGain();
    gain.gain.value = value;
    return gain;
  }

  /**
   * Create a biquad filter
   */
  createFilter(type = 'lowpass', frequency = 1000, Q = 1) {
    const filter = this.context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = Q;
    return filter;
  }

  /**
   * Create a delay node
   */
  createDelay(time = 0.5, maxTime = 5) {
    const delay = this.context.createDelay(maxTime);
    delay.delayTime.value = time;
    return delay;
  }

  /**
   * Create a convolver (reverb) node
   */
  async createReverb(duration = 2, decay = 2) {
    const convolver = this.context.createConvolver();
    const length = this.sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, this.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Create a stereo panner
   */
  createPanner(pan = 0) {
    const panner = this.context.createStereoPanner();
    panner.pan.value = pan;
    return panner;
  }

  /**
   * Load an audio file and return an AudioBuffer
   */
  async loadAudioFile(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }

  /**
   * Create a buffer source node
   */
  createBufferSource(buffer) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  /**
   * Schedule a note to play
   */
  scheduleNote(oscillator, gainNode, startTime, duration, attack = 0.01, release = 0.1) {
    const now = this.context.currentTime;
    const noteStart = now + startTime;
    const noteEnd = noteStart + duration;

    // ADSR envelope
    gainNode.gain.setValueAtTime(0, noteStart);
    gainNode.gain.linearRampToValueAtTime(1, noteStart + attack);
    gainNode.gain.setValueAtTime(1, noteEnd - release);
    gainNode.gain.linearRampToValueAtTime(0, noteEnd);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.1);
  }

  /**
   * Dispose of the audio engine
   */
  dispose() {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.masterGain = null;
    this.analyser = null;
    this.compressor = null;
  }
}

// Singleton instance
let engineInstance = null;

export function getAudioEngine() {
  if (!engineInstance) {
    engineInstance = new AudioEngine();
  }
  return engineInstance;
}

export default AudioEngine;
