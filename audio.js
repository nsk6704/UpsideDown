import { CONFIG } from './config.js';

export class AudioManager {
  constructor() {
    this.sounds = {};
    this.ambient = null;
    this.context = null;
    this.initialized = false;
  }

  async init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      console.log('AudioManager initialized');
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  // Generate procedural sounds using Web Audio API
  playFootstep() {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.frequency.setValueAtTime(80 + Math.random() * 20, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playKeyCollect() {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playDoorCreak() {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(80, now + 1.5);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    
    osc.start(now);
    osc.stop(now + 1.5);
  }

  playMonsterGrowl() {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.5);
    osc.frequency.linearRampToValueAtTime(80, now + 1);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    
    osc.start(now);
    osc.stop(now + 1);
  }

  playHeartbeat(intensity = 1) {
    if (!this.initialized) return;
    
    const now = this.context.currentTime;
    
    // First beat
    const osc1 = this.context.createOscillator();
    const gain1 = this.context.createGain();
    osc1.connect(gain1);
    gain1.connect(this.context.destination);
    osc1.frequency.setValueAtTime(60, now);
    gain1.gain.setValueAtTime(0.1 * intensity, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.start(now);
    osc1.stop(now + 0.15);
    
    // Second beat
    const osc2 = this.context.createOscillator();
    const gain2 = this.context.createGain();
    osc2.connect(gain2);
    gain2.connect(this.context.destination);
    osc2.frequency.setValueAtTime(65, now + 0.2);
    gain2.gain.setValueAtTime(0.08 * intensity, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.35);
  }

  playAmbientDrone() {
    if (!this.initialized || this.ambient) return;
    
    const osc1 = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.context.currentTime);
    osc2.frequency.setValueAtTime(82.5, this.context.currentTime);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.context.currentTime);
    filter.Q.setValueAtTime(5, this.context.currentTime);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    
    gain.gain.setValueAtTime(0.02, this.context.currentTime);
    
    osc1.start();
    osc2.start();
    
    this.ambient = { osc1, osc2, gain, filter };
  }

  stopAmbientDrone() {
    if (!this.ambient) return;
    
    const now = this.context.currentTime;
    this.ambient.gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    
    setTimeout(() => {
      this.ambient.osc1.stop();
      this.ambient.osc2.stop();
      this.ambient = null;
    }, 2000);
  }

  play(soundName) {
    switch(soundName) {
      case 'footstep': this.playFootstep(); break;
      case 'collect': this.playKeyCollect(); break;
      case 'doorOpen': this.playDoorCreak(); break;
      case 'monsterGrowl': this.playMonsterGrowl(); break;
      case 'heartbeat': this.playHeartbeat(); break;
      case 'locked': this.playDoorCreak(); break;
      default: console.log(`Sound: ${soundName}`);
    }
  }
}
