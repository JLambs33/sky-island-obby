/**
 * Hub island — the home world. Three course portals (walk through to play),
 * a shop stand (walk onto the pad to open), a small practice area with
 * low-value coins, and trees/signs for flavor. All triggers are walk-into —
 * no tapping or raycasts, so it works identically with every input scheme.
 */

import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import { boxesOverlap, type Box, type Vec3 } from "./physics";
import { ZERO_DELTA, type GameHost, type PieceHost } from "./types";
import type { CourseId } from "./courses/defs";
import type { InputController } from "../input/InputController";
import { Player, PLAYER_HY } from "./Player";
import { Coin } from "./pieces/Coin";
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
  { id: "easy", name: "Meadow Hop", color: 0x43c465, x: -8, z: -10 },
  { id: "medium", name: "Cloud Climb", color: 0x2bb3f3, x: 0, z: -11 },
  { id: "hard", name: "Lava Summit", color: 0xe8432c, x: 8, z: -10 },
];

export class Hub implements PieceHost {
  readonly group = new Group();
  readonly spawn: Vec3 = { x: 0, y: 0, z: 4 };

  private readonly solids: Box[] = [];
  private readonly deltas: Vec3[] = [];
  private readonly coins: Coin[] = [];
  private readonly portalTriggers: { id: CourseId; box: Box; wasInside: boolean }[] = [];
  private readonly shopTrigger: Box = { cx: 7.6, cy: 0.9, cz: 4, hx: 1.1, hy: 0.9, hz: 1.1 };
  private shopWasInside = false;

  constructor(
    private readonly game: GameHost,
    signSubs: Record<CourseId, string>,
  ) {
    const lambert = (color: number) => new MeshLambertMaterial({ color });
    const solidBox = (
      cx: number,
      cy: number,
      cz: number,
      w: number,
      h: number,
      d: number,
      color: number,
    ): void => {
      const mesh = new Mesh(new BoxGeometry(w, h, d), lambert(color));
      mesh.position.set(cx, cy, cz);
      this.group.add(mesh);
      this.solids.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: d / 2 });
    };

    // The island: grass slab over tapering dirt.
    solidBox(0, -1, 0, 26, 2, 26, 0x58c04d);
    solidBox(0, -3, 0, 20, 2.5, 20, 0x9b6b3f);
    solidBox(0, -5.2, 0, 12, 2.5, 12, 0x7a4f2d);

    // Course portals.
    for (const p of PORTALS) {
      solidBox(p.x - 1.4, 1.7, p.z, 0.7, 3.4, 0.7, p.color);
      solidBox(p.x + 1.4, 1.7, p.z, 0.7, 3.4, 0.7, p.color);
      solidBox(p.x, 3.6, p.z, 3.8, 0.7, 0.9, p.color);
      const sign = makeSign(p.name, signSubs[p.id]);
      sign.position.set(p.x, 5, p.z);
      this.group.add(sign);
      this.portalTriggers.push({
        id: p.id,
        box: { cx: p.x, cy: 1.5, cz: p.z, hx: 1.0, hy: 1.5, hz: 0.6 },
        wasInside: false,
      });
    }

    // Shop stand + walk-on pad.
    solidBox(10.5, 1.3, 4, 2.6, 2.6, 3, 0xffb340);
    solidBox(10.5, 2.9, 4, 3.2, 0.4, 3.6, 0xe8432c);
    const shopSign = makeSign("Shop", "Spend your coins!", "#b0641a");
    shopSign.position.set(9.6, 4.4, 4);
    this.group.add(shopSign);
    const pad = new Mesh(new BoxGeometry(2.2, 0.12, 2.2), lambert(0xffd640));
    pad.position.set(7.6, 0.06, 4);
    this.group.add(pad);

    // Practice hops with pocket-money coins.
    solidBox(-8, 0.3, 2, 2, 0.4, 2, 0x8fd487);
    solidBox(-8, 1.1, -1.5, 2, 0.4, 2, 0x8fd487);
    for (const pos of [
      [-8, 1.4, 2],
      [-8, 2.2, -1.5],
      [-8, 0.9, 6],
    ] as const) {
      const coin = new Coin([pos[0], pos[1], pos[2]]);
      this.coins.push(coin);
      this.group.add(coin.group);
    }

    // Trees.
    for (const [tx, tz] of [
      [-10, 8],
      [-11, -4],
      [11, 10],
      [10.5, -4],
    ] as const) {
      const trunk = new Mesh(new CylinderGeometry(0.25, 0.35, 1.6, 8), lambert(0x7a4f2d));
      trunk.position.set(tx, 0.8, tz);
      const leaves = new Mesh(new ConeGeometry(1.3, 2.4, 8), lambert(0x3d8a36));
      leaves.position.set(tx, 2.8, tz);
      this.group.add(trunk, leaves);
    }

    while (this.deltas.length < this.solids.length) this.deltas.push(ZERO_DELTA as Vec3);
  }

  step(dt: number, input: InputController, cameraYaw: number, player: Player): void {
    for (const c of this.coins) c.update(dt);

    const events = player.step(dt, input, cameraYaw, this.solids, this.deltas);
    if (events.jumped) this.game.sfxPlay("jump");
    if (events.landed) this.game.sfxPlay("land");

    const box = player.colliderBox();
    for (const c of this.coins) c.checkTrigger(box, this);

    for (const t of this.portalTriggers) {
      const inside = boxesOverlap(box as Box, t.box);
      if (inside && !t.wasInside) {
        t.wasInside = true;
        this.game.enterCourse(t.id);
        return;
      }
      t.wasInside = inside;
    }

    const inShop = boxesOverlap(box as Box, this.shopTrigger);
    if (inShop && !this.shopWasInside) this.game.openShop();
    this.shopWasInside = inShop;

    if (player.pos.y - PLAYER_HY < -10) {
      player.teleport(this.spawn.x, this.spawn.y, this.spawn.z);
      player.freezeInput(0.4);
      this.game.respawned();
    }
  }

  // ---------- PieceHost (for the practice coins) ----------

  kill(): void {}

  collectCoin(_pos: Vec3): void {
    this.game.addCoins(HUB_COIN_VALUE);
    this.game.sfxPlay("coin");
  }

  reachCheckpoint(_pos: Vec3): void {}
  bounce(_power: number): void {}
  completeCourse(): void {}
}
