/**
 * Regression tests for the respawn death-loop. three.js objects construct
 * fine in node (no WebGL needed until render), so these drive a real Course
 * with a real Player at fixed 60 Hz steps.
 */

import { describe, it, expect } from "vitest";
import { Course } from "./Course";
import { Player } from "./Player";
import { Checkpoint } from "./pieces/Checkpoint";
import type { CourseDef } from "./courses/defs";
import type { GameHost } from "./types";
import type { InputController } from "../input/InputController";

const DT = 1 / 60;

function makeInput(forward = 0): InputController {
  return {
    move: { x: 0, y: forward },
    lookDelta: { x: 0, y: 0 },
    jumpPressed: false,
    jumpHeld: false,
    endFrame() {},
    setEnabled() {},
    dispose() {},
  };
}

function makeHost(): GameHost & { respawns: number } {
  return {
    respawns: 0,
    addCoins() {},
    toast() {},
    sfxPlay() {},
    courseComplete() {},
    enterCourse() {},
    openShop() {},
    openCustomizer() {},
    respawned() {
      this.respawns++;
    },
  };
}

// One 6x6 platform (top y=0) and nothing else — walk forward and you fall.
const DEF: CourseDef = {
  id: "easy",
  name: "Test Course",
  color: 0xffffff,
  spawn: [0, 0, 0],
  killY: -10,
  coinValue: 5,
  bonus: 0,
  medals: { gold: 1, silver: 2 },
  pieces: [{ type: "platform", pos: [0, -0.2, 0], size: [6, 0.4, 6] }],
};

function run(course: Course, input: InputController, steps: number, until?: () => boolean): number {
  for (let i = 0; i < steps; i++) {
    course.step(DT, input, 0); // cameraYaw 0 → forward is -Z
    if (until?.()) return i;
  }
  return steps;
}

describe("Course respawn safety", () => {
  it("re-grounds shortly after falling off, even with the stick held forward", () => {
    const host = makeHost();
    const player = new Player();
    const course = new Course(DEF, host, player);
    course.begin();

    const input = makeInput(1); // held forward the whole time
    // Walk off the platform edge and fall past killY.
    run(course, input, 600, () => host.respawns >= 1);
    expect(host.respawns).toBe(1);

    // After respawn, the input freeze must let the player settle on ground
    // before movement resumes — the player must be grounded within ~0.2s.
    const grounded = run(course, input, 12, () => player.grounded);
    expect(player.grounded).toBe(true);
    expect(grounded).toBeLessThan(12);
  });

  it("falls back to solid ground when the stored spawn is over air (death-loop repro)", () => {
    const host = makeHost();
    const player = new Player();
    const course = new Course(DEF, host, player);
    course.begin();

    // Simulate the bug condition: the active spawn point ends up over a gap.
    course.reachCheckpoint({ x: 0, y: 0, z: -30 });

    // Fall off the platform. Pre-fix this respawned into mid-air forever.
    const input = makeInput(1);
    run(course, input, 600, () => host.respawns >= 1);
    expect(host.respawns).toBe(1);

    run(course, input, 30, () => player.grounded);
    expect(player.grounded).toBe(true);
    // Ground-verified fallback must have placed them back at the course start.
    expect(Math.abs(player.pos.x)).toBeLessThan(3.1);
    expect(Math.abs(player.pos.z)).toBeLessThan(3.1);
  });

  it("stops trusting a spawn point that keeps failing and snaps to course start", () => {
    const host = makeHost();
    const player = new Player();
    const course = new Course(DEF, host, player);
    course.begin();
    const input = makeInput(0);

    // A checkpoint elsewhere on the same solid platform — perfectly valid
    // ground, but simulate it somehow re-killing the player almost instantly
    // three times in a row (belt-and-suspenders: whatever the real-world
    // cause, the guard must not let this repeat forever).
    course.reachCheckpoint({ x: 2, y: 0, z: 2 });
    for (let i = 0; i < 3; i++) {
      player.teleport(0, -20, 0); // force a fall regardless of cause
      course.step(DT, input, 0);
    }

    expect(host.respawns).toBe(3);
    // Third respawn must have given up on the checkpoint and used the
    // course's own (always-safe) start spawn instead.
    expect(Math.abs(player.pos.x - DEF.spawn[0])).toBeLessThan(0.1);
    expect(Math.abs(player.pos.z - DEF.spawn[2])).toBeLessThan(0.1);
  });

  it("hazard immunity blocks repeat kills right after a respawn, falling does not", () => {
    const host = makeHost();
    const player = new Player();
    const course = new Course(DEF, host, player);
    course.begin();
    const input = makeInput(0);

    course.kill(); // hazard kill (e.g. lava)
    course.step(DT, input, 0);
    expect(host.respawns).toBe(1);

    // A hazard touching the player during immunity must not re-kill.
    course.kill();
    course.step(DT, input, 0);
    expect(host.respawns).toBe(1);

    // But falling out of the world during immunity still respawns.
    player.teleport(0, -20, 0);
    course.step(DT, input, 0);
    expect(host.respawns).toBe(2);
  });

  it("checkpoints only activate while the player is on the ground", () => {
    let reached = 0;
    const host = {
      ...makeHost(),
      reachCheckpoint: () => reached++,
      kill() {},
      collectCoin() {},
      bounce() {},
      completeCourse() {},
      push() {},
      boost() {},
      updraft() {},
      teleportPlayer() {},
    };
    const cp = new Checkpoint([0, 0, 0]);
    const box = { cx: 0, cy: 1.1, cz: 0, hx: 0.4, hy: 1.1, hz: 0.4 };

    cp.checkTrigger(box, host, { grounded: false });
    expect(reached).toBe(0); // flying past must not count

    cp.checkTrigger(box, host, { grounded: true });
    expect(reached).toBe(1);
  });
});
