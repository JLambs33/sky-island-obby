import { describe, it, expect } from "vitest";
import { keysToMove, joystickVector } from "./mapping";
import type { Vec2 } from "./InputController";

const out = (): Vec2 => ({ x: 0, y: 0 });

describe("keysToMove", () => {
  it("returns zero with no keys", () => {
    expect(keysToMove(false, false, false, false, out())).toEqual({ x: 0, y: 0 });
  });

  it("maps W/up to forward (+y) and S/down to back (-y)", () => {
    expect(keysToMove(true, false, false, false, out())).toEqual({ x: 0, y: 1 });
    expect(keysToMove(false, true, false, false, out())).toEqual({ x: 0, y: -1 });
  });

  it("maps A/left to -x and D/right to +x", () => {
    expect(keysToMove(false, false, true, false, out())).toEqual({ x: -1, y: 0 });
    expect(keysToMove(false, false, false, true, out())).toEqual({ x: 1, y: 0 });
  });

  it("cancels opposing keys", () => {
    expect(keysToMove(true, true, true, true, out())).toEqual({ x: 0, y: 0 });
  });

  it("normalizes diagonals to length 1", () => {
    const v = keysToMove(true, false, false, true, out());
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 6);
    expect(v.x).toBeCloseTo(Math.SQRT1_2, 6);
    expect(v.y).toBeCloseTo(Math.SQRT1_2, 6);
  });

  it("writes into the provided out object (no allocation)", () => {
    const o = out();
    expect(keysToMove(true, false, false, false, o)).toBe(o);
  });
});

describe("joystickVector", () => {
  it("returns zero at the origin", () => {
    expect(joystickVector(0, 0, 60, out())).toEqual({ x: 0, y: 0 });
  });

  it("pushing up (screen -y) is forward (+y)", () => {
    expect(joystickVector(0, -60, 60, out())).toEqual({ x: 0, y: 1 });
  });

  it("pushing right is +x", () => {
    expect(joystickVector(60, 0, 60, out())).toEqual({ x: 1, y: 0 });
  });

  it("scales linearly within the throw radius", () => {
    expect(joystickVector(30, 0, 60, out())).toEqual({ x: 0.5, y: 0 });
  });

  it("clamps displacement beyond the throw radius to magnitude 1", () => {
    const v = joystickVector(300, 0, 60, out());
    expect(v).toEqual({ x: 1, y: 0 });
    const diag = joystickVector(100, -100, 60, out());
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1, 6);
    expect(diag.y).toBeGreaterThan(0); // up = forward
  });
});
