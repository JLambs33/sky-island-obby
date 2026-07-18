/**
 * Cosmetics catalog + blocky avatar builder. Everything is procedural three.js
 * primitives — no external assets. Skins recolor the body parts, hats attach
 * to the head, trails are particle color sets (rendered by Trail.ts).
 *
 * The avatar is Roblox-proportioned boxes with limb groups pivoted at the
 * shoulder/hip so Player.ts can swing them while running. Group origin is at
 * the feet; total height ≈ 2.2 (matches the player collider).
 */

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  Object3D,
} from "three";

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  head: number;
  torso: number;
  arms: number;
  legs: number;
}

export interface HatDef {
  id: string;
  name: string;
  price: number;
  /** Swatch color for the shop UI. */
  color: number;
  build(): Object3D;
}

export interface TrailDef {
  id: string;
  name: string;
  price: number;
  colors: number[];
}

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic", price: 0, head: 0xffddb0, torso: 0xe84c3c, arms: 0xffddb0, legs: 0x2f4f8f },
  { id: "ocean", name: "Ocean Hero", price: 25, head: 0xffddb0, torso: 0x1abc9c, arms: 0x14856d, legs: 0x0e3a5d },
  { id: "forest", name: "Forest Scout", price: 50, head: 0xffddb0, torso: 0x58c04d, arms: 0x3d8a36, legs: 0x5b4326 },
  { id: "bubblegum", name: "Bubblegum", price: 80, head: 0xffe4c9, torso: 0xff6fae, arms: 0xff9ecb, legs: 0xb04a8f },
  { id: "midnight", name: "Midnight Ninja", price: 150, head: 0xd9c9ff, torso: 0x2c2440, arms: 0x413566, legs: 0x1a1530 },
  { id: "robot", name: "Robo-Kid", price: 250, head: 0xc0c8d0, torso: 0x7f8c9b, arms: 0x5d6a77, legs: 0x3e4750 },
  { id: "golden", name: "Golden Champ", price: 500, head: 0xffe08a, torso: 0xf1b90c, arms: 0xd9a509, legs: 0xb8860b },
];

const lambert = (color: number) => new MeshLambertMaterial({ color });

function buildCap(): Object3D {
  const g = new Group();
  const top = new Mesh(new BoxGeometry(0.66, 0.22, 0.66), lambert(0xe8432c));
  top.position.y = 0.11;
  const brim = new Mesh(new BoxGeometry(0.6, 0.06, 0.35), lambert(0xb53220));
  brim.position.set(0, 0.02, 0.44);
  g.add(top, brim);
  return g;
}

function buildPartyHat(): Object3D {
  const cone = new Mesh(new ConeGeometry(0.28, 0.62, 12), lambert(0x2bb3f3));
  cone.position.y = 0.31;
  const pom = new Mesh(new BoxGeometry(0.14, 0.14, 0.14), lambert(0xffd640));
  pom.position.y = 0.64;
  const g = new Group();
  g.add(cone, pom);
  return g;
}

function buildWizardHat(): Object3D {
  const g = new Group();
  const brim = new Mesh(new CylinderGeometry(0.52, 0.52, 0.06, 16), lambert(0x5b2f91));
  brim.position.y = 0.03;
  const cone = new Mesh(new ConeGeometry(0.3, 0.7, 12), lambert(0x7a3fc1));
  cone.position.y = 0.4;
  g.add(brim, cone);
  return g;
}

function buildCrown(): Object3D {
  const g = new Group();
  const band = new Mesh(new CylinderGeometry(0.34, 0.34, 0.18, 8), lambert(0xf1b90c));
  band.position.y = 0.09;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = new Mesh(new ConeGeometry(0.09, 0.22, 4), lambert(0xffd640));
    spike.position.set(Math.sin(a) * 0.3, 0.26, Math.cos(a) * 0.3);
    g.add(spike);
  }
  g.add(band);
  return g;
}

export const HATS: HatDef[] = [
  { id: "cap", name: "Cool Cap", price: 40, color: 0xe8432c, build: buildCap },
  { id: "party", name: "Party Hat", price: 80, color: 0x2bb3f3, build: buildPartyHat },
  { id: "wizard", name: "Wizard Hat", price: 150, color: 0x7a3fc1, build: buildWizardHat },
  { id: "crown", name: "Royal Crown", price: 400, color: 0xf1b90c, build: buildCrown },
];

export const TRAILS: TrailDef[] = [
  { id: "sparkle", name: "Sparkles", price: 60, colors: [0xfff7c9, 0xffe95e, 0xffffff] },
  { id: "fire", name: "Fire Trail", price: 120, colors: [0xff5722, 0xffa000, 0xffd640] },
  { id: "rainbow", name: "Rainbow", price: 250, colors: [0xff5b5b, 0xffb040, 0xfff05e, 0x5ee87a, 0x53b9ff, 0xb46fff] },
];

export const skinById = (id: string): SkinDef => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const hatById = (id: string | null): HatDef | null => HATS.find((h) => h.id === id) ?? null;
export const trailById = (id: string | null): TrailDef | null => TRAILS.find((t) => t.id === id) ?? null;

export interface AvatarRig {
  group: Group;
  leftArm: Group;
  rightArm: Group;
  leftLeg: Group;
  rightLeg: Group;
  head: Group;
}

/** Limb helper: a group pivoted at the joint with the box hanging below it. */
function limb(width: number, length: number, depth: number, color: number): Group {
  const g = new Group();
  const mesh = new Mesh(new BoxGeometry(width, length, depth), lambert(color));
  mesh.position.y = -length / 2;
  g.add(mesh);
  return g;
}

export function buildAvatar(skinId: string, hatId: string | null): AvatarRig {
  const skin = skinById(skinId);
  const group = new Group();

  const leftLeg = limb(0.3, 0.8, 0.3, skin.legs);
  leftLeg.position.set(-0.18, 0.8, 0);
  const rightLeg = limb(0.3, 0.8, 0.3, skin.legs);
  rightLeg.position.set(0.18, 0.8, 0);

  const torso = new Mesh(new BoxGeometry(0.7, 0.8, 0.4), lambert(skin.torso));
  torso.position.y = 1.2;

  const leftArm = limb(0.24, 0.78, 0.24, skin.arms);
  leftArm.position.set(-0.48, 1.58, 0);
  const rightArm = limb(0.24, 0.78, 0.24, skin.arms);
  rightArm.position.set(0.48, 1.58, 0);

  const head = new Group();
  head.position.y = 1.9;
  const skull = new Mesh(new BoxGeometry(0.6, 0.55, 0.6), lambert(skin.head));
  head.add(skull);
  // Face (+z is forward).
  const eyeMat = lambert(0x2b2b2b);
  for (const x of [-0.13, 0.13]) {
    const eye = new Mesh(new BoxGeometry(0.09, 0.13, 0.02), eyeMat);
    eye.position.set(x, 0.06, 0.305);
    head.add(eye);
  }
  const smile = new Mesh(new BoxGeometry(0.24, 0.05, 0.02), lambert(0x2b2b2b));
  smile.position.set(0, -0.14, 0.305);
  head.add(smile);

  const hat = hatById(hatId);
  if (hat) {
    const h = hat.build();
    h.position.y = 0.275;
    head.add(h);
  }

  group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head);
  return { group, leftArm, rightArm, leftLeg, rightLeg, head };
}
