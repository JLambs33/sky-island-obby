/**
 * "Gear Works" — medium-hard factory. Conveyor mazes (with and against the
 * belt), pistons that shove you toward edges, pendulum hammers over a narrow
 * bridge, a steam-vent updraft, and a ferris waypoint platform to the top.
 */

import type { CourseDef } from "./defs";

const STEEL = 0x6b7280;
const DARK = 0x3a3f4a;
const ORANGE = 0xf1a33c;

export const GEARS: CourseDef = {
  id: "gears",
  name: "Gear Works",
  color: 0xf1a33c,
  spawn: [0, 0, 1.5],
  killY: -12,
  coinValue: 5,
  bonus: 250,
  medals: { gold: 75, silver: 130 },
  pieces: [
    { type: "platform", pos: [0, -0.2, 0], size: [5, 0.4, 5], color: STEEL },

    // Conveyor grind: first belt runs against you, second drags you sideways.
    { type: "conveyor", pos: [0, -0.2, -7], size: [3, 0.4, 8], dir: [0, 1], speed: 3.5 },
    { type: "coin", pos: [0, 0.9, -7] },
    { type: "conveyor", pos: [0, -0.2, -15], size: [8, 0.4, 3], dir: [1, 0], speed: 4 },
    { type: "coin", pos: [-2.5, 0.9, -15] },
    { type: "platform", pos: [0, -0.2, -20.5], size: [4, 0.4, 4], color: STEEL },
    { type: "checkpoint", pos: [1.3, 0, -20.5] },

    // Piston alley: sliding blocks shove you toward the edges.
    { type: "platform", pos: [0, -0.2, -28], size: [4, 0.4, 10], color: DARK },
    { type: "platform", pos: [3.4, 0.8, -25], size: [2, 1.6, 1.6], color: ORANGE, moveTo: [-0.6, 0.8, -25], period: 2.2 },
    { type: "coin", pos: [0, 0.9, -26.5] },
    { type: "platform", pos: [-3.4, 0.8, -28.5], size: [2, 1.6, 1.6], color: ORANGE, moveTo: [0.6, 0.8, -28.5], period: 2.7 },
    { type: "coin", pos: [0, 0.9, -30.5] },
    { type: "platform", pos: [3.4, 0.8, -31.8], size: [2, 1.6, 1.6], color: ORANGE, moveTo: [-1, 0.8, -31.8], period: 2.0 },
    { type: "platform", pos: [0, -0.2, -36.5], size: [4, 0.4, 4], color: STEEL },
    { type: "checkpoint", pos: [-1.3, 0, -36.5] },

    // Hammer bridge: pendulums sweep across a narrow walkway.
    { type: "platform", pos: [0, -0.2, -45], size: [2, 0.4, 12], color: DARK },
    { type: "pendulum", pos: [0, 4.2, -41.5], length: 3.2, period: 2.4 },
    { type: "coin", pos: [0, 0.9, -43] },
    { type: "pendulum", pos: [0, 4.2, -45.5], length: 3.2, period: 3.0 },
    { type: "coin", pos: [0, 0.9, -47.5] },
    { type: "pendulum", pos: [0, 4.2, -49.5], length: 3.2, period: 2.7 },
    { type: "platform", pos: [0, -0.2, -54.5], size: [4, 0.4, 4], color: STEEL },
    { type: "checkpoint", pos: [1.3, 0, -54.5] },

    // Steam vent: ride the updraft to the high floor.
    { type: "wind", pos: [0, 2.5, -59.5], size: [2.5, 7, 2.5], strength: 11 },
    { type: "coin", pos: [0, 3.5, -59.5] },
    { type: "coin", pos: [0, 5.5, -59.5] },
    { type: "platform", pos: [0, 5.8, -63.5], size: [4, 0.4, 4], color: STEEL },

    // Ferris platform: ride the loop up to the top deck.
    {
      type: "platform",
      pos: [0, 5.8, -68],
      size: [2.5, 0.4, 2.5],
      color: ORANGE,
      path: [
        [3, 7.8, -71],
        [0, 9.8, -74],
        [-3, 7.8, -71],
      ],
      speed: 2.2,
    },
    { type: "platform", pos: [0, 9.6, -79], size: [4, 0.4, 4], color: STEEL },
    { type: "checkpoint", pos: [1.3, 9.8, -79] },
    { type: "coin", pos: [0, 10.7, -79] },

    // Final sprint: conveyor against you under one last hammer.
    { type: "conveyor", pos: [0, 9.6, -86], size: [3, 0.4, 8], dir: [0, 1], speed: 4 },
    { type: "pendulum", pos: [0, 13.9, -86], length: 3.2, period: 2.5 },
    { type: "coin", pos: [0, 10.7, -86] },

    // Factory rooftop.
    { type: "platform", pos: [0, 9.6, -93.5], size: [6, 0.4, 6], color: STEEL },
    { type: "coin", pos: [-2, 10.7, -92.5] },
    { type: "coin", pos: [2, 10.7, -92.5] },
    { type: "trophy", pos: [0, 9.8, -94] },
  ],
};
