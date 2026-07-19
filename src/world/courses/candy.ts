/**
 * "Candy Rush" — easy-medium, pastel candy land. Introduces the fun movers:
 * bounce launches, a speed-pad taffy slide, gummy conveyors, a gentle
 * lollipop spinner, and the first teleporter. Fall = just retry; no lava.
 */

import type { CourseDef } from "./defs";

const PINK = 0xff9ecb;
const MINT = 0x8ee6c2;
const LEMON = 0xfff05e;
const LAVENDER = 0xd8a5f8;

export const CANDY: CourseDef = {
  id: "candy",
  name: "Candy Rush",
  color: 0xff6fae,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 150,
  medals: { gold: 55, silver: 95 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [5, 0.4, 5], color: PINK },

    // Bounce launch up to the mint shelf.
    { type: "platform", pos: [0, -0.2, -6], size: [3, 0.4, 3], color: LAVENDER },
    { type: "bounce", pos: [0, 0, -6] },
    { type: "coin", pos: [0, 2.5, -8] },
    { type: "platform", pos: [0, 3.8, -12], size: [4, 0.4, 4], color: MINT },
    { type: "checkpoint", pos: [1.2, 4, -12] },

    // Taffy slide: speed pad, then a boosted long jump.
    { type: "platform", pos: [0, 3.8, -20], size: [4, 0.4, 10], color: LEMON },
    { type: "speed", pos: [0, 4, -17] },
    { type: "coin", pos: [0, 4.9, -20] },
    { type: "coin", pos: [0, 4.9, -23] },
    { type: "platform", pos: [0, 3.8, -31.5], size: [4, 0.4, 4], color: PINK },
    { type: "coin", pos: [0, 4.9, -31.5] },
    { type: "checkpoint", pos: [-1.2, 4, -31.5] },

    // Gummy conveyors: one carries you along, one drags you sideways.
    { type: "conveyor", pos: [0, 3.8, -38.5], size: [3, 0.4, 8], dir: [0, -1], speed: 3 },
    { type: "coin", pos: [0, 4.9, -38.5] },
    { type: "conveyor", pos: [0, 3.8, -47.5], size: [3.5, 0.4, 8], dir: [1, 0], speed: 2.5 },
    { type: "coin", pos: [-1, 4.9, -47.5] },

    // Lollipop spinner plaza.
    { type: "platform", pos: [0, 3.8, -56], size: [6, 0.4, 6], color: LAVENDER },
    { type: "spinner", pos: [0, 4, -56], radius: 2.2, period: 3.4 },
    { type: "coin", pos: [-2.2, 4.9, -54] },
    { type: "coin", pos: [2.2, 4.9, -58] },
    { type: "checkpoint", pos: [2.5, 4, -53.8] },

    // Teleporter up to the summit approach.
    { type: "teleporter", pos: [-2, 4, -58], dest: [0, 8.1, -64], color: 0xff6fae },
    { type: "platform", pos: [0, 7.8, -64], size: [4, 0.4, 4], color: MINT },
    { type: "coin", pos: [0, 8.9, -64] },
    { type: "platform", pos: [0, 7.8, -70], size: [4, 0.4, 4], color: LEMON },

    // Candy summit.
    { type: "platform", pos: [0, 7.8, -77], size: [6, 0.4, 6], color: PINK },
    { type: "coin", pos: [-1.8, 8.9, -76] },
    { type: "coin", pos: [1.8, 8.9, -76] },
    { type: "trophy", pos: [0, 8, -77.5] },
  ],
};
