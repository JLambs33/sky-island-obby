/**
 * Fixed-timestep simulation clock, decoupled from render cadence.
 * Adapted from ~/Code/detective-game (same contract, unit tested).
 *
 * Game logic advances in fixed steps (deterministic, frame-rate independent);
 * rendering happens once per animation frame using an interpolation alpha.
 * Consumers call `frame(nowMs)` once per rAF and receive how many fixed steps
 * to run plus the leftover alpha for smooth rendering between steps.
 */

export const FIXED_STEP_MS = 1000 / 60; // 60 Hz simulation
const MAX_STEPS_PER_FRAME = 5; // avoid spiral-of-death after a long stall

export class Time {
  private accumulatorMs = 0;
  private lastMs: number | null = null;

  /** Fixed step length in seconds, for use inside update logic. */
  readonly fixedDeltaSeconds = FIXED_STEP_MS / 1000;

  /**
   * Advance the clock to `nowMs`.
   * @returns number of fixed steps to run and the render interpolation alpha (0..1).
   */
  frame(nowMs: number): { steps: number; alpha: number } {
    if (this.lastMs === null) {
      this.lastMs = nowMs;
      return { steps: 0, alpha: 0 };
    }

    let frameMs = nowMs - this.lastMs;
    this.lastMs = nowMs;

    // Clamp pathological deltas (tab backgrounded, breakpoint, GC pause).
    const maxFrameMs = FIXED_STEP_MS * MAX_STEPS_PER_FRAME;
    if (frameMs > maxFrameMs) frameMs = maxFrameMs;
    if (frameMs < 0) frameMs = 0;

    this.accumulatorMs += frameMs;

    let steps = 0;
    while (this.accumulatorMs >= FIXED_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      this.accumulatorMs -= FIXED_STEP_MS;
      steps++;
    }

    const alpha = this.accumulatorMs / FIXED_STEP_MS;
    return { steps, alpha };
  }

  /** Reset after a known long pause so we don't fast-forward the simulation. */
  reset(): void {
    this.accumulatorMs = 0;
    this.lastMs = null;
  }
}
