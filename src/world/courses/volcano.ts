/**
 * "Volcano Escape" — the expert course. Falling tiles over a lava lake, a
 * sweeping lava blade, twin spinners, a wind chimney with rising lava, an
 * obsidian beam run under a hammer, a boosted mega-jump, and a teleporter
 * finale to the crater rim. Checkpoints are generous because nothing else is.
 */

import type { CourseDef } from "./defs";

const OBSIDIAN = 0x2b2b33;
const BASALT = 0x474b55;

export const VOLCANO: CourseDef = {
  id: "volcano",
  name: "Volcano Escape",
  color: 0x8b1e12,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 400,
  medals: { gold: 100, silver: 170 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [5, 0.4, 5], color: BASALT },

    // Falling-tile bridge over the lava lake — keep moving!
    { type: "lava", pos: [0, -2.2, -10], size: [14, 0.8, 18] },
    { type: "falling", pos: [0, -0.2, -4.5] },
    { type: "falling", pos: [1, -0.2, -7.5] },
    { type: "coin", pos: [1, 0.9, -7.5] },
    { type: "falling", pos: [-0.5, -0.2, -10.5] },
    { type: "falling", pos: [0.5, -0.2, -13.5] },
    { type: "platform", pos: [0, -0.2, -17.5], size: [3.5, 0.4, 3.5], color: BASALT },
    { type: "checkpoint", pos: [1, 0, -17.5] },

    // Sweeping lava blade — jump it or dance around it.
    { type: "platform", pos: [0, -0.2, -24.5], size: [6, 0.4, 6], color: OBSIDIAN },
    { type: "lava", pos: [3.6, 0.6, -24.5], size: [1, 1.2, 6], moveTo: [-3.6, 0.6, -24.5], period: 3.4 },
    { type: "coin", pos: [-2.2, 0.9, -23] },
    { type: "coin", pos: [2.2, 0.9, -26] },

    // Twin spinners.
    { type: "platform", pos: [0, -0.2, -32], size: [6, 0.4, 6], color: BASALT },
    { type: "spinner", pos: [-1.8, 0, -32], radius: 2, period: 2.6 },
    { type: "spinner", pos: [1.8, 0, -32], radius: 2, period: 3.3 },
    { type: "coin", pos: [0, 0.9, -34.3] },
    { type: "platform", pos: [0, -0.2, -37.5], size: [3, 0.4, 3], color: OBSIDIAN },
    { type: "checkpoint", pos: [0, 0, -37.5] },

    // The chimney: ride the updraft past the rising lava column.
    { type: "wind", pos: [0, 4, -42.5], size: [3, 10, 3], strength: 12 },
    { type: "lava", pos: [0, 0.5, -42.5], size: [3, 1, 3], moveTo: [0, 6.5, -42.5], period: 6 },
    { type: "coin", pos: [0, 3.5, -42.5] },
    { type: "coin", pos: [0, 6, -42.5] },
    { type: "platform", pos: [0, 8.3, -46.5], size: [3, 0.4, 3], color: BASALT },
    { type: "checkpoint", pos: [1, 8.5, -46.5] },

    // Obsidian beam run under a hammer.
    { type: "platform", pos: [0, 8.3, -51.5], size: [1.2, 0.4, 4], color: OBSIDIAN },
    { type: "coin", pos: [0, 9.4, -51.5] },
    { type: "platform", pos: [1.5, 8.3, -57], size: [1.2, 0.4, 4], color: OBSIDIAN },
    { type: "pendulum", pos: [1.5, 12.7, -57], length: 3.2, period: 2.6 },
    { type: "coin", pos: [1.5, 9.4, -57] },
    { type: "platform", pos: [0, 8.3, -62.5], size: [3, 0.4, 3], color: BASALT },
    { type: "checkpoint", pos: [-1, 8.5, -62.5] },

    // Speed-pad mega jump.
    { type: "speed", pos: [0, 8.5, -62.5] },
    { type: "platform", pos: [0, 8.3, -69.5], size: [3, 0.4, 3], color: OBSIDIAN },
    { type: "coin", pos: [0, 9.4, -69.5] },

    // Teleporter finale to the crater rim.
    { type: "teleporter", pos: [0, 8.5, -70.5], dest: [0, 14.2, -77], color: 0xff5722 },
    { type: "platform", pos: [0, 13.8, -78], size: [7, 0.4, 7], color: BASALT },
    { type: "lava", pos: [0, 14.1, -81.2], size: [7, 0.3, 0.6] },
    { type: "coin", pos: [-2.4, 15, -77] },
    { type: "coin", pos: [2.4, 15, -77] },
    { type: "coin", pos: [0, 15, -75.5] },
    { type: "trophy", pos: [0, 14, -78.5] },
  ],
};
