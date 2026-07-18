/**
 * Cosmetic particle trail behind the player. A fixed-size ring buffer of
 * additive-blended points; "fading" is done by scaling each particle's color
 * toward black as its life runs out (additive black = invisible), so no custom
 * shader is needed. Allocation-free per frame.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from "three";
import type { TrailDef } from "./cosmetics";

const COUNT = 48;
const LIFE = 0.55; // seconds
const HIDDEN_Y = -9999;

export class Trail {
  readonly points: Points;
  private readonly positions = new Float32Array(COUNT * 3);
  private readonly colors = new Float32Array(COUNT * 3);
  private readonly base = new Float32Array(COUNT * 3); // spawn color per particle
  private readonly life = new Float32Array(COUNT);
  private readonly geometry = new BufferGeometry();
  private next = 0;
  private def: TrailDef | null = null;
  private colorCursor = 0;
  private readonly tmpColor = new Color();

  constructor() {
    this.positions.fill(HIDDEN_Y);
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(this.colors, 3));
    const material = new PointsMaterial({
      size: 0.22,
      vertexColors: true,
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    this.points = new Points(this.geometry, material);
    this.points.frustumCulled = false;
  }

  setDef(def: TrailDef | null): void {
    this.def = def;
    if (!def) {
      this.life.fill(0);
      this.positions.fill(HIDDEN_Y);
      this.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Call once per fixed step; emits at (x,y,z) while `emitting`. */
  update(dt: number, x: number, y: number, z: number, emitting: boolean): void {
    if (!this.def && !this.lifeAny()) return;

    if (this.def && emitting) {
      for (let n = 0; n < 2; n++) {
        const i = this.next;
        this.next = (this.next + 1) % COUNT;
        this.life[i] = LIFE;
        this.positions[i * 3] = x + (Math.random() - 0.5) * 0.4;
        this.positions[i * 3 + 1] = y + Math.random() * 0.3;
        this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
        const c = this.def.colors[this.colorCursor % this.def.colors.length];
        this.colorCursor++;
        this.tmpColor.set(c);
        this.base[i * 3] = this.tmpColor.r;
        this.base[i * 3 + 1] = this.tmpColor.g;
        this.base[i * 3 + 2] = this.tmpColor.b;
      }
    }

    for (let i = 0; i < COUNT; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.positions[i * 3 + 1] = HIDDEN_Y;
        this.colors[i * 3] = this.colors[i * 3 + 1] = this.colors[i * 3 + 2] = 0;
        continue;
      }
      const t = this.life[i] / LIFE;
      this.positions[i * 3 + 1] += dt * 0.4; // gentle float upward
      this.colors[i * 3] = this.base[i * 3] * t;
      this.colors[i * 3 + 1] = this.base[i * 3 + 1] * t;
      this.colors[i * 3 + 2] = this.base[i * 3 + 2] * t;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private lifeAny(): boolean {
    for (let i = 0; i < COUNT; i++) if (this.life[i] > 0) return true;
    return false;
  }
}
