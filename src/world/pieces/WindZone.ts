/**
 * Wind zone — an updraft column. While the player is inside, they're lifted
 * toward the zone's strength; ride it up to higher platforms. Visual is a
 * column of rising particles.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  PointsMaterial,
} from "three";
import { boxesOverlap, type Box } from "../physics";
import type { Piece, PieceHost } from "../types";

const PARTICLES = 26;

export class WindZone implements Piece {
  readonly group = new Group();
  private readonly zone: Box;
  private readonly positions: Float32Array;
  private readonly speeds: Float32Array;
  private readonly geometry = new BufferGeometry();

  constructor(
    pos: [number, number, number],
    size: [number, number, number],
    private readonly strength = 9,
  ) {
    this.zone = {
      cx: pos[0],
      cy: pos[1],
      cz: pos[2],
      hx: size[0] / 2,
      hy: size[1] / 2,
      hz: size[2] / 2,
    };

    this.positions = new Float32Array(PARTICLES * 3);
    this.speeds = new Float32Array(PARTICLES);
    const colors = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      this.positions[i * 3] = pos[0] + (Math.random() - 0.5) * size[0] * 0.9;
      this.positions[i * 3 + 1] = pos[1] - size[1] / 2 + Math.random() * size[1];
      this.positions[i * 3 + 2] = pos[2] + (Math.random() - 0.5) * size[2] * 0.9;
      this.speeds[i] = 2 + Math.random() * 3;
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = 0.55 + Math.random() * 0.3;
    }
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(colors, 3));
    const points = new Points(
      this.geometry,
      new PointsMaterial({
        size: 0.14,
        vertexColors: true,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.7,
      }),
    );
    points.frustumCulled = false;
    this.group.add(points);
  }

  update(dt: number): void {
    const top = this.zone.cy + this.zone.hy;
    const bottom = this.zone.cy - this.zone.hy;
    for (let i = 0; i < PARTICLES; i++) {
      this.positions[i * 3 + 1] += this.speeds[i] * dt;
      if (this.positions[i * 3 + 1] > top) this.positions[i * 3 + 1] = bottom;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (boxesOverlap(playerBox as Box, this.zone)) host.updraft(this.strength);
  }

  reset(): void {}
}
