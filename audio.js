import { CONFIG } from './config.js';

export class AudioManager {
  constructor() {
    this.context = null;
    this.initialized = false;
    this.ambientNodes = [];
    this.sounds = {}; // Stores loaded audio buffers
    this.soundPaths = {
      'jungle_ambience': 'assets/sounds/jungle_ambience.mp3',
      'collect': 'assets/sounds/collect.mp3',
      'footstep': 'assets/sounds/footstep.mp3',
      'reveal': 'assets/sounds/reveal.mp3'
    };
  }

  async init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('AudioManager initialized');

      // Try to load custom sounds
      await this.loadAllSounds();

      // Start ambience (custom or procedural)
      this.startJungleAmbience();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  async loadAllSounds() {
    const promises = Object.entries(this.soundPaths).map(([name, path]) =>
      this.loadSound(name, path)
    );
    await Promise.allSettled(promises);
  }

  async loadSound(name, path) {
    try {
      let response = await fetch(path);
      if (!response.ok) {
        // Try .wav fallback
        const wavPath = path.replace('.mp3', '.wav');
        response = await fetch(wavPath);
        if (!response.ok) throw new Error(`Failed to load ${path} or ${wavPath}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.sounds[name] = audioBuffer;
      console.log(`Loaded sound: ${name}`);
    } catch (error) {
      // Silent failure is fine, we fallback to procedural
      // console.log(`Using procedural fallback for ${name}`);
    }
  }

  startJungleAmbience() {
    if (!this.initialized) return;

    if (this.sounds['jungle_ambience']) {
      // Play custom loop
      const source = this.context.createBufferSource();
      source.buffer = this.sounds['jungle_ambience'];
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = 0.3;
      source.connect(gain);
      gain.connect(this.context.destination);
      source.start();
      this.ambientNodes.push(source);
    } else {
      // Procedural fallback
      this.createPinkNoise(0.05);
      this.createInsectDrone();
      this.scheduleBirdChirp();
    }
  }

  // ... Procedural generators (PinkNoise, InsectDrone, BirdChirp) kept as fallback ...
  createPinkNoise(volume) {
    const bufferSize = 4096;
    const pinkNoise = (function () {
      let b0, b1, b2, b3, b4, b5, b6;
      b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
      const node = this.context.createScriptProcessor(bufferSize, 1, 1);
      node.onaudioprocess = function (e) {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
        }
      };
      return node;
    }).call(this);

    const gain = this.context.createGain();
    gain.gain.value = volume;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    pinkNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    this.ambientNodes.push(pinkNoise);
  }

  createInsectDrone() {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.value = 6000;
    const lfo = this.context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 15;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start();
    lfo.start();
    this.ambientNodes.push(osc, lfo);
  }

  scheduleBirdChirp() {
    if (!this.initialized) return;
    const delay = 2000 + Math.random() * 5000;
    setTimeout(() => {
      this.playBirdChirp();
      this.scheduleBirdChirp();
    }, delay);
  }

  playBirdChirp() {
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500 + Math.random() * 1000, now);
    osc.frequency.exponentialRampToValueAtTime(1000 + Math.random() * 500, now + 0.1);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playFootstep() {
    if (!this.initialized) return;

    if (this.sounds['footstep']) {
      this.playBuffer('footstep', 0.4, 0.9 + Math.random() * 0.2);
      return;
    }

    // Procedural fallback
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100 + Math.random() * 50, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  play(soundName) {
    if (this.sounds[soundName]) {
      this.playBuffer(soundName);
    } else if (soundName === 'footstep') {
      this.playFootstep();
    }
  }

  playBuffer(name, volume = 0.5, playbackRate = 1.0) {
    if (!this.sounds[name]) return;
    const source = this.context.createBufferSource();
    source.buffer = this.sounds[name];
    source.playbackRate.value = playbackRate;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }
}
