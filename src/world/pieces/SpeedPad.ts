/**
 * Speed pad — stepping on it grants a temporary run-speed boost. Chevron
 * arrows on the pad pulse to sell the effect.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece, type PieceHost } from "../types";

export class SpeedPad implements Piece {
  readonly group = new Group();
  private readonly solid: Box;
  private readonly chevronMat: MeshLambertMaterial;
  private t = 0;

  constructor(pos: [number, number, number]) {
    const pad = new Mesh(
      new BoxGeometry(1.8, 0.15, 1.8),
      new MeshLambertMaterial({ color: 0x2bb3f3 }),
    );
    pad.position.set(pos[0], pos[1] + 0.075, pos[2]);
    this.group.add(pad);

    this.chevronMat = new MeshLambertMaterial({ color: 0xffffff, emissive: 0x3a86b0 });
    for (const dz of [-0.45, 0, 0.45]) {
      for (const side of [-1, 1]) {
        const bar = new Mesh(new BoxGeometry(0.55, 0.04, 0.14), this.chevronMat);
        bar.position.set(pos[0] + side * 0.22, pos[1] + 0.16, pos[2] + dz + side * 0.11);
        bar.rotation.y = side * 0.7;
        this.group.add(bar);
      }
    }

    this.solid = { cx: pos[0], cy: pos[1] + 0.075, cz: pos[2], hx: 0.9, hy: 0.075, hz: 0.9 };
  }

  update(dt: number): void {
    this.t += dt;
    this.chevronMat.emissiveIntensity = 0.8 + Math.sin(this.t * 6) * 0.5;
  }

  onStand(host: PieceHost): void {
    host.boost(1.65, 2.5);
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(ZERO_DELTA as Vec3);
    owners.push(this);
  }

  reset(): void {}
}
