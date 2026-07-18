/**
 * Shared sky: background + fog, lights, a sun, and slow-drifting blocky
 * clouds. Lives in the scene permanently; worlds are swapped beneath it.
 */

import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
} from "three";

const SKY_COLOR = 0x9fd9ff;
const WRAP = 90;

interface Cloud {
  group: Group;
  speed: number;
}

export class Environment {
  readonly group = new Group();
  private readonly clouds: Cloud[] = [];

  constructor(scene: Scene) {
    scene.background = new Color(SKY_COLOR);
    scene.fog = new Fog(SKY_COLOR, 70, 160);

    const hemi = new HemisphereLight(0xdff2ff, 0x8a7a5a, 1.05);
    const sunLight = new DirectionalLight(0xfff4d6, 1.15);
    sunLight.position.set(30, 50, 20);
    this.group.add(hemi, sunLight);

    const sun = new Mesh(new SphereGeometry(5, 16, 16), new MeshBasicMaterial({ color: 0xffe97a }));
    sun.position.set(55, 60, -80);
    this.group.add(sun);

    // Unlit so clouds stay bright white instead of shading gray underneath.
    const cloudMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 12; i++) {
      const cluster = new Group();
      const puffs = 2 + Math.floor(Math.random() * 2);
      for (let p = 0; p < puffs; p++) {
        const w = 2.5 + Math.random() * 3;
        const puff = new Mesh(new BoxGeometry(w, 1 + Math.random(), 2 + Math.random() * 2), cloudMaterial);
        puff.position.set(p * 1.8 - puffs, Math.random() * 0.6, Math.random() * 1.5);
        cluster.add(puff);
      }
      cluster.position.set(
        (Math.random() - 0.5) * 2 * WRAP,
        9 + Math.random() * 18,
        -Math.random() * 100 + 10,
      );
      this.group.add(cluster);
      this.clouds.push({ group: cluster, speed: 0.4 + Math.random() * 0.8 });
    }

    scene.add(this.group);
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.group.position.x += c.speed * dt;
      if (c.group.position.x > WRAP) c.group.position.x = -WRAP;
    }
  }
}
