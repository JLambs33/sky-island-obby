/**
 * Collectible coin — spins and bobs; disappears for the rest of the run when
 * touched (coins are banked instantly, so dying never takes them back).
 */

import { CylinderGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { boxesOverlap, type Box, type Vec3 } from "../physics";
import type { Piece, PieceHost } from "../types";

export class Coin implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly trigger: Box;
  private readonly pos: Vec3;
  private collected = false;
  private t = Math.random() * Math.PI * 2;

  constructor(pos: [number, number, number]) {
    // Coins sit `pos` at their center, usually ~0.9 above a platform top.
    this.pos = { x: pos[0], y: pos[1], z: pos[2] };
    this.mesh = new Mesh(
      new CylinderGeometry(0.42, 0.42, 0.1, 18),
      new MeshLambertMaterial({ color: 0xffd640, emissive: 0x8a6d00 }),
    );
    this.mesh.rotation.z = Math.PI / 2; // vertical disc
    this.mesh.position.set(...pos);
    this.group.add(this.mesh);
    this.trigger = { cx: pos[0], cy: pos[1], cz: pos[2], hx: 0.8, hy: 0.9, hz: 0.8 };
  }

  update(dt: number): void {
    if (this.collected) return;
    this.t += dt;
    this.mesh.rotation.y = this.t * 3;
    this.mesh.position.y = this.pos.y + Math.sin(this.t * 2) * 0.12;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (this.collected || !boxesOverlap(playerBox as Box, this.trigger)) return;
    this.collected = true;
    this.mesh.visible = false;
    host.collectCoin(this.pos);
  }

  reset(): void {
    this.collected = false;
    this.mesh.visible = true;
  }
}
