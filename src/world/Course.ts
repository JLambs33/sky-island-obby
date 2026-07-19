/**
 * Course runtime — instantiates a CourseDef's pieces and runs the loop:
 * update pieces → gather solids → step the player → stand/trigger checks →
 * fall check. Implements PieceHost so pieces can kill/reward the player, and
 * relays game-level effects through GameHost.
 */

import { Group } from "three";
import type { CourseDef, PieceDef } from "./courses/defs";
import { findGroundY, type Box, type Vec3 } from "./physics";
import type { GameHost, Piece, PieceHost, TriggerCtx } from "./types";
import type { InputController } from "../input/InputController";
import { Player, PLAYER_HY } from "./Player";
import { Platform } from "./pieces/Platform";
import { VanishTile } from "./pieces/VanishTile";
import { FallingTile } from "./pieces/FallingTile";
import { Lava } from "./pieces/Lava";
import { BouncePad } from "./pieces/BouncePad";
import { Checkpoint } from "./pieces/Checkpoint";
import { Coin } from "./pieces/Coin";
import { Spinner } from "./pieces/Spinner";
import { Pendulum } from "./pieces/Pendulum";
import { Conveyor } from "./pieces/Conveyor";
import { WindZone } from "./pieces/WindZone";
import { SpeedPad } from "./pieces/SpeedPad";
import { Teleporter } from "./pieces/Teleporter";
import { Trophy } from "./pieces/Trophy";

function buildPiece(def: PieceDef, themeColor: number): Piece {
  switch (def.type) {
    case "platform": {
      const opts: ConstructorParameters<typeof Platform>[0] = {
        pos: def.pos,
        size: def.size,
        color: def.color ?? themeColor,
      };
      if (def.moveTo) {
        opts.moveTo = def.moveTo;
        opts.period = def.period ?? 4;
      }
      if (def.path) {
        opts.path = def.path;
        opts.speed = def.speed ?? 2;
      }
      return new Platform(opts);
    }
    case "vanish":
      return new VanishTile(def.pos, def.size ?? [2, 0.4, 2]);
    case "falling":
      return new FallingTile(def.pos, def.size ?? [2, 0.4, 2]);
    case "lava":
      return new Lava(def.pos, def.size, def.moveTo, def.period ?? 4);
    case "bounce":
      return new BouncePad(def.pos, def.power ?? 16);
    case "checkpoint":
      return new Checkpoint(def.pos);
    case "coin":
      return new Coin(def.pos);
    case "spinner":
      return new Spinner(def.pos, def.radius ?? 2.6, def.period ?? 2.8);
    case "pendulum":
      return new Pendulum(def.pos, def.length ?? 3.2, def.period ?? 2.6, def.maxAngle ?? 1.0);
    case "conveyor":
      return new Conveyor(def.pos, def.size, def.dir, def.speed ?? 3.5);
    case "wind":
      return new WindZone(def.pos, def.size, def.strength ?? 9);
    case "speed":
      return new SpeedPad(def.pos);
    case "teleporter":
      return new Teleporter(def.pos, def.dest, def.color);
    case "trophy":
      return new Trophy(def.pos);
  }
}

export class Course implements PieceHost {
  readonly group = new Group();
  elapsed = 0;
  completed = false;
  coinsCollected = 0;
  readonly totalCoins: number;

  private readonly pieces: Piece[];
  private readonly solids: Box[] = [];
  private readonly deltas: Vec3[] = [];
  private readonly owners: (Piece | null)[] = [];
  private readonly currentSpawn: Vec3;
  private readonly triggerCtx: TriggerCtx = { grounded: false };
  private pendingKill = false;
  /** Seconds of hazard immunity after a respawn (falling still kills). */
  private immunity = 0;

  constructor(
    readonly def: CourseDef,
    private readonly game: GameHost,
    private readonly player: Player,
  ) {
    this.pieces = def.pieces.map((p) => buildPiece(p, def.color));
    for (const p of this.pieces) this.group.add(p.group);
    this.currentSpawn = { x: def.spawn[0], y: def.spawn[1], z: def.spawn[2] };
    this.totalCoins = def.pieces.filter((p) => p.type === "coin").length;
  }

  /** Reset the run and place the player at the start. */
  begin(): void {
    this.elapsed = 0;
    this.completed = false;
    this.coinsCollected = 0;
    this.pendingKill = false;
    this.immunity = 0;
    this.currentSpawn.x = this.def.spawn[0];
    this.currentSpawn.y = this.def.spawn[1];
    this.currentSpawn.z = this.def.spawn[2];
    for (const p of this.pieces) p.reset();
    this.player.teleport(this.currentSpawn.x, this.currentSpawn.y, this.currentSpawn.z);
  }

  step(dt: number, input: InputController, cameraYaw: number): void {
    if (!this.completed) this.elapsed += dt;

    for (const p of this.pieces) p.update(dt);

    this.solids.length = 0;
    this.deltas.length = 0;
    this.owners.length = 0;
    for (const p of this.pieces) p.collectSolids(this.solids, this.deltas, this.owners);

    const events = this.player.step(dt, input, cameraYaw, this.solids, this.deltas);
    if (events.jumped) this.game.sfxPlay("jump");
    if (events.landed) this.game.sfxPlay("land");

    if (this.player.grounded && this.player.groundIndex >= 0) {
      this.owners[this.player.groundIndex]?.onStand?.(this);
    }

    const box = this.player.colliderBox();
    this.triggerCtx.grounded = this.player.grounded;
    for (const p of this.pieces) p.checkTrigger?.(box, this, this.triggerCtx);

    // Falling out of the world always kills, even during hazard immunity.
    if (this.player.pos.y - PLAYER_HY < this.def.killY) this.pendingKill = true;

    // Process at most one kill per step, after all triggers have run, so a
    // mid-loop teleport can't leave later pieces acting on a stale position.
    if (this.pendingKill) this.respawn();
    if (this.immunity > 0) this.immunity -= dt;
  }

  // ---------- PieceHost ----------

  kill(): void {
    if (this.completed || this.immunity > 0) return;
    this.pendingKill = true;
  }

  /**
   * Send the player back to the active spawn point, ground-verified: the
   * spawn is snapped onto the highest solid beneath it (falling back to the
   * course start if nothing is there), the camera snaps with it, and a short
   * input freeze + hazard immunity stop held input or a lingering hazard from
   * instantly killing them again — the old behavior could loop forever.
   */
  private respawn(): void {
    this.pendingKill = false;
    if (this.completed) return;
    this.game.sfxPlay("die");

    let x = this.currentSpawn.x;
    let z = this.currentSpawn.z;
    let y = findGroundY(x, z, this.solids, this.currentSpawn.y + 1);
    if (y === null) {
      x = this.def.spawn[0];
      z = this.def.spawn[2];
      y = findGroundY(x, z, this.solids, this.def.spawn[1] + 1) ?? this.def.spawn[1];
    }
    this.player.teleport(x, y, z);
    this.player.freezeInput(0.4);
    this.immunity = 1.0;
    this.game.respawned();
  }

  collectCoin(_pos: Vec3): void {
    this.coinsCollected++;
    this.game.addCoins(this.def.coinValue);
    this.game.sfxPlay("coin");
  }

  reachCheckpoint(pos: Vec3): void {
    this.currentSpawn.x = pos.x;
    this.currentSpawn.y = pos.y;
    this.currentSpawn.z = pos.z;
    this.game.sfxPlay("checkpoint");
    this.game.toast("Checkpoint!");
  }

  bounce(power: number): void {
    this.player.vel.y = power;
    this.player.grounded = false;
    this.game.sfxPlay("bounce");
  }

  push(x: number, z: number): void {
    this.player.addPush(x, z);
  }

  boost(mult: number, seconds: number): void {
    if (!this.player.boosted) this.game.sfxPlay("speed");
    this.player.boost(mult, seconds);
  }

  updraft(strength: number): void {
    // Called once per fixed step while inside the zone: +1 unit/s per step
    // (60 u/s² lift) up to the zone's strength — a ride, not a launch.
    const v = this.player.vel;
    if (v.y < strength) v.y = Math.min(v.y + 1.0, strength);
  }

  teleportPlayer(x: number, y: number, z: number): void {
    this.player.teleport(x, y, z);
    this.game.sfxPlay("teleport");
    this.game.respawned(); // snap the camera along
  }

  completeCourse(): void {
    if (this.completed) return;
    this.completed = true;
    this.game.courseComplete(this.elapsed, this.coinsCollected, this.totalCoins);
  }
}
