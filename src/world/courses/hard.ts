/**
 * "Lava Summit" — the expert course: vanishing tiles, a spinner to jump,
 * stepping stones, narrow beams, and a diagonal elevator finish. Checkpoints
 * are generous because the pieces are not.
 */

import type { CourseDef } from "./defs";

const STONE = 0x6b6f7a;
const DARK = 0x474b55;

export const HARD: CourseDef = {
  id: "hard",
  name: "Lava Summit",
  color: 0xe8432c,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 200,
  medals: { gold: 90, silver: 160 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [5, 0.4, 5], color: STONE },

    // Vanishing bridge — keep moving!
    { type: "vanish", pos: [0, -0.2, -4.5] },
    { type: "vanish", pos: [0, -0.2, -7] },
    { type: "vanish", pos: [0, -0.2, -9.5] },
    { type: "vanish", pos: [0, -0.2, -12] },
    { type: "platform", pos: [0, -0.2, -16], size: [4, 0.4, 4], color: STONE },
    { type: "checkpoint", pos: [1.5, 0, -16] },

    // Spinner arena — jump the sweeping arm.
    { type: "platform", pos: [0, -0.2, -23], size: [6, 0.4, 6], color: DARK },
    { type: "spinner", pos: [0, 0, -23], radius: 2.6, period: 2.8 },
    { type: "coin", pos: [-2.2, 0.9, -21] },
    { type: "coin", pos: [2.2, 0.9, -25] },

    // Up onto the stepping stones.
    { type: "platform", pos: [0, 0.6, -29.5], size: [3, 0.4, 3], color: STONE },
    { type: "platform", pos: [1.5, 0.6, -33.5], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "coin", pos: [1.5, 1.7, -33.5] },
    { type: "platform", pos: [-1, 0.6, -36.5], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "platform", pos: [1, 0.6, -39.5], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "coin", pos: [1, 1.7, -39.5] },
    { type: "platform", pos: [0, 0.6, -43.5], size: [4, 0.4, 4], color: STONE },
    { type: "checkpoint", pos: [-1.5, 0.8, -43.5] },

    // Vanishing tiles, round two — offset hops.
    { type: "vanish", pos: [0, 0.6, -47.5] },
    { type: "vanish", pos: [1.5, 0.6, -50.5] },
    { type: "vanish", pos: [-0.5, 0.6, -53.5] },
    { type: "platform", pos: [0, 0.6, -57.5], size: [3, 0.4, 3], color: STONE },

    // Bounce launch to the high route.
    { type: "bounce", pos: [0, 0.8, -57.5] },
    { type: "platform", pos: [0, 4.6, -62.5], size: [3, 0.4, 3], color: DARK },
    { type: "checkpoint", pos: [1, 4.8, -62.5] },
    { type: "coin", pos: [0, 5.7, -62.5] },

    // Narrow beam run in the sky.
    { type: "platform", pos: [0, 4.6, -66.5], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "platform", pos: [1.5, 4.6, -70], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "coin", pos: [1.5, 5.7, -70] },
    { type: "platform", pos: [-1, 4.6, -73.5], size: [1.5, 0.4, 1.5], color: STONE },
    { type: "coin", pos: [-1, 5.7, -73.5] },

    // Diagonal elevator to the summit.
    { type: "platform", pos: [0, 4.6, -78], size: [2, 0.4, 2], color: DARK, moveTo: [0, 7.6, -82], period: 4.5 },
    { type: "platform", pos: [0, 7.6, -87], size: [6, 0.4, 6], color: STONE },
    { type: "coin", pos: [-2, 8.7, -86] },
    { type: "coin", pos: [2, 8.7, -86] },
    { type: "coin", pos: [0, 8.7, -88.5] },
    { type: "trophy", pos: [0, 7.8, -87.5] },
  ],
};
