/**
 * Cosmetic aura — a ring of particles orbiting the player's feet. Same
 * additive-points technique as Trail (fade = color→black), allocation-free
 * per frame.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from "three";
import type { AuraDef } from "./cosmetics";

const COUNT = 20;
const RADIUS = 0.85;
const HIDDEN_Y = -9999;

export class Aura {
  readonly points: Points;
  private readonly positions = new Float32Array(COUNT * 3);
  private readonly colors = new Float32Array(COUNT * 3);
  private readonly geometry = new BufferGeometry();
  private def: AuraDef | null = null;
  private t = 0;
  private readonly tmpColor = new Color();

  constructor() {
    this.positions.fill(HIDDEN_Y);
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(this.colors, 3));
    this.points = new Points(
      this.geometry,
      new PointsMaterial({
        size: 0.16,
        vertexColors: true,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    this.points.frustumCulled = false;
  }

  setDef(def: AuraDef | null): void {
    this.def = def;
    if (!def) {
      this.positions.fill(HIDDEN_Y);
      this.geometry.attributes.position.needsUpdate = true;
      return;
    }
    for (let i = 0; i < COUNT; i++) {
      this.tmpColor.set(def.colors[i % def.colors.length]);
      this.colors[i * 3] = this.tmpColor.r;
      this.colors[i * 3 + 1] = this.tmpColor.g;
      this.colors[i * 3 + 2] = this.tmpColor.b;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  /** Call once per fixed step with the player's feet position. */
  update(dt: number, x: number, y: number, z: number): void {
    if (!this.def) return;
    this.t += dt;
    for (let i = 0; i < COUNT; i++) {
      const a = this.t * 1.6 + (i / COUNT) * Math.PI * 2;
      this.positions[i * 3] = x + Math.cos(a) * RADIUS;
      this.positions[i * 3 + 1] = y + 0.25 + Math.sin(this.t * 3 + i * 1.7) * 0.18;
      this.positions[i * 3 + 2] = z + Math.sin(a) * RADIUS;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
