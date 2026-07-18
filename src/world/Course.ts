/**
 * Course runtime — instantiates a CourseDef's pieces and runs the loop:
 * update pieces → gather solids → step the player → stand/trigger checks →
 * fall check. Implements PieceHost so pieces can kill/reward the player, and
 * relays game-level effects through GameHost.
 */

import { Group } from "three";
import type { CourseDef, PieceDef } from "./courses/defs";
import type { Box, Vec3 } from "./physics";
import type { GameHost, Piece, PieceHost } from "./types";
import type { InputController } from "../input/InputController";
import { Player, PLAYER_HY } from "./Player";
import { Platform } from "./pieces/Platform";
import { VanishTile } from "./pieces/VanishTile";
import { Lava } from "./pieces/Lava";
import { BouncePad } from "./pieces/BouncePad";
import { Checkpoint } from "./pieces/Checkpoint";
import { Coin } from "./pieces/Coin";
import { Spinner } from "./pieces/Spinner";
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
      return new Platform(opts);
    }
    case "vanish":
      return new VanishTile(def.pos, def.size ?? [2, 0.4, 2]);
    case "lava":
      return new Lava(def.pos, def.size);
    case "bounce":
      return new BouncePad(def.pos, def.power ?? 16);
    case "checkpoint":
      return new Checkpoint(def.pos);
    case "coin":
      return new Coin(def.pos);
    case "spinner":
      return new Spinner(def.pos, def.radius ?? 2.6, def.period ?? 2.8);
    case "trophy":
      return new Trophy(def.pos);
  }
}

export class Course implements PieceHost {
  readonly group = new Group();
  elapsed = 0;
  completed = false;

  private readonly pieces: Piece[];
  private readonly solids: Box[] = [];
  private readonly deltas: Vec3[] = [];
  private readonly owners: (Piece | null)[] = [];
  private readonly currentSpawn: Vec3;

  constructor(
    readonly def: CourseDef,
    private readonly game: GameHost,
    private readonly player: Player,
  ) {
    this.pieces = def.pieces.map((p) => buildPiece(p, def.color));
    for (const p of this.pieces) this.group.add(p.group);
    this.currentSpawn = { x: def.spawn[0], y: def.spawn[1], z: def.spawn[2] };
  }

  /** Reset the run and place the player at the start. */
  begin(): void {
    this.elapsed = 0;
    this.completed = false;
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
    for (const p of this.pieces) p.checkTrigger?.(box, this);

    if (this.player.pos.y - PLAYER_HY < this.def.killY) this.kill();
  }

  // ---------- PieceHost ----------

  kill(): void {
    if (this.completed) return;
    this.game.sfxPlay("die");
    this.player.teleport(this.currentSpawn.x, this.currentSpawn.y, this.currentSpawn.z);
  }

  collectCoin(_pos: Vec3): void {
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

  completeCourse(): void {
    if (this.completed) return;
    this.completed = true;
    this.game.courseComplete(this.elapsed);
  }
}
