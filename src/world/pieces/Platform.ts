/**
 * Solid platform — static, or ping-ponging between two points on a cosine
 * ease (smooth reversal). Moving platforms report their per-step delta so the
 * player rides them.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece } from "../types";

export interface PlatformOpts {
  pos: [number, number, number];
  size: [number, number, number];
  color: number;
  moveTo?: [number, number, number];
  period?: number;
}

export class Platform implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly solid: Box;
  private readonly delta: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly from: [number, number, number];
  private readonly to: [number, number, number] | null;
  private readonly period: number;
  private t = 0;

  constructor(opts: PlatformOpts) {
    this.from = opts.pos;
    this.to = opts.moveTo ?? null;
    this.period = opts.period ?? 4;
    this.mesh = new Mesh(
      new BoxGeometry(opts.size[0], opts.size[1], opts.size[2]),
      new MeshLambertMaterial({ color: opts.color }),
    );
    this.mesh.position.set(...opts.pos);
    this.group.add(this.mesh);
    this.solid = {
      cx: opts.pos[0],
      cy: opts.pos[1],
      cz: opts.pos[2],
      hx: opts.size[0] / 2,
      hy: opts.size[1] / 2,
      hz: opts.size[2] / 2,
    };
  }

  update(dt: number): void {
    if (!this.to) return;
    this.t += dt;
    // 0→1→0 ping-pong with zero velocity at the ends.
    const f = (1 - Math.cos((this.t / this.period) * Math.PI * 2)) / 2;
    const nx = this.from[0] + (this.to[0] - this.from[0]) * f;
    const ny = this.from[1] + (this.to[1] - this.from[1]) * f;
    const nz = this.from[2] + (this.to[2] - this.from[2]) * f;
    this.delta.x = nx - this.solid.cx;
    this.delta.y = ny - this.solid.cy;
    this.delta.z = nz - this.solid.cz;
    this.solid.cx = nx;
    this.solid.cy = ny;
    this.solid.cz = nz;
    this.mesh.position.set(nx, ny, nz);
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(this.to ? this.delta : (ZERO_DELTA as Vec3));
    owners.push(null);
  }

  reset(): void {
    this.t = 0;
    this.delta.x = this.delta.y = this.delta.z = 0;
    this.solid.cx = this.from[0];
    this.solid.cy = this.from[1];
    this.solid.cz = this.from[2];
    this.mesh.position.set(...this.from);
  }
}
