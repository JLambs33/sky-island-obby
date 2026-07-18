/**
 * "Cloud Climb" — introduces moving platforms (a ferry and an elevator),
 * narrow beams, and the first lava. Gaps up to 2.5.
 */

import type { CourseDef } from "./defs";

const CLOUD = 0xeef4fb;
const SKY = 0x7ec3ef;

export const MEDIUM: CourseDef = {
  id: "medium",
  name: "Cloud Climb",
  color: 0x2bb3f3,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 100,
  medals: { gold: 60, silver: 110 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [5, 0.4, 5], color: CLOUD },

    // Ferry across the first big gap.
    { type: "platform", pos: [0, -0.2, -5.5], size: [3, 0.4, 3], color: SKY, moveTo: [0, -0.2, -13], period: 5 },
    { type: "coin", pos: [0, 0.9, -9] },
    { type: "platform", pos: [0, -0.2, -18], size: [4, 0.4, 4], color: CLOUD },
    { type: "checkpoint", pos: [1.5, 0, -18] },

    // Elevator up.
    { type: "platform", pos: [0, 1, -24], size: [3, 0.4, 3], color: SKY, moveTo: [0, 4, -24], period: 5 },
    { type: "platform", pos: [0, 4.8, -30], size: [4, 0.4, 4], color: CLOUD },
    { type: "coin", pos: [0, 5.9, -30] },

    // Narrow beam hops.
    { type: "platform", pos: [1.5, 4.8, -35], size: [2, 0.4, 2], color: CLOUD },
    { type: "coin", pos: [1.5, 5.9, -35] },
    { type: "platform", pos: [-1.5, 4.8, -40], size: [2, 0.4, 2], color: CLOUD },
    { type: "coin", pos: [-1.5, 5.9, -40] },
    { type: "platform", pos: [0, 4.8, -46], size: [5, 0.4, 5], color: CLOUD },
    { type: "checkpoint", pos: [2, 5, -46] },

    // Lava strip — hug the edges or jump the middle for a coin.
    { type: "platform", pos: [0, 4.8, -54], size: [6, 0.4, 8], color: CLOUD },
    { type: "lava", pos: [0, 5.2, -54], size: [2, 0.4, 8] },
    { type: "coin", pos: [0, 6.4, -54] },

    // Moving platform to the summit.
    { type: "platform", pos: [0, 4.8, -61.5], size: [2.5, 0.4, 2.5], color: SKY, moveTo: [0, 4.8, -66], period: 3.5 },
    { type: "platform", pos: [0, 4.8, -72], size: [6, 0.4, 6], color: CLOUD },
    { type: "coin", pos: [-2, 5.9, -71] },
    { type: "coin", pos: [2, 5.9, -71] },
    { type: "coin", pos: [0, 5.9, -70] },
    { type: "trophy", pos: [0, 5, -72.5] },
  ],
};
