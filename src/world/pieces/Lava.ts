/**
 * Lava brick — glowing kill zone. Not solid: overlapping it sends the player
 * back to the last checkpoint. The trigger volume is slightly smaller than
 * the visual so near-misses feel fair to kids.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { boxesOverlap, type Box } from "../physics";
import type { Piece, PieceHost } from "../types";

const TRIGGER_INSET = 0.15;

export class Lava implements Piece {
  readonly group = new Group();
  private readonly material: MeshLambertMaterial;
  private readonly trigger: Box;
  private t = Math.random() * Math.PI * 2;

  constructor(pos: [number, number, number], size: [number, number, number]) {
    this.material = new MeshLambertMaterial({ color: 0xff5722, emissive: 0xc23616 });
    const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), this.material);
    mesh.position.set(...pos);
    this.group.add(mesh);
    this.trigger = {
      cx: pos[0],
      cy: pos[1],
      cz: pos[2],
      hx: Math.max(0.1, size[0] / 2 - TRIGGER_INSET),
      hy: Math.max(0.1, size[1] / 2 - TRIGGER_INSET),
      hz: Math.max(0.1, size[2] / 2 - TRIGGER_INSET),
    };
  }

  update(dt: number): void {
    this.t += dt;
    this.material.emissiveIntensity = 0.8 + Math.sin(this.t * 4) * 0.25;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (boxesOverlap(playerBox as Box, this.trigger)) host.kill();
  }

  reset(): void {}
}
