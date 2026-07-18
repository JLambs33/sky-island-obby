/**
 * Spinner — a rotating sweeper arm the player must jump over. Touching the
 * arm sends the player back to the last checkpoint. Collision is approximated
 * by sampling points along the arm and testing them against the player box
 * expanded by the arm's thickness — plenty accurate at these speeds, and kill
 * detection has no need for exact resolution.
 */

import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box } from "../physics";
import type { Piece, PieceHost } from "../types";

const ARM_HALF = 0.22;
const ARM_HEIGHT = 0.55; // above the base position — jumpable
const SAMPLE_SPACING = 0.4;

export class Spinner implements Piece {
  readonly group = new Group();
  private readonly armGroup = new Group();
  private angle = 0;

  constructor(
    private readonly pos: [number, number, number],
    private readonly radius = 2.6,
    private readonly period = 2.8,
  ) {
    const pillar = new Mesh(
      new CylinderGeometry(0.28, 0.35, 1.1, 12),
      new MeshLambertMaterial({ color: 0x3d4b5c }),
    );
    pillar.position.set(pos[0], pos[1] + 0.55, pos[2]);

    const arm = new Mesh(
      new BoxGeometry(radius * 2, ARM_HALF * 2, ARM_HALF * 2),
      new MeshLambertMaterial({ color: 0xe8432c, emissive: 0x5e150c }),
    );
    this.armGroup.position.set(pos[0], pos[1] + ARM_HEIGHT, pos[2]);
    this.armGroup.add(arm);
    this.group.add(pillar, this.armGroup);
  }

  update(dt: number): void {
    this.angle += ((Math.PI * 2) / this.period) * dt;
    this.armGroup.rotation.y = this.angle;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    // Local +X rotated by rotation.y maps to (cos a, 0, -sin a).
    const dirX = Math.cos(this.angle);
    const dirZ = -Math.sin(this.angle);
    const y = this.pos[1] + ARM_HEIGHT;
    if (Math.abs(y - playerBox.cy) >= playerBox.hy + ARM_HALF) return;
    for (let d = -this.radius; d <= this.radius; d += SAMPLE_SPACING) {
      const x = this.pos[0] + dirX * d;
      const z = this.pos[2] + dirZ * d;
      if (
        Math.abs(x - playerBox.cx) < playerBox.hx + ARM_HALF &&
        Math.abs(z - playerBox.cz) < playerBox.hz + ARM_HALF
      ) {
        host.kill();
        return;
      }
    }
  }

  reset(): void {
    this.angle = 0;
    this.armGroup.rotation.y = 0;
  }
}
