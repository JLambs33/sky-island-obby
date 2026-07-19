/**
 * Cosmetics catalog + blocky avatar builder. Everything is procedural three.js
 * primitives — no external assets. Skins recolor the body parts, hats attach
 * to the head, faces swap the eye/mouth meshes, trails and auras are particle
 * color sets (rendered by Trail.ts / Aura.ts).
 *
 * Every item has a rarity tier (drives shop card colors and price bands).
 * IDs are globally unique across categories — faces/auras carry prefixes.
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
  SphereGeometry,
  TorusGeometry,
} from "three";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  torso: number;
  arms: number;
  legs: number;
}

/** Literal skin tone, a free body-customization option independent of clothing. */
export interface SkinToneDef {
  id: string;
  name: string;
  color: number;
}

/** Character height, a free body-customization option independent of clothing. */
export interface HeightDef {
  id: string;
  name: string;
  scale: number;
}

export interface HatDef {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  /** Swatch color for the shop UI. */
  color: number;
  build(): Object3D;
}

export interface TrailDef {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  colors: number[];
}

export interface FaceDef {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
}

export interface AuraDef {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  colors: number[];
}

// ---------- Skins ----------

export const SKINS: SkinDef[] = [
  { id: "classic", name: "Classic", price: 0, rarity: "common", torso: 0xe84c3c, arms: 0xffddb0, legs: 0x2f4f8f },
  { id: "ocean", name: "Ocean Hero", price: 200, rarity: "common", torso: 0x1abc9c, arms: 0x14856d, legs: 0x0e3a5d },
  { id: "forest", name: "Forest Scout", price: 300, rarity: "common", torso: 0x58c04d, arms: 0x3d8a36, legs: 0x5b4326 },
  { id: "sunny", name: "Sunny Day", price: 350, rarity: "common", torso: 0xffc93c, arms: 0xff9a3c, legs: 0xe8703a },
  { id: "bubblegum", name: "Bubblegum", price: 550, rarity: "rare", torso: 0xff6fae, arms: 0xff9ecb, legs: 0xb04a8f },
  { id: "mint", name: "Mint Chip", price: 650, rarity: "rare", torso: 0x8ee6c2, arms: 0x5bc9a0, legs: 0x4d3a2a },
  { id: "berry", name: "Berry Blast", price: 750, rarity: "rare", torso: 0x8e44ad, arms: 0xa569bd, legs: 0x4a235a },
  { id: "midnight", name: "Midnight Ninja", price: 900, rarity: "rare", torso: 0x2c2440, arms: 0x413566, legs: 0x1a1530 },
  { id: "candyfloss", name: "Candy Floss", price: 1500, rarity: "epic", torso: 0xf8a5d8, arms: 0xa5d8f8, legs: 0xd8a5f8 },
  { id: "robot", name: "Robo-Kid", price: 1800, rarity: "epic", torso: 0x7f8c9b, arms: 0x5d6a77, legs: 0x3e4750 },
  { id: "lavaknight", name: "Lava Knight", price: 2200, rarity: "epic", torso: 0x8b1e12, arms: 0xd94f2b, legs: 0x3a1008 },
  { id: "frostmage", name: "Frost Mage", price: 2600, rarity: "epic", torso: 0x7ec3ef, arms: 0xbfe8ff, legs: 0x2b6ea3 },
  { id: "golden", name: "Golden Champ", price: 4000, rarity: "legendary", torso: 0xf1b90c, arms: 0xd9a509, legs: 0xb8860b },
  { id: "galaxy", name: "Galaxy Runner", price: 6000, rarity: "legendary", torso: 0x1b1464, arms: 0x5e2b97, legs: 0x0d0a33 },
  { id: "rainbowskin", name: "Rainbow Legend", price: 9000, rarity: "legendary", torso: 0xff5b5b, arms: 0x5ee87a, legs: 0x53b9ff },
];

// ---------- Skin tones & height (free body customization) ----------

export const SKIN_TONES: SkinToneDef[] = [
  { id: "tone-1", name: "Fair", color: 0xffe0c2 },
  { id: "tone-2", name: "Light", color: 0xffddb0 },
  { id: "tone-3", name: "Tan", color: 0xe8b382 },
  { id: "tone-4", name: "Golden", color: 0xd9995f },
  { id: "tone-5", name: "Brown", color: 0xa9714a },
  { id: "tone-6", name: "Deep Brown", color: 0x7a4a2e },
  { id: "tone-7", name: "Rich Ebony", color: 0x4a2e1c },
  { id: "tone-8", name: "Cool Gray", color: 0xc0c8d0 },
  { id: "tone-9", name: "Minty Green", color: 0xa0e6c0 },
  { id: "tone-10", name: "Berry Purple", color: 0xc9a0e6 },
];

export const HEIGHTS: HeightDef[] = [
  { id: "height-small", name: "Small", scale: 0.85 },
  { id: "height-medium", name: "Medium", scale: 1.0 },
  { id: "height-tall", name: "Tall", scale: 1.15 },
];

export const skinToneById = (id: string): SkinToneDef =>
  SKIN_TONES.find((t) => t.id === id) ?? SKIN_TONES[1];
export const heightById = (id: string): HeightDef => HEIGHTS.find((h) => h.id === id) ?? HEIGHTS[1];

// ---------- Hats ----------

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

function buildBeanie(): Object3D {
  const g = new Group();
  const band = new Mesh(new BoxGeometry(0.68, 0.18, 0.68), lambert(0x2b6ea3));
  band.position.y = 0.09;
  const top = new Mesh(new BoxGeometry(0.56, 0.2, 0.56), lambert(0x3d8ac4));
  top.position.y = 0.26;
  const pom = new Mesh(new SphereGeometry(0.12, 8, 8), lambert(0xffffff));
  pom.position.y = 0.42;
  g.add(band, top, pom);
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

function buildHeadphones(): Object3D {
  const g = new Group();
  const band = new Mesh(new TorusGeometry(0.36, 0.05, 8, 16, Math.PI), lambert(0x333a45));
  band.position.y = 0.05;
  for (const x of [-0.36, 0.36]) {
    const cup = new Mesh(new BoxGeometry(0.14, 0.26, 0.26), lambert(0xe8432c));
    cup.position.set(x, -0.12, 0);
    g.add(cup);
  }
  g.add(band);
  return g;
}

function buildTopHat(): Object3D {
  const g = new Group();
  const brim = new Mesh(new CylinderGeometry(0.48, 0.48, 0.06, 16), lambert(0x1f1f26));
  brim.position.y = 0.03;
  const crown = new Mesh(new CylinderGeometry(0.3, 0.3, 0.55, 16), lambert(0x2b2b33));
  crown.position.y = 0.33;
  const ribbon = new Mesh(new CylinderGeometry(0.31, 0.31, 0.1, 16), lambert(0xe8432c));
  ribbon.position.y = 0.12;
  g.add(brim, crown, ribbon);
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

function buildViking(): Object3D {
  const g = new Group();
  const cap = new Mesh(new CylinderGeometry(0.36, 0.4, 0.26, 12), lambert(0x8d99ae));
  cap.position.y = 0.13;
  for (const side of [-1, 1]) {
    const horn = new Mesh(new ConeGeometry(0.1, 0.4, 8), lambert(0xfff2df));
    horn.position.set(side * 0.38, 0.28, 0);
    horn.rotation.z = -side * 0.7;
    g.add(horn);
  }
  g.add(cap);
  return g;
}

function buildPirate(): Object3D {
  const g = new Group();
  const brim = new Mesh(new BoxGeometry(0.9, 0.1, 0.5), lambert(0x26262e));
  brim.position.y = 0.05;
  const crown = new Mesh(new BoxGeometry(0.55, 0.3, 0.4), lambert(0x26262e));
  crown.position.y = 0.25;
  const badge = new Mesh(new BoxGeometry(0.16, 0.16, 0.05), lambert(0xffd640));
  badge.position.set(0, 0.22, 0.23);
  g.add(brim, crown, badge);
  return g;
}

function buildHalo(): Object3D {
  const halo = new Mesh(new TorusGeometry(0.32, 0.06, 8, 20), lambert(0xffe66b));
  (halo.material as MeshLambertMaterial).emissive.setHex(0xb89b1a);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.35;
  return halo;
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
  { id: "cap", name: "Cool Cap", price: 300, rarity: "common", color: 0xe8432c, build: buildCap },
  { id: "beanie", name: "Pom Beanie", price: 400, rarity: "common", color: 0x3d8ac4, build: buildBeanie },
  { id: "party", name: "Party Hat", price: 500, rarity: "common", color: 0x2bb3f3, build: buildPartyHat },
  { id: "headphones", name: "Headphones", price: 800, rarity: "rare", color: 0x333a45, build: buildHeadphones },
  { id: "tophat", name: "Fancy Top Hat", price: 1000, rarity: "rare", color: 0x2b2b33, build: buildTopHat },
  { id: "wizard", name: "Wizard Hat", price: 1000, rarity: "rare", color: 0x7a3fc1, build: buildWizardHat },
  { id: "viking", name: "Viking Helm", price: 1800, rarity: "epic", color: 0x8d99ae, build: buildViking },
  { id: "pirate", name: "Pirate Hat", price: 2200, rarity: "epic", color: 0x26262e, build: buildPirate },
  { id: "crown", name: "Royal Crown", price: 5000, rarity: "legendary", color: 0xf1b90c, build: buildCrown },
  { id: "halo", name: "Angel Halo", price: 8000, rarity: "legendary", color: 0xffe66b, build: buildHalo },
];

// ---------- Trails ----------

export const TRAILS: TrailDef[] = [
  { id: "sparkle", name: "Sparkles", price: 400, rarity: "common", colors: [0xfff7c9, 0xffe95e, 0xffffff] },
  { id: "bubbles", name: "Ocean Bubbles", price: 550, rarity: "common", colors: [0x9fd9ff, 0x53b9ff, 0xe0f4ff] },
  { id: "fire", name: "Fire Trail", price: 800, rarity: "rare", colors: [0xff5722, 0xffa000, 0xffd640] },
  { id: "slime", name: "Slime Drips", price: 1000, rarity: "rare", colors: [0x5ee87a, 0x2fbf4e, 0xb6ff9e] },
  { id: "magic", name: "Purple Magic", price: 1600, rarity: "epic", colors: [0xb46fff, 0x8e44ad, 0xe8ccff] },
  { id: "rainbow", name: "Rainbow", price: 2000, rarity: "epic", colors: [0xff5b5b, 0xffb040, 0xfff05e, 0x5ee87a, 0x53b9ff, 0xb46fff] },
  { id: "gold", name: "Golden Dust", price: 6000, rarity: "legendary", colors: [0xffd640, 0xf1b90c, 0xfff3b0] },
];

// ---------- Faces ----------

export const FACES: FaceDef[] = [
  { id: "face-classic", name: "Classic Smile", price: 0, rarity: "common" },
  { id: "face-happy", name: "Big Grin", price: 250, rarity: "common" },
  { id: "face-wink", name: "Winky", price: 500, rarity: "rare" },
  { id: "face-wow", name: "Wow!", price: 700, rarity: "rare" },
  { id: "face-cool", name: "Cool Shades", price: 1800, rarity: "epic" },
];

// ---------- Auras ----------

export const AURAS: AuraDef[] = [
  { id: "aura-spark", name: "Spark Ring", price: 1000, rarity: "rare", colors: [0xfff7c9, 0xffe95e] },
  { id: "aura-frost", name: "Frost Orbit", price: 2000, rarity: "epic", colors: [0x9fd9ff, 0xe0f4ff, 0x53b9ff] },
  { id: "aura-ember", name: "Ember Storm", price: 3000, rarity: "epic", colors: [0xff5722, 0xffa000] },
  { id: "aura-royal", name: "Royal Radiance", price: 8000, rarity: "legendary", colors: [0xffd640, 0xfff3b0, 0xf1b90c] },
];

export const skinById = (id: string): SkinDef => SKINS.find((s) => s.id === id) ?? SKINS[0];
export const hatById = (id: string | null): HatDef | null => HATS.find((h) => h.id === id) ?? null;
export const trailById = (id: string | null): TrailDef | null => TRAILS.find((t) => t.id === id) ?? null;
export const faceById = (id: string): FaceDef => FACES.find((f) => f.id === id) ?? FACES[0];
export const auraById = (id: string | null): AuraDef | null => AURAS.find((a) => a.id === id) ?? null;

// ---------- Avatar ----------

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

/** Eye/mouth meshes for a face variant, positioned on the head's +z side. */
function buildFace(faceId: string, head: Group): void {
  const dark = lambert(0x2b2b2b);
  const addEye = (x: number, w = 0.09, h = 0.13): void => {
    const eye = new Mesh(new BoxGeometry(w, h, 0.02), dark);
    eye.position.set(x, 0.06, 0.305);
    head.add(eye);
  };
  const addMouth = (w: number, h: number, y = -0.14): void => {
    const mouth = new Mesh(new BoxGeometry(w, h, 0.02), dark);
    mouth.position.set(0, y, 0.305);
    head.add(mouth);
  };

  switch (faceId) {
    case "face-happy": {
      addEye(-0.13, 0.1, 0.1);
      addEye(0.13, 0.1, 0.1);
      addMouth(0.3, 0.12);
      const tongue = new Mesh(new BoxGeometry(0.14, 0.05, 0.02), lambert(0xff7d9c));
      tongue.position.set(0, -0.185, 0.306);
      head.add(tongue);
      break;
    }
    case "face-wink":
      addEye(-0.13, 0.11, 0.03); // closed
      addEye(0.13);
      addMouth(0.26, 0.06, -0.12);
      break;
    case "face-wow": {
      addEye(-0.13, 0.11, 0.15);
      addEye(0.13, 0.11, 0.15);
      const mouth = new Mesh(new BoxGeometry(0.12, 0.14, 0.02), dark);
      mouth.position.set(0, -0.15, 0.305);
      head.add(mouth);
      break;
    }
    case "face-cool": {
      const shades = new Mesh(new BoxGeometry(0.5, 0.13, 0.03), lambert(0x14141a));
      shades.position.set(0, 0.07, 0.31);
      head.add(shades);
      addMouth(0.22, 0.05, -0.15);
      break;
    }
    default:
      addEye(-0.13);
      addEye(0.13);
      addMouth(0.24, 0.05);
  }
}

export function buildAvatar(
  skinId: string,
  hatId: string | null,
  faceId = "face-classic",
  skinToneId = "tone-2",
  heightScale = 1,
): AvatarRig {
  const skin = skinById(skinId);
  const tone = skinToneById(skinToneId);
  const group = new Group();
  group.scale.setScalar(heightScale);

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
  const skull = new Mesh(new BoxGeometry(0.6, 0.55, 0.6), lambert(tone.color));
  head.add(skull);
  buildFace(faceId, head);

  const hat = hatById(hatId);
  if (hat) {
    const h = hat.build();
    h.position.y = 0.275;
    head.add(h);
  }

  group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head);
  return { group, leftArm, rightArm, leftLeg, rightLeg, head };
}
