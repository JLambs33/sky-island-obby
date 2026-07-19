/**
 * Solid platform — static, ping-ponging between two points on a cosine ease,
 * or looping a waypoint path at constant speed (ferris-style routes). Moving
 * platforms report their per-step delta so the player rides them.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece } from "../types";

export interface PlatformOpts {
  pos: [number, number, number];
  size: [number, number, number];
  color: number;
  /** Ping-pong destination (cosine ease, zero velocity at the ends). */
  moveTo?: [number, number, number];
  period?: number;
  /** Waypoint loop traversed at constant `speed` (pos is the first point). */
  path?: [number, number, number][];
  speed?: number;
}

export class Platform implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly solid: Box;
  private readonly delta: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly opts: PlatformOpts;
  private readonly loop: [number, number, number][] | null;
  private readonly moving: boolean;
  private t = 0;

  constructor(opts: PlatformOpts) {
    this.opts = opts;
    this.loop = opts.path ? [opts.pos, ...opts.path] : null;
    this.moving = Boolean(opts.moveTo || opts.path);
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
    if (!this.moving) return;
    this.t += dt;

    let nx: number;
    let ny: number;
    let nz: number;
    if (this.loop) {
      [nx, ny, nz] = this.pointOnLoop(this.t * (this.opts.speed ?? 2));
    } else {
      const from = this.opts.pos;
      const to = this.opts.moveTo!;
      // 0→1→0 ping-pong with zero velocity at the ends.
      const f = (1 - Math.cos((this.t / (this.opts.period ?? 4)) * Math.PI * 2)) / 2;
      nx = from[0] + (to[0] - from[0]) * f;
      ny = from[1] + (to[1] - from[1]) * f;
      nz = from[2] + (to[2] - from[2]) * f;
    }

    this.delta.x = nx - this.solid.cx;
    this.delta.y = ny - this.solid.cy;
    this.delta.z = nz - this.solid.cz;
    this.solid.cx = nx;
    this.solid.cy = ny;
    this.solid.cz = nz;
    this.mesh.position.set(nx, ny, nz);
  }

  /** Constant-speed position along the closed waypoint loop. */
  private pointOnLoop(dist: number): [number, number, number] {
    const pts = this.loop!;
    const n = pts.length;
    const lens: number[] = [];
    let total = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      lens.push(l);
      total += l;
    }
    let d = dist % total;
    for (let i = 0; i < n; i++) {
      if (d <= lens[i] || i === n - 1) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        const f = lens[i] > 0 ? d / lens[i] : 0;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      }
      d -= lens[i];
    }
    return pts[0];
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(this.moving ? this.delta : (ZERO_DELTA as Vec3));
    owners.push(null);
  }

  reset(): void {
    this.t = 0;
    this.delta.x = this.delta.y = this.delta.z = 0;
    this.solid.cx = this.opts.pos[0];
    this.solid.cy = this.opts.pos[1];
    this.solid.cz = this.opts.pos[2];
    this.mesh.position.set(...this.opts.pos);
  }
}
