/**
 * Background music — a cheerful 4-bar chiptune loop scheduled ahead of time
 * with WebAudio, no audio assets. Kept quiet under the SFX; toggleable and
 * persisted via the save.
 */

const BPM = 112;
const BEAT = 60 / BPM;
const LOOKAHEAD_S = 0.35;
const TICK_MS = 150;

// Melody in scientific-pitch semitones from A4=440. null = rest.
// 16 eighth-notes per bar-pair, C major, bouncy.
const MELODY: (number | null)[] = [
  3, 7, 10, 7, 12, null, 10, 7, 3, 7, 10, 12, 15, null, 12, 10,
  3, 7, 10, 7, 12, null, 10, 12, 15, 12, 10, 7, 3, null, null, null,
];
const BASS: (number | null)[] = [
  -21, null, -14, null, -17, null, -12, null, -21, null, -14, null, -9, null, -12, null,
  -21, null, -14, null, -17, null, -12, null, -9, null, -12, null, -21, null, null, null,
];

const freq = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);

export class Music {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private noteIndex = 0;

  /** Attach to the shared AudioContext once it exists (after unlock). */
  start(ctx: AudioContext): void {
    if (this.timer) return;
    this.ctx = ctx;
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.gain.value = 0.045;
      this.gain.connect(ctx.destination);
    }
    this.noteIndex = 0;
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  private schedule(): void {
    const ctx = this.ctx!;
    while (this.nextNoteTime < ctx.currentTime + LOOKAHEAD_S) {
      const i = this.noteIndex % MELODY.length;
      const m = MELODY[i];
      const b = BASS[i];
      const dur = BEAT / 2;
      if (m !== null) this.note(freq(m), this.nextNoteTime, dur * 0.9, "triangle", 1);
      if (b !== null) this.note(freq(b), this.nextNoteTime, dur * 0.95, "square", 0.45);
      this.nextNoteTime += dur;
      this.noteIndex++;
    }
  }

  private note(f: number, t0: number, dur: number, type: OscillatorType, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    env.gain.setValueAtTime(vol, t0);
    env.gain.exponentialRampToValueAtTime(0.01, t0 + dur);
    osc.connect(env).connect(this.gain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}
