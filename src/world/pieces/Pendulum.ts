/**
 * Pendulum — a wrecking ball swinging under a pivot; touching the arm or
 * ball sends the player back to the checkpoint. Swings across the course
 * (X axis) by default so the player times a run/jump underneath it.
 */

import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial, SphereGeometry } from "three";
import type { Box } from "../physics";
import type { Piece, PieceHost } from "../types";

const ARM_HALF = 0.12;
const BALL_RADIUS = 0.55;
const SAMPLE_SPACING = 0.45;

export class Pendulum implements Piece {
  readonly group = new Group();
  private readonly swingGroup = new Group();
  private t = 0;
  private angle = 0;

  constructor(
    private readonly pivot: [number, number, number],
    private readonly length = 3.2,
    private readonly period = 2.6,
    private readonly maxAngle = 1.0,
  ) {
    const mount = new Mesh(
      new BoxGeometry(0.6, 0.3, 0.6),
      new MeshLambertMaterial({ color: 0x3d4b5c }),
    );
    mount.position.set(...pivot);

    const arm = new Mesh(
      new CylinderGeometry(ARM_HALF, ARM_HALF, length, 8),
      new MeshLambertMaterial({ color: 0x8d99ae }),
    );
    arm.position.y = -length / 2;
    const ball = new Mesh(
      new SphereGeometry(BALL_RADIUS, 12, 12),
      new MeshLambertMaterial({ color: 0xe8432c, emissive: 0x5e150c }),
    );
    ball.position.y = -length;
    this.swingGroup.position.set(...pivot);
    this.swingGroup.add(arm, ball);
    this.group.add(mount, this.swingGroup);
  }

  update(dt: number): void {
    this.t += dt;
    this.angle = Math.sin((this.t / this.period) * Math.PI * 2) * this.maxAngle;
    this.swingGroup.rotation.z = this.angle;
  }

  collectSolids(): void {}

  checkTrigger(playerBox: Readonly<Box>, host: PieceHost): void {
    // Sample along the swinging arm; rotation about Z maps local -Y to
    // (sin a, -cos a) in the XY plane.
    const dx = Math.sin(this.angle);
    const dy = -Math.cos(this.angle);
    for (let d = BALL_RADIUS; d <= this.length; d += SAMPLE_SPACING) {
      const x = this.pivot[0] + dx * d;
      const y = this.pivot[1] + dy * d;
      const pad = d > this.length - BALL_RADIUS * 2 ? BALL_RADIUS : ARM_HALF;
      if (
        Math.abs(x - playerBox.cx) < playerBox.hx + pad &&
        Math.abs(y - playerBox.cy) < playerBox.hy + pad &&
        Math.abs(this.pivot[2] - playerBox.cz) < playerBox.hz + pad
      ) {
        host.kill();
        return;
      }
    }
  }

  reset(): void {
    this.t = 0;
    this.angle = 0;
    this.swingGroup.rotation.z = 0;
  }
}
