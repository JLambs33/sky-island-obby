import { describe, it, expect } from "vitest";
import { boxesOverlap, findGroundY, moveBox, type Box, type MoveResult } from "./physics";

const box = (cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): Box => ({
  cx,
  cy,
  cz,
  hx,
  hy,
  hz,
});

const result = (): MoveResult => ({
  x: 0,
  y: 0,
  z: 0,
  onGround: false,
  hitCeiling: false,
  groundIndex: -1,
});

// A 4x0.4x4 platform whose top surface is y = 0.
const platform = box(0, -0.2, 0, 2, 0.2, 2);
// Player half extents (matches Player.ts).
const H = { hx: 0.4, hy: 1.1, hz: 0.4 };

describe("findGroundY", () => {
  it("finds the top surface of a solid under the point", () => {
    expect(findGroundY(0, 0, [platform], 5)).toBeCloseTo(0);
  });

  it("returns null when nothing is below", () => {
    expect(findGroundY(10, 10, [platform], 5)).toBeNull();
    expect(findGroundY(0, 0, [], 5)).toBeNull();
  });

  it("picks the highest of stacked solids", () => {
    const upper = box(0, 2, 0, 2, 0.2, 2);
    expect(findGroundY(0, 0, [platform, upper], 5)).toBeCloseTo(2.2);
  });

  it("ignores solids above the query height (plus tolerance)", () => {
    const wayAbove = box(0, 8, 0, 2, 0.2, 2);
    expect(findGroundY(0, 0, [platform, wayAbove], 5)).toBeCloseTo(0);
  });

  it("ignores solids the point is not horizontally over", () => {
    const offToSide = box(5, 1, 0, 1, 0.2, 1);
    expect(findGroundY(0, 0, [offToSide], 5)).toBeNull();
  });
});

describe("boxesOverlap", () => {
  it("detects interpenetration and rejects separation", () => {
    expect(boxesOverlap(box(0, 0, 0, 1, 1, 1), box(1.5, 0, 0, 1, 1, 1))).toBe(true);
    expect(boxesOverlap(box(0, 0, 0, 1, 1, 1), box(3, 0, 0, 1, 1, 1))).toBe(false);
  });

  it("treats exactly touching faces as not overlapping (stable contacts)", () => {
    expect(boxesOverlap(box(0, 0, 0, 1, 1, 1), box(2, 0, 0, 1, 1, 1))).toBe(false);
  });
});

describe("moveBox", () => {
  it("falls freely with no solids", () => {
    const r = moveBox(0, 5, 0, H.hx, H.hy, H.hz, 0, -0.2, 0, [], result());
    expect(r.y).toBeCloseTo(4.8);
    expect(r.onGround).toBe(false);
  });

  it("lands on a platform and snaps to its surface", () => {
    // Player center at hy + 0.05 above surface, falling 0.2.
    const r = moveBox(0, H.hy + 0.05, 0, H.hx, H.hy, H.hz, 0, -0.2, 0, [platform], result());
    expect(r.y).toBeCloseTo(H.hy); // feet exactly on y=0
    expect(r.onGround).toBe(true);
    expect(r.groundIndex).toBe(0);
  });

  it("reports which solid it stood on", () => {
    const other = box(10, -0.2, 0, 2, 0.2, 2);
    const r = moveBox(10, H.hy + 0.05, 0, H.hx, H.hy, H.hz, 0, -0.2, 0, [platform, other], result());
    expect(r.groundIndex).toBe(1);
  });

  it("is not grounded after walking off the edge", () => {
    const r = moveBox(5, H.hy, 0, H.hx, H.hy, H.hz, 0.1, -0.1, 0, [platform], result());
    expect(r.onGround).toBe(false);
    expect(r.y).toBeLessThan(H.hy);
  });

  // Deltas below are per-fixed-step scale (≤ ~0.35 units) — the collider's
  // contract; it does endpoint resolution, not swept tests.
  it("blocks horizontal motion into a wall", () => {
    const wall = box(3, 1, 0, 0.5, 2, 2);
    const r = moveBox(2.0, 1, 0, H.hx, H.hy, H.hz, 0.3, 0, 0, [wall], result());
    expect(r.x).toBeCloseTo(3 - 0.5 - H.hx);
  });

  it("blocks motion in -x and -z too", () => {
    const wall = box(-3, 1, 0, 0.5, 2, 2);
    const r = moveBox(-2.0, 1, 0, H.hx, H.hy, H.hz, -0.3, 0, 0, [wall], result());
    expect(r.x).toBeCloseTo(-3 + 0.5 + H.hx);

    const wallZ = box(0, 1, -3, 2, 2, 0.5);
    const r2 = moveBox(0, 1, -2.0, H.hx, H.hy, H.hz, 0, 0, -0.3, [wallZ], result());
    expect(r2.z).toBeCloseTo(-3 + 0.5 + H.hz);
  });

  it("hits its head on a ceiling while jumping", () => {
    const ceiling = box(0, 5, 0, 2, 0.2, 2);
    const r = moveBox(0, 3, 0, H.hx, H.hy, H.hz, 0, 2, 0, [ceiling], result());
    expect(r.hitCeiling).toBe(true);
    expect(r.y).toBeCloseTo(5 - 0.2 - H.hy);
  });

  it("slides along a wall while still landing (axes independent)", () => {
    const wall = box(3, 1, 0, 0.5, 2, 2);
    const r = moveBox(2.0, H.hy + 0.05, 0, H.hx, H.hy, H.hz, 0.3, -0.2, 0.1, [wall, platform], result());
    expect(r.x).toBeCloseTo(3 - 0.5 - H.hx); // stopped by wall
    expect(r.z).toBeCloseTo(0.1); // z unaffected
    expect(r.onGround).toBe(true); // still landed
  });

  it("stays put and grounded under repeated gravity while standing", () => {
    let y = H.hy;
    const r = result();
    for (let i = 0; i < 10; i++) {
      moveBox(0, y, 0, H.hx, H.hy, H.hz, 0, -0.05, 0, [platform], r);
      y = r.y;
      expect(r.onGround).toBe(true);
    }
    expect(y).toBeCloseTo(H.hy);
  });
});
