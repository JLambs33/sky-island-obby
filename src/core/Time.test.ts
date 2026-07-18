import { describe, it, expect } from "vitest";
import { Time, FIXED_STEP_MS } from "./Time";

describe("Time (fixed-timestep clock)", () => {
  it("emits no steps on the first frame (establishes baseline)", () => {
    const t = new Time();
    expect(t.frame(1000)).toEqual({ steps: 0, alpha: 0 });
  });

  it("runs one fixed step per elapsed step interval", () => {
    const t = new Time();
    t.frame(0);
    const { steps } = t.frame(FIXED_STEP_MS);
    expect(steps).toBe(1);
  });

  it("accumulates leftover time into the interpolation alpha", () => {
    const t = new Time();
    t.frame(0);
    const { steps, alpha } = t.frame(FIXED_STEP_MS * 1.5);
    expect(steps).toBe(1);
    expect(alpha).toBeCloseTo(0.5, 5);
  });

  it("clamps huge frame gaps to avoid a spiral of death", () => {
    const t = new Time();
    t.frame(0);
    const { steps } = t.frame(10_000); // 10s stall
    expect(steps).toBeLessThanOrEqual(5);
  });
});
