/**
 * Falling tile — stand on it and it shudders, then drops away (carrying you
 * with it if you don't jump!), then respawns. The solid follows the falling
 * mesh via the delta so riding it down feels real.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece, type PieceHost } from "../types";

const SHAKE_SECONDS = 0.5;
const FALL_SECONDS = 1.1;
const GONE_SECONDS = 2.2;
const FALL_ACCEL = 14;

type State = "solid" | "shaking" | "falling" | "gone";

export class FallingTile implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly material: MeshLambertMaterial;
  private readonly solid: Box;
  private readonly delta: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly home: [number, number, number];
  private state: State = "solid";
  private timer = 0;
  private fallSpeed = 0;

  constructor(pos: [number, number, number], size: [number, number, number] = [2, 0.4, 2]) {
    this.home = pos;
    this.material = new MeshLambertMaterial({ color: 0xd7c9a8, transparent: true });
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
    this.delta.y = 0;
    if (this.state === "shaking") {
      this.timer -= dt;
      this.mesh.position.x = this.home[0] + (Math.random() - 0.5) * 0.07;
      this.mesh.position.z = this.home[2] + (Math.random() - 0.5) * 0.07;
      if (this.timer <= 0) {
        this.state = "falling";
        this.timer = FALL_SECONDS;
        this.fallSpeed = 0;
        this.mesh.position.x = this.home[0];
        this.mesh.position.z = this.home[2];
      }
    } else if (this.state === "falling") {
      this.timer -= dt;
      this.fallSpeed += FALL_ACCEL * dt;
      const dy = -this.fallSpeed * dt;
      this.solid.cy += dy;
      this.delta.y = dy;
      this.mesh.position.y = this.solid.cy;
      this.material.opacity = Math.max(0.2, this.timer / FALL_SECONDS);
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
    deltas.push(this.state === "falling" ? this.delta : (ZERO_DELTA as Vec3));
    owners.push(this);
  }

  private restore(): void {
    this.state = "solid";
    this.mesh.visible = true;
    this.mesh.position.set(...this.home);
    this.solid.cy = this.home[1];
    this.material.opacity = 1;
    this.fallSpeed = 0;
    this.delta.y = 0;
  }

  reset(): void {
    this.restore();
  }
}
