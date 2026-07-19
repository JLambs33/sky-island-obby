/**
 * Lava brick — glowing kill zone. Not solid: overlapping it sends the player
 * back to the last checkpoint. The trigger volume is slightly smaller than
 * the visual so near-misses feel fair to kids. Optionally ping-pongs between
 * two points (rising lava, sweeping lava blades).
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { boxesOverlap, type Box } from "../physics";
import type { Piece, PieceHost } from "../types";

const TRIGGER_INSET = 0.15;

export class Lava implements Piece {
  readonly group = new Group();
  private readonly mesh: Mesh;
  private readonly material: MeshLambertMaterial;
  private readonly trigger: Box;
  private readonly home: [number, number, number];
  private t = Math.random() * Math.PI * 2;
  private moveT = 0;

  constructor(
    pos: [number, number, number],
    size: [number, number, number],
    private readonly moveTo?: [number, number, number],
    private readonly period = 4,
  ) {
    this.home = pos;
    this.material = new MeshLambertMaterial({ color: 0xff5722, emissive: 0xc23616 });
    this.mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]), this.material);
    this.mesh.position.set(...pos);
    this.group.add(this.mesh);
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
    if (this.moveTo) {
      this.moveT += dt;
      const f = (1 - Math.cos((this.moveT / this.period) * Math.PI * 2)) / 2;
      this.trigger.cx = this.home[0] + (this.moveTo[0] - this.home[0]) * f;
      this.trigger.cy = this.home[1] + (this.moveTo[1] - this.home[1]) * f;
      this.trigger.cz = this.home[2] + (this.moveTo[2] - this.home[2]) * f;
      this.mesh.position.set(this.trigger.cx, this.trigger.cy, this.trigger.cz);
    }
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    if (boxesOverlap(playerBox as Box, this.trigger)) host.kill();
  }

  reset(): void {
    this.moveT = 0;
    if (this.moveTo) {
      this.trigger.cx = this.home[0];
      this.trigger.cy = this.home[1];
      this.trigger.cz = this.home[2];
      this.mesh.position.set(...this.home);
    }
  }
}
