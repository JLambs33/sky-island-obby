/**
 * Third-person drag-to-orbit follow camera — the single camera scheme on all
 * platforms (no pointer lock). Dragging "grabs the world" (OrbitControls
 * convention): drag right orbits the camera left. Position follows the player
 * with exponential smoothing; yaw is also what makes movement camera-relative
 * (Player reads `yaw`).
 */

import type { PerspectiveCamera } from "three";
import type { Vec2 } from "../input/InputController";
import type { Vec3 } from "./physics";

const DISTANCE = 8.5;
const MIN_PITCH = -0.05;
const MAX_PITCH = 1.25;
const LOOK_HEIGHT = 1.6;

export class FollowCamera {
  yaw = 0;
  pitch = 0.42;

  constructor(private readonly camera: PerspectiveCamera) {}

  /** Jump the camera to a pose instantly (world transitions, respawns). */
  snap(target: Vec3, yaw: number): void {
    this.yaw = yaw;
    this.pitch = 0.42;
    this.place(target, 1);
  }

  update(dt: number, look: Readonly<Vec2>, target: Vec3): void {
    this.yaw -= look.x;
    this.pitch = Math.min(MAX_PITCH, Math.max(MIN_PITCH, this.pitch - look.y));
    this.place(target, 1 - Math.exp(-12 * dt));
  }

  private place(target: Vec3, lerp: number): void {
    const cosP = Math.cos(this.pitch);
    const ox = Math.sin(this.yaw) * DISTANCE * cosP;
    const oz = Math.cos(this.yaw) * DISTANCE * cosP;
    const oy = Math.sin(this.pitch) * DISTANCE + LOOK_HEIGHT;

    const p = this.camera.position;
    p.x += (target.x + ox - p.x) * lerp;
    p.y += (target.y + oy - p.y) * lerp;
    p.z += (target.z + oz - p.z) * lerp;
    this.camera.lookAt(target.x, target.y + LOOK_HEIGHT, target.z);
  }
}
