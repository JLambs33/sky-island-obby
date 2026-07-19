/**
 * Conveyor belt — a solid that drags whoever stands on it sideways. The
 * moving-stripe visual is child boxes sliding along the belt and wrapping.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece, type PieceHost } from "../types";

export class Conveyor implements Piece {
  readonly group = new Group();
  private readonly solid: Box;
  private readonly stripes: Mesh[] = [];
  private readonly dirX: number;
  private readonly dirZ: number;
  private readonly length: number;
  private travel = 0;

  constructor(
    pos: [number, number, number],
    size: [number, number, number],
    dir: [number, number],
    private readonly speed = 3.5,
  ) {
    const len = Math.hypot(dir[0], dir[1]) || 1;
    this.dirX = dir[0] / len;
    this.dirZ = dir[1] / len;
    this.length = Math.abs(this.dirX) > Math.abs(this.dirZ) ? size[0] : size[2];

    const belt = new Mesh(
      new BoxGeometry(size[0], size[1], size[2]),
      new MeshLambertMaterial({ color: 0x3a3f4a }),
    );
    belt.position.set(...pos);
    this.group.add(belt);

    // Stripes ride 2cm above the belt surface and wrap around.
    const stripeMat = new MeshLambertMaterial({ color: 0xffd640 });
    const across = this.length === size[0] ? size[2] : size[0];
    const count = Math.max(2, Math.floor(this.length / 1.5));
    for (let i = 0; i < count; i++) {
      const stripe = new Mesh(
        new BoxGeometry(
          Math.abs(this.dirX) > 0 ? 0.25 : across * 0.8,
          0.04,
          Math.abs(this.dirZ) > 0 ? 0.25 : across * 0.8,
        ),
        stripeMat,
      );
      stripe.position.set(pos[0], pos[1] + size[1] / 2 + 0.02, pos[2]);
      this.stripes.push(stripe);
      this.group.add(stripe);
    }

    this.solid = {
      cx: pos[0],
      cy: pos[1],
      cz: pos[2],
      hx: size[0] / 2,
      hy: size[1] / 2,
      hz: size[2] / 2,
    };
  }

  update(dt: number): void {
    this.travel = (this.travel + this.speed * dt) % this.length;
    const n = this.stripes.length;
    for (let i = 0; i < n; i++) {
      // Offset along the belt in [-length/2, length/2), wrapping.
      let d = ((i / n) * this.length + this.travel) % this.length;
      d -= this.length / 2;
      this.stripes[i].position.x = this.solid.cx + this.dirX * d;
      this.stripes[i].position.z = this.solid.cz + this.dirZ * d;
    }
  }

  onStand(host: PieceHost): void {
    host.push(this.dirX * this.speed, this.dirZ * this.speed);
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(ZERO_DELTA as Vec3);
    owners.push(this);
  }

  reset(): void {
    this.travel = 0;
  }
}
