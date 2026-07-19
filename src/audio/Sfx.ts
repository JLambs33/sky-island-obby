/**
 * WebAudio-synthesized sound effects — no audio assets. The AudioContext is
 * created/resumed on the first user gesture (`unlock()`, called from the
 * menu's Play button) because iOS requires it.
 */

export type SfxName =
  | "jump"
  | "land"
  | "coin"
  | "checkpoint"
  | "bounce"
  | "die"
  | "win"
  | "buy"
  | "denied"
  | "click"
  | "teleport"
  | "speed"
  | "star"
  | "unlock";

export class Sfx {
  muted = false;
  private ctx: AudioContext | null = null;

  /** Call from a user gesture (iOS autoplay policy). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** The shared AudioContext (null until unlock). Music taps into this. */
  get context(): AudioContext | null {
    return this.ctx;
  }

  play(name: SfxName): void {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    switch (name) {
      case "jump":
        this.tone(300, 620, 0.14, "square", 0.12);
        break;
      case "land":
        this.tone(240, 140, 0.08, "triangle", 0.1);
        break;
      case "coin":
        this.tone(950, 950, 0.06, "sine", 0.14);
        this.tone(1420, 1420, 0.1, "sine", 0.14, 0.06);
        break;
      case "checkpoint":
        this.tone(523, 523, 0.09, "triangle", 0.16);
        this.tone(659, 659, 0.09, "triangle", 0.16, 0.09);
        this.tone(784, 784, 0.16, "triangle", 0.16, 0.18);
        break;
      case "bounce":
        this.tone(180, 780, 0.22, "square", 0.14);
        break;
      case "die":
        this.tone(420, 90, 0.4, "sawtooth", 0.12);
        break;
      case "win":
        for (const [i, f] of [523, 659, 784, 1047, 1319].entries()) {
          this.tone(f, f, 0.14, "triangle", 0.16, i * 0.11);
        }
        break;
      case "buy":
        this.tone(700, 1400, 0.12, "sine", 0.15);
        this.tone(1047, 1047, 0.14, "triangle", 0.13, 0.12);
        break;
      case "denied":
        this.tone(220, 220, 0.1, "square", 0.1);
        this.tone(185, 185, 0.16, "square", 0.1, 0.11);
        break;
      case "click":
        this.tone(850, 850, 0.04, "sine", 0.1);
        break;
      case "teleport":
        this.tone(1400, 200, 0.18, "sawtooth", 0.1);
        this.tone(200, 1600, 0.2, "sine", 0.12, 0.1);
        break;
      case "speed":
        this.tone(400, 1200, 0.25, "square", 0.1);
        break;
      case "star":
        for (const [i, f] of [784, 988, 1175, 1568].entries()) {
          this.tone(f, f, 0.12, "sine", 0.16, i * 0.09);
        }
        break;
      case "unlock":
        this.tone(523, 523, 0.12, "triangle", 0.15);
        this.tone(784, 784, 0.12, "triangle", 0.15, 0.13);
        this.tone(1047, 1319, 0.3, "triangle", 0.16, 0.26);
        break;
    }
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + duration);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
}
