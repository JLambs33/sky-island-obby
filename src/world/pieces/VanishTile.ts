/**
 * Disappearing tile — solid until stood on, then it shakes briefly, vanishes,
 * and respawns a moment later. Classic hard-obby piece.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece, type PieceHost } from "../types";

const SHAKE_SECONDS = 0.7;
const GONE_SECONDS = 2.2;

type State = "solid" | "shaking" | "gone";

export class VanishTile implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly material: MeshLambertMaterial;
  private readonly solid: Box;
  private readonly home: [number, number, number];
  private state: State = "solid";
  private timer = 0;

  constructor(pos: [number, number, number], size: [number, number, number] = [2, 0.4, 2]) {
    this.home = pos;
    this.material = new MeshLambertMaterial({ color: 0xe8e2f7, transparent: true });
    this.mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), this.material);
    this.mesh.position.set(...pos);
    this.group.add(this.mesh);
    this.solid = {
      cx: pos[0],
      cy: pos[1],
      cz: pos[2],
      hx: size[0] / 2,
      hy: size[1] / 2,
      hz: size[2] / 2,
    };
  }

  onStand(_host: PieceHost): void {
    if (this.state === "solid") {
      this.state = "shaking";
      this.timer = SHAKE_SECONDS;
    }
  }

  update(dt: number): void {
    if (this.state === "shaking") {
      this.timer -= dt;
      this.mesh.position.x = this.home[0] + (Math.random() - 0.5) * 0.08;
      this.mesh.position.z = this.home[2] + (Math.random() - 0.5) * 0.08;
      this.material.color.setHex(0xf7b2a8);
      if (this.timer <= 0) {
        this.state = "gone";
        this.timer = GONE_SECONDS;
        this.mesh.visible = false;
      }
    } else if (this.state === "gone") {
      this.timer -= dt;
      if (this.timer <= 0) this.restore();
    }
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    if (this.state === "gone") return;
    solids.push(this.solid);
    deltas.push(ZERO_DELTA as Vec3);
    owners.push(this);
  }

  private restore(): void {
    this.state = "solid";
    this.mesh.visible = true;
    this.mesh.position.set(...this.home);
    this.material.color.setHex(0xe8e2f7);
    this.material.opacity = 1;
  }

  reset(): void {
    this.restore();
  }
}
