/**
 * Procedural Synthwave BGM Synthesizer (Web Audio API).
 * Generates an endless, authentic retro electronic music track.
 * Supports multiple style presets (Neon Chillwave, Sunset Cruiser, Cyber Pulse),
 * dedicated master volume slider control (0 - 100%), and dynamic tempo modulation.
 * 100% zero audio files (zero network latency, zero CORS or 404 issues).
 */

export type MusicStyle = 'chillwave' | 'cruiser' | 'cyber';

export interface MusicStyleInfo {
  id: MusicStyle;
  name: string;
  description: string;
}

export const MUSIC_STYLES: MusicStyleInfo[] = [
  {
    id: 'chillwave',
    name: 'Sakin Chillwave (Önerilen)',
    description: 'Yumuşak analog padler, dinlendirici bas ve rahatlatıcı sahil melodisi',
  },
  {
    id: 'cruiser',
    name: 'Gün Batımı Cruising',
    description: 'Klasik 80ler Outrun ritmi, dengeli synth melodisi',
  },
  {
    id: 'cyber',
    name: 'Siber Nabız',
    description: 'Daha dinamik arpejler ve enerjik retro elektronik vuruşlar',
  },
];

class SynthwaveBgmEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isEnabled: boolean = true;
  private volume: number = 0.12; // default lowered volume (warm & subtle)
  private style: MusicStyle = 'chillwave';
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private timerId: number | null = null;

  // Tempo and musical clock
  private baseBpm: number = 114;
  private currentBpm: number = 114;
  private currentStep: number = 0; // 16 steps per bar

  // Chillwave / Outrun Chord progressions
  // Notes in Hz (D minor, Bb Major, F Major, C Major)
  private chords = [
    { root: 146.83, notes: [220.00, 261.63, 349.23, 440.00], bass: 73.42 }, // D2
    { root: 116.54, notes: [233.08, 293.66, 349.23, 466.16], bass: 58.27 }, // Bb1
    { root: 174.61, notes: [261.63, 329.63, 392.00, 523.25], bass: 87.31 }, // F2
    { root: 130.81, notes: [261.63, 329.63, 392.00, 523.25], bass: 65.41 }, // C2
  ];

  constructor() {
    const savedEnabled = localStorage.getItem('coastal_racer_music_enabled');
    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === 'true';
    }

    const savedVol = localStorage.getItem('coastal_racer_music_volume');
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        this.volume = parsed;
      }
    }

    const savedStyle = localStorage.getItem('coastal_racer_music_style') as MusicStyle | null;
    if (savedStyle && (savedStyle === 'chillwave' || savedStyle === 'cruiser' || savedStyle === 'cyber')) {
      this.style = savedStyle;
    }
  }

  private initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      
      // Warm low-pass master filter to prevent any harsh shrill highs
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(this.style === 'chillwave' ? 2200 : 3800, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

      const targetGain = this.isEnabled ? this.volume : 0;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);

      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(this.ctx.destination);
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('coastal_racer_music_enabled', String(enabled));

    if (this.ctx && this.masterGain) {
      const targetGain = enabled ? this.volume : 0;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }

    if (enabled && !this.isPlaying) {
      this.start();
    } else if (!enabled && this.isPlaying) {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;
    localStorage.setItem('coastal_racer_music_volume', clamped.toFixed(2));

    if (this.ctx && this.masterGain && this.isEnabled) {
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public getStyle(): MusicStyle {
    return this.style;
  }

  public setStyle(newStyle: MusicStyle) {
    this.style = newStyle;
    localStorage.setItem('coastal_racer_music_style', newStyle);
    if (this.ctx && this.filterNode) {
      const targetFreq = newStyle === 'chillwave' ? 2200 : (newStyle === 'cruiser' ? 3400 : 4200);
      this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Subtle acceleration of rhythm based on vehicle speed.
   */
  public setSpeed(speedKmH: number) {
    const ratio = Math.max(0, Math.min(1, (speedKmH - 80) / 120));
    // Chillwave base 112 -> 132 BPM, Cyber 122 -> 146 BPM
    const base = this.style === 'chillwave' ? 112 : (this.style === 'cruiser' ? 118 : 124);
    const range = this.style === 'chillwave' ? 18 : 24;
    this.currentBpm = base + (ratio * range);
  }

  public start() {
    if (this.isPlaying || !this.isEnabled) return;
    this.initAudio();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.currentStep = 0;
    this.scheduleNextStep();
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNextStep() {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;

    const stepDurationSec = (60 / this.currentBpm) / 4;
    const now = this.ctx.currentTime;

    const barIndex = Math.floor(this.currentStep / 16) % this.chords.length;
    const stepInBar = this.currentStep % 16;
    const chord = this.chords[barIndex];

    // Rhythm elements according to selected style
    if (this.style === 'chillwave') {
      // Gentle, soothing chill groove
      // Soft kick on beats 0 and 8 (downbeats only)
      if (stepInBar === 0 || stepInBar === 8) {
        this.playSoftKick(now);
      }
      // Soft rim / brush snare on beat 4 and 12
      if (stepInBar === 4 || stepInBar === 12) {
        this.playSoftSnare(now);
      }
      // Subtle hi-hat on 8th notes
      if (stepInBar % 4 === 2) {
        this.playSoftHiHat(now, 0.02);
      }
      // Warm, deep rolling sub bass
      this.playChillBass(now, chord.bass, stepInBar);
      // Lush, dreamy analog synth pad
      if (stepInBar === 0 || stepInBar === 8) {
        this.playChordPad(now, chord.notes, stepDurationSec * 8, true);
      }
    } else if (this.style === 'cruiser') {
      // Classic Outrun Cruiser
      if (stepInBar % 4 === 0) {
        this.playSoftKick(now);
      }
      if (stepInBar === 4 || stepInBar === 12) {
        this.playSoftSnare(now);
      }
      if (stepInBar % 2 === 1) {
        this.playSoftHiHat(now, 0.03);
      }
      this.playDrivingBass(now, chord.bass, stepInBar);
      if (stepInBar === 0 || stepInBar === 8) {
        this.playChordPad(now, chord.notes, stepDurationSec * 8, false);
      }
      this.playArp(now, chord.notes, stepInBar, 0.03);
    } else {
      // Cyber Pulse
      if (stepInBar % 4 === 0) {
        this.playSoftKick(now);
      }
      if (stepInBar === 4 || stepInBar === 12) {
        this.playSoftSnare(now);
      }
      if (stepInBar % 2 === 1) {
        this.playSoftHiHat(now, 0.035);
      }
      this.playDrivingBass(now, chord.bass, stepInBar);
      if (stepInBar === 0 || stepInBar === 8) {
        this.playChordPad(now, chord.notes, stepDurationSec * 8, false);
      }
      this.playArp(now, chord.notes, stepInBar, 0.045);
    }

    this.currentStep = (this.currentStep + 1) % 64;

    const ms = stepDurationSec * 1000;
    this.timerId = window.setTimeout(() => {
      this.scheduleNextStep();
    }, ms);
  }

  /**
   * Warm, mellow kick with deep sine sweep (never ear-piercing)
   */
  private playSoftKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.16);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.21);
    } catch {
      // Audio error safety
    }
  }

  /**
   * Soft, warm filtered snare (no harsh treble)
   */
  private playSoftSnare(time: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.45;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to remove harsh highs and boomy lows
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);
      filter.Q.setValueAtTime(1.2, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      // Warm triangle body tone
      const bodyOsc = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(140, time);
      bodyOsc.frequency.exponentialRampToValueAtTime(65, time + 0.08);

      bodyGain.gain.setValueAtTime(0.12, time);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.masterGain);

      noise.start(time);
      bodyOsc.start(time);
      noise.stop(time + 0.15);
      bodyOsc.stop(time + 0.15);
    } catch {
      // Audio error safety
    }
  }

  /**
   * Soft metallic hi-hat
   */
  private playSoftHiHat(time: number, volume: number = 0.025) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(5200, time);
      filter.Q.setValueAtTime(2.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
      noise.stop(time + 0.04);
    } catch {
      // Audio error safety
    }
  }

  /**
   * Chill sub-bass with lowpass envelope
   */
  private playChillBass(time: number, bassFreq: number, stepInBar: number) {
    if (!this.ctx || !this.masterGain) return;
    // Only play on beats 0, 3, 6, 8, 11 (syncopated gentle bass)
    if (![0, 3, 6, 8, 11].includes(stepInBar)) return;

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(bassFreq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, time);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.23);
    } catch {
      // Audio error safety
    }
  }

  /**
   * Driving Outrun Bass
   */
  private playDrivingBass(time: number, bassFreq: number, stepInBar: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const freq = (stepInBar === 3 || stepInBar === 7 || stepInBar === 11 || stepInBar === 15)
        ? bassFreq * 2
        : bassFreq;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, time);
      filter.frequency.exponentialRampToValueAtTime(130, time + 0.1);
      filter.Q.setValueAtTime(2.5, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.12);
    } catch {
      // Audio error safety
    }
  }

  /**
   * Lush Warm Analog Synth Pad
   */
  private playChordPad(time: number, chordNotes: number[], duration: number, isChill: boolean) {
    if (!this.ctx || !this.masterGain) return;
    try {
      chordNotes.forEach((freq) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = isChill ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime(Math.random() * 8 - 4, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isChill ? 550 : 750, time);

        // Soft pad envelope
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(isChill ? 0.03 : 0.025, time + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
      });
    } catch {
      // Audio error safety
    }
  }

  /**
   * Arpeggiator: Soft triangle pluck
   */
  private playArp(time: number, chordNotes: number[], stepInBar: number, vol: number) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const noteIdx = (stepInBar * 2) % chordNotes.length;
      const noteFreq = chordNotes[noteIdx] * 2;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(noteFreq, time);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.09);
    } catch {
      // Audio error safety
    }
  }
}

export const synthwaveBgm = new SynthwaveBgmEngine();
