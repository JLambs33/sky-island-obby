/**
 * "Meadow Hop" — the learning course. Wide platforms, small gaps (≤ 2), a
 * gentle climb, and one big fun bounce-pad launch. Every mechanic it uses is
 * safe to fail.
 */

import type { CourseDef } from "./defs";

const GRASS = 0x58c04d;
const DIRT = 0x9b6b3f;

export const EASY: CourseDef = {
  id: "easy",
  name: "Meadow Hop",
  color: 0x43c465,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 50,
  medals: { gold: 40, silver: 75 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [6, 0.4, 6], color: GRASS },

    // First hops — 1 to 2 unit gaps, flat.
    { type: "platform", pos: [0, -0.2, -6], size: [4, 0.4, 4], color: GRASS },
    { type: "coin", pos: [0, 0.9, -6] },
    { type: "platform", pos: [0, -0.2, -12], size: [4, 0.4, 4], color: GRASS },
    { type: "coin", pos: [0, 0.9, -12] },

    // A small sidestep and the first checkpoint.
    { type: "platform", pos: [2.5, 0.1, -18], size: [4, 0.4, 4], color: DIRT },
    { type: "checkpoint", pos: [3.5, 0.3, -18] },

    // Stair climb.
    { type: "platform", pos: [2.5, 0.5, -23], size: [2.5, 0.4, 2.5], color: GRASS },
    { type: "coin", pos: [2.5, 1.6, -23] },
    { type: "platform", pos: [2.5, 1.3, -27], size: [2.5, 0.4, 2.5], color: GRASS },
    { type: "platform", pos: [2.5, 2.1, -31], size: [2.5, 0.4, 2.5], color: GRASS },
    { type: "coin", pos: [2.5, 3.2, -31] },

    // Bounce-pad launch up to the sky path.
    { type: "platform", pos: [0, 2.3, -37], size: [6, 0.4, 6], color: DIRT },
    { type: "bounce", pos: [0, 2.5, -38] },
    { type: "platform", pos: [0, 6.3, -44], size: [5, 0.4, 5], color: GRASS },
    { type: "checkpoint", pos: [1.5, 6.5, -44] },
    { type: "coin", pos: [0, 7.4, -44] },

    // Sky hops to the summit.
    { type: "platform", pos: [0, 6.3, -50], size: [4, 0.4, 4], color: GRASS },
    { type: "coin", pos: [0, 7.4, -50] },
    { type: "platform", pos: [0, 6.3, -56], size: [4, 0.4, 4], color: GRASS },
    { type: "platform", pos: [0, 6.3, -63], size: [7, 0.4, 7], color: GRASS },
    { type: "coin", pos: [-1.5, 7.4, -62] },
    { type: "coin", pos: [1.5, 7.4, -62] },
    { type: "trophy", pos: [0, 6.5, -63.5] },
  ],
};
