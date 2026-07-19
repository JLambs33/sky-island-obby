/**
 * Hub island 2.0 — the home world. A big island with a fountain plaza, an
 * arc of six course portals (locked ones show why), a walk-in shop building,
 * the Style Studio customizer podium, a practice playground, wind-and-bounce
 * routes up to floating bonus islands, and ambient butterflies. All triggers
 * are walk-into — no tapping or raycasts, so every input scheme works.
 */

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
} from "three";
import { boxesOverlap, type Box, type Vec3 } from "./physics";
import { ZERO_DELTA, type GameHost, type Piece, type PieceHost } from "./types";
import type { CourseId } from "./courses/defs";
import type { InputController } from "../input/InputController";
import { Player, PLAYER_HY } from "./Player";
import { Coin } from "./pieces/Coin";
import { BouncePad } from "./pieces/BouncePad";
import { WindZone } from "./pieces/WindZone";
import { Teleporter } from "./pieces/Teleporter";
import { makeSign } from "./labels";

const HUB_COIN_VALUE = 2;

interface PortalSpec {
  id: CourseId;
  name: string;
  color: number;
  x: number;
  z: number;
}

const PORTALS: PortalSpec[] = [
  { id: "easy", name: "Meadow Hop", color: 0x43c465, x: -15, z: -12.5 },
  { id: "medium", name: "Cloud Climb", color: 0x2bb3f3, x: -9, z: -14.5 },
  { id: "hard", name: "Lava Summit", color: 0xe8432c, x: -3, z: -16 },
  { id: "candy", name: "Candy Rush", color: 0xff6fae, x: 3, z: -16 },
  { id: "gears", name: "Gear Works", color: 0xf1a33c, x: 9, z: -14.5 },
  { id: "volcano", name: "Volcano Escape", color: 0x8b1e12, x: 15, z: -12.5 },
];

const lambert = (color: number) => new MeshLambertMaterial({ color });

/** Small drifting butterfly: two flapping wing boxes on a circular path. */
class Butterfly {
  readonly group = new Group();
  private readonly left: Mesh;
  private readonly right: Mesh;
  private t = Math.random() * Math.PI * 2;

  constructor(
    private readonly cx: number,
    private readonly cy: number,
    private readonly cz: number,
    private readonly radius: number,
    color: number,
  ) {
    const mat = lambert(color);
    this.left = new Mesh(new BoxGeometry(0.16, 0.02, 0.12), mat);
    this.left.position.x = -0.09;
    this.right = new Mesh(new BoxGeometry(0.16, 0.02, 0.12), mat);
    this.right.position.x = 0.09;
    this.group.add(this.left, this.right);
  }

  update(dt: number): void {
    this.t += dt * 0.5;
    const flap = Math.sin(this.t * 14) * 0.7;
    this.left.rotation.z = flap;
    this.right.rotation.z = -flap;
    this.group.position.set(
      this.cx + Math.cos(this.t) * this.radius,
      this.cy + Math.sin(this.t * 2.3) * 0.4,
      this.cz + Math.sin(this.t) * this.radius,
    );
    this.group.rotation.y = -this.t + Math.PI / 2;
  }
}

export class Hub implements PieceHost {
  readonly group = new Group();
  readonly spawn: Vec3 = { x: 0, y: 0, z: 6 };

  private readonly solids: Box[] = [];
  private readonly deltas: Vec3[] = [];
  private readonly coins: Coin[] = [];
  private readonly bouncePads: BouncePad[] = [];
  private readonly wind: WindZone;
  private readonly teleporters: Teleporter[] = [];
  private readonly butterflies: Butterfly[] = [];
  private readonly waterDrops: Mesh[] = [];
  private readonly portalTriggers: {
    id: CourseId;
    box: Box;
    wasInside: boolean;
    locked: boolean;
    hint: string;
  }[] = [];
  private readonly shopTrigger: Box = { cx: 10.6, cy: 0.9, cz: 4, hx: 1.1, hy: 0.9, hz: 1.1 };
  private readonly studioTrigger: Box = { cx: -14, cy: 1.2, cz: 4, hx: 1.0, hy: 1.2, hz: 1.0 };
  private shopWasInside = false;
  private studioWasInside = false;
  private player: Player | null = null;
  private readonly ownersScratch: (Piece | null)[] = [];
  private t = 0;

  /** Podium spot the customizer poses the player on. */
  readonly studioSpot: Vec3 = { x: -14, y: 0.36, z: 4 };

  constructor(
    private readonly game: GameHost,
    signSubs: Record<CourseId, string>,
    unlocked: Record<CourseId, boolean>,
    lockHints: Record<CourseId, string>,
  ) {
    const solidBox = (
      cx: number,
      cy: number,
      cz: number,
      w: number,
      h: number,
      d: number,
      color: number,
    ): Mesh => {
      const mesh = new Mesh(new BoxGeometry(w, h, d), lambert(color));
      mesh.position.set(cx, cy, cz);
      this.group.add(mesh);
      this.solids.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: d / 2 });
      return mesh;
    };

    // ---- The island: big grass slab over tapering dirt. ----
    solidBox(0, -1, 0, 40, 2, 40, 0x58c04d);
    solidBox(0, -3.2, 0, 32, 2.5, 32, 0x9b6b3f);
    solidBox(0, -5.6, 0, 20, 2.5, 20, 0x7a4f2d);

    // ---- Fountain plaza. ----
    const basin = new Mesh(new CylinderGeometry(2.6, 2.8, 0.7, 20), lambert(0xd8dee9));
    basin.position.set(0, 0.35, 0);
    this.group.add(basin);
    this.solids.push({ cx: 0, cy: 0.35, cz: 0, hx: 2.6, hy: 0.35, hz: 2.6 });
    const water = new Mesh(new CylinderGeometry(2.2, 2.2, 0.15, 20), lambert(0x53b9ff));
    water.position.set(0, 0.72, 0);
    this.group.add(water);
    const spire = new Mesh(new CylinderGeometry(0.25, 0.35, 1.6, 10), lambert(0xc0c8d0));
    spire.position.set(0, 1.3, 0);
    this.group.add(spire);
    for (let i = 0; i < 6; i++) {
      const drop = new Mesh(new BoxGeometry(0.16, 0.16, 0.16), lambert(0x9fd9ff));
      this.waterDrops.push(drop);
      this.group.add(drop);
    }
    // Lampposts around the plaza.
    for (const [lx, lz] of [
      [-4, 3],
      [4, 3],
    ] as const) {
      const pole = new Mesh(new CylinderGeometry(0.08, 0.1, 2.4, 8), lambert(0x3d4b5c));
      pole.position.set(lx, 1.2, lz);
      const lamp = new Mesh(new SphereGeometry(0.24, 10, 10), lambert(0xfff3b0));
      (lamp.material as MeshLambertMaterial).emissive.setHex(0x9a8a3a);
      lamp.position.set(lx, 2.5, lz);
      this.group.add(pole, lamp);
    }

    // ---- Portal arc (six gates; locked ones are gray with a hint). ----
    for (const p of PORTALS) {
      const isLocked = !unlocked[p.id];
      const color = isLocked ? 0x8a8f99 : p.color;
      solidBox(p.x - 1.4, 1.7, p.z, 0.7, 3.4, 0.7, color);
      solidBox(p.x + 1.4, 1.7, p.z, 0.7, 3.4, 0.7, color);
      solidBox(p.x, 3.6, p.z, 3.8, 0.7, 0.9, color);
      const sign = isLocked
        ? makeSign(`🔒 ${p.name}`, lockHints[p.id], "#6b7280")
        : makeSign(p.name, signSubs[p.id]);
      sign.position.set(p.x, 5, p.z);
      this.group.add(sign);
      this.portalTriggers.push({
        id: p.id,
        box: { cx: p.x, cy: 1.5, cz: p.z, hx: 1.0, hy: 1.5, hz: 0.6 },
        wasInside: false,
        locked: isLocked,
        hint: lockHints[p.id],
      });
    }

    // ---- Shop building (east). ----
    solidBox(14, 1.8, 4, 5, 3.6, 4.5, 0xffb340);
    const roof = new Mesh(new ConeGeometry(4.2, 2.2, 4), lambert(0xe8432c));
    roof.position.set(14, 4.7, 4);
    roof.rotation.y = Math.PI / 4;
    this.group.add(roof);
    const door = new Mesh(new BoxGeometry(0.15, 2.2, 1.4), lambert(0x7a4f2d));
    door.position.set(11.45, 1.1, 4);
    this.group.add(door);
    const shopSign = makeSign("🛒 Shop", "Spend your coins!", "#b0641a");
    shopSign.position.set(11, 4.2, 4);
    this.group.add(shopSign);
    const shopPad = new Mesh(new BoxGeometry(2.2, 0.12, 2.2), lambert(0xffd640));
    shopPad.position.set(10.6, 0.06, 4);
    this.group.add(shopPad);

    // ---- Style Studio (west): podium + mirror. ----
    const podium = new Mesh(new CylinderGeometry(1.2, 1.4, 0.35, 16), lambert(0xb46fff));
    podium.position.set(-14, 0.18, 4);
    this.group.add(podium);
    this.solids.push({ cx: -14, cy: 0.18, cz: 4, hx: 1.2, hy: 0.18, hz: 1.2 });
    const mirrorFrame = new Mesh(new BoxGeometry(2.2, 3, 0.2), lambert(0x8d5bc4));
    mirrorFrame.position.set(-16.2, 1.7, 4);
    mirrorFrame.rotation.y = Math.PI / 2 + 0.3;
    const mirrorGlass = new Mesh(new BoxGeometry(1.8, 2.6, 0.05), lambert(0xbfe8ff));
    (mirrorGlass.material as MeshLambertMaterial).emissive.setHex(0x3a5a70);
    mirrorGlass.position.set(-16.05, 1.7, 4);
    mirrorGlass.rotation.y = Math.PI / 2 + 0.3;
    this.group.add(mirrorFrame, mirrorGlass);
    const studioSign = makeSign("🪞 Style Studio", "Dress up your hero!", "#7a3fc1");
    studioSign.position.set(-13.5, 3.6, 4);
    this.group.add(studioSign);

    // ---- Playground (south): practice tower + bounce pads + teleporter. ----
    solidBox(-6, 0.3, 13, 2.2, 0.4, 2.2, 0x8fd487);
    solidBox(-8.5, 1.1, 15, 2.2, 0.4, 2.2, 0x8fd487);
    solidBox(-6, 1.9, 17, 2.2, 0.4, 2.2, 0x8fd487);
    this.addCoin(-6, 1.4, 13);
    this.addCoin(-8.5, 2.2, 15);
    this.addCoin(-6, 3.0, 17);

    const pad1 = new BouncePad([2, 0, 13], 13);
    const pad2 = new BouncePad([5, 0, 13], 13);
    this.bouncePads.push(pad1, pad2);
    this.group.add(pad1.group, pad2.group);

    // Teleporter pair: playground ↔ east bonus island.
    const tpOut = new Teleporter([8, 0, 14], [17.4, 7.44, -4], 0x2bb3f3);
    const tpBack = new Teleporter([19, 7.04, -6.2], [8, 0.1, 16.5], 0xff6fae);
    this.teleporters.push(tpOut, tpBack);
    this.group.add(tpOut.group, tpBack.group);

    // ---- Floating bonus islands. ----
    solidBox(18, 6.84, -4, 5, 1.2, 5, 0x58c04d);
    this.addCoin(17, 8.3, -3);
    this.addCoin(19, 8.3, -3);
    this.addCoin(18, 8.3, -5);

    solidBox(-18, 8.84, -6, 4.5, 1.2, 4.5, 0x58c04d);
    this.addCoin(-18, 10.4, -6);
    this.addCoin(-19.2, 10.4, -5);
    this.addCoin(-16.8, 10.4, -7);
    // Wind column up to the west island.
    this.wind = new WindZone([-18, 5, -1.5], [2.5, 10, 2.5], 10.5);
    this.group.add(this.wind.group);

    // Ground pocket-money coins.
    this.addCoin(6, 0.9, 8);
    this.addCoin(-6, 0.9, -4);

    // ---- Trees, flowers, butterflies. ----
    for (const [tx, tz] of [
      [-12, 10],
      [12, 12],
      [-18, -2],
      [18, 8],
      [7, -8],
      [-7, -9],
    ] as const) {
      const trunk = new Mesh(new CylinderGeometry(0.25, 0.35, 1.6, 8), lambert(0x7a4f2d));
      trunk.position.set(tx, 0.8, tz);
      const leaves = new Mesh(new ConeGeometry(1.3, 2.4, 8), lambert(0x3d8a36));
      leaves.position.set(tx, 2.8, tz);
      this.group.add(trunk, leaves);
    }
    const flowerColors = [0xff6fae, 0xffd640, 0xb46fff, 0xff8a5b, 0x53b9ff];
    for (let i = 0; i < 24; i++) {
      const fx = (Math.random() - 0.5) * 34;
      const fz = (Math.random() - 0.5) * 34;
      if (Math.hypot(fx, fz) < 4) continue; // keep the plaza clear
      const stem = new Mesh(new BoxGeometry(0.06, 0.3, 0.06), lambert(0x3d8a36));
      stem.position.set(fx, 0.15, fz);
      const bloom = new Mesh(
        new BoxGeometry(0.22, 0.16, 0.22),
        lambert(flowerColors[i % flowerColors.length]),
      );
      bloom.position.set(fx, 0.36, fz);
      this.group.add(stem, bloom);
    }
    for (let i = 0; i < 5; i++) {
      const b = new Butterfly(
        (Math.random() - 0.5) * 24,
        2 + Math.random() * 2,
        (Math.random() - 0.5) * 24,
        2 + Math.random() * 3,
        flowerColors[i % flowerColors.length],
      );
      this.butterflies.push(b);
      this.group.add(b.group);
    }

    while (this.deltas.length < this.solids.length) this.deltas.push(ZERO_DELTA as Vec3);
  }

  private addCoin(x: number, y: number, z: number): void {
    const coin = new Coin([x, y, z]);
    this.coins.push(coin);
    this.group.add(coin.group);
  }

  step(dt: number, input: InputController, cameraYaw: number, player: Player): void {
    this.player = player;
    this.t += dt;

    for (const c of this.coins) c.update(dt);
    for (const b of this.butterflies) b.update(dt);
    for (const p of this.bouncePads) p.update(dt);
    for (const tp of this.teleporters) tp.update(dt);
    this.wind.update(dt);
    // Fountain droplets arc out from the spire.
    for (let i = 0; i < this.waterDrops.length; i++) {
      const phase = (this.t * 1.2 + i / this.waterDrops.length) % 1;
      const a = (i / this.waterDrops.length) * Math.PI * 2;
      this.waterDrops[i].position.set(
        Math.cos(a) * phase * 1.8,
        2.1 + Math.sin(phase * Math.PI) * 1.1 - phase * 1.4,
        Math.sin(a) * phase * 1.8,
      );
    }

    // Bounce pads contribute solids each step; owners scratch stays aligned
    // with the indices they push after solidsBase.
    const solidsBase = this.solids.length;
    this.ownersScratch.length = 0;
    for (const p of this.bouncePads) p.collectSolids(this.solids, this.deltas, this.ownersScratch);

    const events = player.step(dt, input, cameraYaw, this.solids, this.deltas);
    if (events.jumped) this.game.sfxPlay("jump");
    if (events.landed) this.game.sfxPlay("land");

    if (player.grounded && player.groundIndex >= solidsBase) {
      this.ownersScratch[player.groundIndex - solidsBase]?.onStand?.(this);
    }
    // Restore the static arrays for next step.
    this.solids.length = solidsBase;
    this.deltas.length = solidsBase;

    const box = player.colliderBox();
    for (const c of this.coins) c.checkTrigger(box, this);
    for (const tp of this.teleporters) tp.checkTrigger(box, this);
    this.wind.checkTrigger(box, this);

    for (const t of this.portalTriggers) {
      const inside = boxesOverlap(box as Box, t.box);
      if (inside && !t.wasInside) {
        t.wasInside = true;
        if (t.locked) {
          this.game.sfxPlay("denied");
          this.game.toast(`🔒 ${t.hint}`);
        } else {
          this.game.enterCourse(t.id);
          return;
        }
      }
      t.wasInside = inside;
    }

    const inShop = boxesOverlap(box as Box, this.shopTrigger);
    if (inShop && !this.shopWasInside) this.game.openShop();
    this.shopWasInside = inShop;

    const inStudio = boxesOverlap(box as Box, this.studioTrigger);
    if (inStudio && !this.studioWasInside) this.game.openCustomizer();
    this.studioWasInside = inStudio;

    if (player.pos.y - PLAYER_HY < -10) {
      player.teleport(this.spawn.x, this.spawn.y, this.spawn.z);
      player.freezeInput(0.4);
      this.game.respawned();
    }
  }

  // ---------- PieceHost (hub pieces reuse the course piece classes) ----------

  kill(): void {}

  collectCoin(_pos: Vec3): void {
    this.game.addCoins(HUB_COIN_VALUE);
    this.game.sfxPlay("coin");
  }

  reachCheckpoint(_pos: Vec3): void {}

  bounce(power: number): void {
    if (!this.player) return;
    this.player.vel.y = power;
    this.player.grounded = false;
    this.game.sfxPlay("bounce");
  }

  completeCourse(): void {}

  push(x: number, z: number): void {
    this.player?.addPush(x, z);
  }

  boost(mult: number, seconds: number): void {
    this.player?.boost(mult, seconds);
  }

  updraft(strength: number): void {
    if (!this.player) return;
    const v = this.player.vel;
    if (v.y < strength) v.y = Math.min(v.y + 1.0, strength);
  }

  teleportPlayer(x: number, y: number, z: number): void {
    if (!this.player) return;
    this.player.teleport(x, y, z);
    this.game.sfxPlay("teleport");
    this.game.respawned();
  }
}
