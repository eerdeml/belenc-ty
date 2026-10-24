/**
 * Procedural Web Audio API sound synthesizer with granular audio channel controls.
 * Zero external audio files (0% 404 risk).
 */

import { synthwaveBgm } from './synthwaveBgm';

export interface AudioSettings {
  master: boolean;
  music: boolean; // Synthwave Arka Plan Müziği
  engine: boolean;
  coin: boolean; // Menüden ayrı açıp kapatılabilir altın alma sesi
  sfx: boolean; // Diğer efekt sesleri (çarpışma, hız patlaması vb.)
}

class SoundSystem {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning: boolean = false;

  private settings: AudioSettings = {
    master: true,
    music: synthwaveBgm.getIsEnabled(),
    engine: true,
    coin: true,
    sfx: true,
  };

  constructor() {
    const saved = localStorage.getItem('coastal_racer_audio_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
      } catch {
        // Fallback to defaults
      }
    } else {
      // Check legacy mute state if present
      const legacyMute = localStorage.getItem('coastal_racer_muted');
      if (legacyMute !== null) {
        this.settings.master = legacyMute !== 'true';
      }
    }
    synthwaveBgm.setEnabled(this.settings.master && this.settings.music);
  }

  private saveSettings() {
    localStorage.setItem('coastal_racer_audio_settings', JSON.stringify(this.settings));
    localStorage.setItem('coastal_racer_muted', String(!this.settings.master));
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getMuted(): boolean {
    return !this.settings.master;
  }

  public toggleMute(): boolean {
    this.settings.master = !this.settings.master;
    this.saveSettings();
    if (!this.settings.master && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    synthwaveBgm.setEnabled(this.settings.master && this.settings.music);
    return !this.settings.master;
  }

  public setSetting(key: keyof AudioSettings, value: boolean) {
    this.settings[key] = value;
    this.saveSettings();
    if (key === 'engine' || key === 'master') {
      if ((!this.settings.master || !this.settings.engine) && this.engineGain) {
        this.engineGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
      }
    }
    if (key === 'music' || key === 'master') {
      synthwaveBgm.setEnabled(this.settings.master && this.settings.music);
    }
  }

  public toggleSetting(key: keyof AudioSettings): boolean {
    this.setSetting(key, !this.settings[key]);
    return this.settings[key];
  }

  public startEngine() {
    if (this.engineRunning) return;
    if (!this.settings.master || !this.settings.engine) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      this.engineOsc = osc;
      this.engineGain = gain;
      this.engineRunning = true;
    } catch {
      // AudioContext could be waiting for user gesture
    }
  }

  public updateEngine(speedKmH: number) {
    if (!this.ctx || !this.engineOsc || !this.engineGain || !this.engineRunning) return;
    if (!this.settings.master || !this.settings.engine) {
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (speedKmH - 70) / 130));
    const targetFreq = 58 + ratio * 85;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(0.06 + ratio * 0.04, this.ctx.currentTime, 0.1);
  }

  public stopEngine() {
    if (!this.engineRunning) return;
    try {
      this.engineOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // Ignore
    }
    this.engineOsc = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  // Altın Alma Sesi (Ayrı ayarla kapatılabilir)
  public playCoin() {
    if (!this.settings.master || !this.settings.coin) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(987.77, now);
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);

      osc2.frequency.setValueAtTime(1318.51, now);
      osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.14);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch {
      // Audio error ignored
    }
  }

  public playLaneSwitch() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Audio error ignored
    }
  }

  public playCrash() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.6;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.5);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(130, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      whiteNoise.start(now);
      subOsc.start(now);
      whiteNoise.stop(now + 0.6);
      subOsc.stop(now + 0.6);
    } catch {
      // Audio error ignored
    }
  }

  public playPowerUp() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteStart = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.14, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.25);
      });
    } catch {
      // Audio error ignored
    }
  }

  public playNitro() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.45);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch {
      // Audio error ignored
    }
  }

  public playSmash() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Audio error ignored
    }
  }

  public playClick() {
    if (!this.settings.master || !this.settings.sfx) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio error ignored
    }
  }
}

export const sound = new SoundSystem();
