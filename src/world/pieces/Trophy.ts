/**
 * Summit trophy — a spinning golden gem on a pedestal. Touching it completes
 * the course.
 */

import { CylinderGeometry, Group, Mesh, MeshLambertMaterial, OctahedronGeometry } from "three";
import { boxesOverlap, type Box } from "../physics";
import type { Piece, PieceHost } from "../types";

export class Trophy implements Piece {
  readonly group = new Group();
  private readonly gem: Mesh;
  private readonly trigger: Box;
  private readonly baseY: number;
  private claimed = false;
  private t = 0;

  constructor(pos: [number, number, number]) {
    const pedestal = new Mesh(
      new CylinderGeometry(0.7, 0.9, 0.8, 12),
      new MeshLambertMaterial({ color: 0xd8dee9 }),
    );
    pedestal.position.set(pos[0], pos[1] + 0.4, pos[2]);
    this.baseY = pos[1] + 1.6;
    this.gem = new Mesh(
      new OctahedronGeometry(0.65),
      new MeshLambertMaterial({ color: 0xffd640, emissive: 0xa8820a }),
    );
    this.gem.position.set(pos[0], this.baseY, pos[2]);
    this.group.add(pedestal, this.gem);
    this.trigger = { cx: pos[0], cy: pos[1] + 1.4, cz: pos[2], hx: 1.4, hy: 1.6, hz: 1.4 };
  }

  update(dt: number): void {
    this.t += dt;
    this.gem.rotation.y = this.t * 2;
    this.gem.position.y = this.baseY + Math.sin(this.t * 2.4) * 0.15;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (this.claimed || !boxesOverlap(playerBox as Box, this.trigger)) return;
    this.claimed = true;
    host.completeCourse();
  }

  reset(): void {
    this.claimed = false;
  }
}
