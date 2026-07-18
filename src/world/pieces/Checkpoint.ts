/**
 * Checkpoint flag — walking near it saves the respawn point. The flag turns
 * from gray to green and waves once activated.
 */

import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { boxesOverlap, type Box, type Vec3 } from "../physics";
import type { Piece, PieceHost } from "../types";

export class Checkpoint implements Piece {
  readonly group = new Group();
  private readonly flagMaterial: MeshLambertMaterial;
  private readonly flag: Mesh;
  private readonly trigger: Box;
  private readonly spawn: Vec3;
  private activated = false;
  private t = 0;

  constructor(pos: [number, number, number]) {
    this.spawn = { x: pos[0], y: pos[1], z: pos[2] };

    const base = new Mesh(
      new CylinderGeometry(0.4, 0.5, 0.2, 12),
      new MeshLambertMaterial({ color: 0x8d99ae }),
    );
    base.position.set(pos[0], pos[1] + 0.1, pos[2]);
    const pole = new Mesh(
      new CylinderGeometry(0.07, 0.07, 2.4, 8),
      new MeshLambertMaterial({ color: 0xd8dee9 }),
    );
    pole.position.set(pos[0], pos[1] + 1.3, pos[2]);
    this.flagMaterial = new MeshLambertMaterial({ color: 0x9aa5b1 });
    this.flag = new Mesh(new BoxGeometry(0.75, 0.5, 0.06), this.flagMaterial);
    this.flag.position.set(pos[0] + 0.42, pos[1] + 2.2, pos[2]);
    this.group.add(base, pole, this.flag);

    this.trigger = { cx: pos[0], cy: pos[1] + 1.2, cz: pos[2], hx: 1.7, hy: 1.6, hz: 1.7 };
  }

  update(dt: number): void {
    if (!this.activated) return;
    this.t += dt;
    this.flag.rotation.y = Math.sin(this.t * 6) * 0.25;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (this.activated || !boxesOverlap(playerBox as Box, this.trigger)) return;
    this.activated = true;
    this.flagMaterial.color.setHex(0x43c465);
    this.flagMaterial.emissive.setHex(0x1d7a35);
    host.reachCheckpoint(this.spawn);
  }

  reset(): void {
    this.activated = false;
    this.t = 0;
    this.flag.rotation.y = 0;
    this.flagMaterial.color.setHex(0x9aa5b1);
    this.flagMaterial.emissive.setHex(0x000000);
  }
}
