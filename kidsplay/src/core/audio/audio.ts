/**
 * Offline audio: every sound effect and the background music are synthesized at runtime
 * with the Web Audio API, so nothing has to be downloaded and the bundle stays small.
 * Mobile autoplay restrictions are respected: the AudioContext is created/resumed only
 * after a user gesture (`unlock()`), and music pauses when the app goes to background.
 */
export type SfxName =
  | 'tap'
  | 'flip'
  | 'match'
  | 'success'
  | 'error'
  | 'win'
  | 'coin'
  | 'pop'
  | 'step'
  | 'whoosh'
  | 'unlock';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

type Note = [freq: number, start: number, dur: number, type?: OscillatorType, gain?: number];

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semitone offset from C4≈261.6

const SFX: Record<SfxName, Note[]> = {
  tap: [[N(12), 0, 0.06, 'triangle', 0.5]],
  flip: [
    [N(7), 0, 0.05, 'sine', 0.4],
    [N(12), 0.04, 0.06, 'sine', 0.4],
  ],
  match: [
    [N(12), 0, 0.1, 'triangle'],
    [N(16), 0.08, 0.1, 'triangle'],
    [N(19), 0.16, 0.16, 'triangle'],
  ],
  success: [
    [N(7), 0, 0.12, 'triangle'],
    [N(12), 0.1, 0.12, 'triangle'],
    [N(16), 0.2, 0.2, 'triangle'],
  ],
  error: [
    [N(4), 0, 0.12, 'sine', 0.35],
    [N(0), 0.1, 0.18, 'sine', 0.35],
  ],
  win: [
    [N(12), 0, 0.12, 'square', 0.25],
    [N(16), 0.12, 0.12, 'square', 0.25],
    [N(19), 0.24, 0.12, 'square', 0.25],
    [N(24), 0.36, 0.35, 'triangle', 0.5],
    [N(19), 0.36, 0.35, 'triangle', 0.3],
  ],
  coin: [
    [N(23), 0, 0.06, 'square', 0.2],
    [N(28), 0.06, 0.14, 'square', 0.2],
  ],
  pop: [[N(19), 0, 0.05, 'sine', 0.5]],
  step: [[N(0), 0, 0.04, 'triangle', 0.2]],
  whoosh: [
    [N(0), 0, 0.15, 'sawtooth', 0.08],
    [N(12), 0.05, 0.15, 'sawtooth', 0.06],
  ],
  unlock: [
    [N(12), 0, 0.08, 'triangle'],
    [N(19), 0.08, 0.08, 'triangle'],
    [N(24), 0.16, 0.25, 'triangle'],
  ],
};

// A gentle, looping pentatonic melody (C major pentatonic) with a soft bass line.
const MELODY = [0, 4, 7, 9, 7, 4, 2, 4, 0, 2, 4, 7, 9, 12, 9, 7];
const BASS = [-12, -12, -5, -5, -7, -7, -5, -5];
const BEAT = 0.32;

export class AudioService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicWanted = false;
  private suspendedByApp = false;
  settings: AudioSettings = { musicEnabled: true, sfxEnabled: true, musicVolume: 0.35, sfxVolume: 0.8 };

  get available(): boolean {
    return typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  /** Must be called from a user gesture handler (tap/click). Safe to call repeatedly. */
  unlock(): void {
    if (!this.available) return;
    if (!this.ctx) {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.applySettings(this.settings);
    }
    if (this.ctx.state === 'suspended' && !this.suspendedByApp) void this.ctx.resume();
    if (this.musicWanted) this.startMusicLoop();
  }

  applySettings(s: AudioSettings): void {
    this.settings = { ...s };
    if (this.musicGain) this.musicGain.gain.value = s.musicEnabled ? s.musicVolume * 0.5 : 0;
    if (this.sfxGain) this.sfxGain.gain.value = s.sfxEnabled ? s.sfxVolume : 0;
    if (!s.musicEnabled) this.stopMusicLoop();
    else if (this.musicWanted) this.startMusicLoop();
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.sfxGain || !this.settings.sfxEnabled || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    for (const [freq, start, dur, type = 'sine', gain = 0.4] of SFX[name]) {
      this.tone(this.sfxGain, freq, now + start, dur, type, gain);
    }
  }

  playMusic(): void {
    this.musicWanted = true;
    this.startMusicLoop();
  }

  stopMusic(): void {
    this.musicWanted = false;
    this.stopMusicLoop();
  }

  /** Called on app background/foreground (Capacitor lifecycle / visibilitychange). */
  setAppActive(active: boolean): void {
    this.suspendedByApp = !active;
    if (!this.ctx) return;
    if (active) {
      void this.ctx.resume();
      if (this.musicWanted) this.startMusicLoop();
    } else {
      this.stopMusicLoop();
      void this.ctx.suspend();
    }
  }

  private startMusicLoop(): void {
    if (!this.ctx || !this.musicGain || !this.settings.musicEnabled || this.musicTimer !== null) return;
    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime + 0.05;
      const step = this.musicStep++;
      const m = MELODY[step % MELODY.length];
      if (step % 4 !== 3) this.tone(this.musicGain, N(m + 12), t, BEAT * 0.9, 'triangle', 0.18);
      if (step % 2 === 0) this.tone(this.musicGain, N(BASS[(step / 2) % BASS.length]), t, BEAT * 1.8, 'sine', 0.22);
    };
    tick();
    this.musicTimer = window.setInterval(tick, BEAT * 1000);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private tone(dest: AudioNode, freq: number, start: number, dur: number, type: OscillatorType, gain: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env);
    env.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }
}

export const audio = new AudioService();
