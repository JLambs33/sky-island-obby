/**
 * Teleporter pad — step on the glowing ring and appear at the destination.
 * One-way; place two facing each other for a two-way pair. A short cooldown
 * stops double-fires on the arrival frames.
 */

import { CylinderGeometry, Group, Mesh, MeshLambertMaterial, TorusGeometry } from "three";
import { boxesOverlap, type Box } from "../physics";
import type { Piece, PieceHost } from "../types";

export class Teleporter implements Piece {
  readonly group = new Group();
  private readonly trigger: Box;
  private readonly ring: Mesh;
  private cooldown = 0;
  private t = 0;

  constructor(
    pos: [number, number, number],
    private readonly dest: [number, number, number],
    color = 0xb46fff,
  ) {
    const disc = new Mesh(
      new CylinderGeometry(0.9, 1.0, 0.12, 20),
      new MeshLambertMaterial({ color: 0x2c2440 }),
    );
    disc.position.set(pos[0], pos[1] + 0.06, pos[2]);
    this.ring = new Mesh(
      new TorusGeometry(0.75, 0.09, 10, 24),
      new MeshLambertMaterial({ color, emissive: color }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(pos[0], pos[1] + 0.2, pos[2]);
    this.group.add(disc, this.ring);

    this.trigger = { cx: pos[0], cy: pos[1] + 0.7, cz: pos[2], hx: 0.8, hy: 0.7, hz: 0.8 };
  }

  update(dt: number): void {
    this.t += dt;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.ring.position.y = this.trigger.cy - 0.5 + Math.sin(this.t * 3) * 0.08;
    this.ring.rotation.z = this.t * 1.5;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (this.cooldown > 0 || !boxesOverlap(playerBox as Box, this.trigger)) return;
    this.cooldown = 1.0;
    host.teleportPlayer(this.dest[0], this.dest[1], this.dest[2]);
  }

  reset(): void {
    this.cooldown = 0;
  }
}
