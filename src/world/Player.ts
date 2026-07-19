/**
 * Player — blocky avatar + box collider driven purely by InputController
 * intents. Movement is camera-relative with instant velocity (tight, kid
 * friendly), jumping has coyote time + a jump buffer so near-miss presses
 * still work, and releasing jump early cuts the jump short.
 *
 * The collider is a single AABB (see physics.ts); Course/Hub pass in this
 * step's solids plus per-solid deltas so moving platforms carry the player.
 */

import { Group } from "three";
import type { InputController } from "../input/InputController";
import { moveBox, type Box, type MoveResult, type Vec3 } from "./physics";
import { buildAvatar, trailById, auraById, type AvatarRig } from "./cosmetics";
import { Trail } from "./Trail";
import { Aura } from "./Aura";

export const PLAYER_HX = 0.4;
export const PLAYER_HY = 1.1;
export const PLAYER_HZ = 0.4;

const WALK_SPEED = 6.5;
const GRAVITY = 26;
const JUMP_VELOCITY = 9.8; // ≈ 1.85 units of jump height
const JUMP_CUT_VELOCITY = 4; // releasing jump early clamps rise to this
const TERMINAL_VELOCITY = -30;
const COYOTE_SECONDS = 0.12;
const BUFFER_SECONDS = 0.12;

export interface StepEvents {
  jumped: boolean;
  landed: boolean;
}

export class Player {
  /** Collider center. */
  readonly pos: Vec3 = { x: 0, y: PLAYER_HY, z: 0 };
  readonly vel: Vec3 = { x: 0, y: 0, z: 0 };
  grounded = false;
  /** Which solid we stood on last step (course pieces use this for onStand). */
  groundIndex = -1;

  /** Root added to the scene; contains the avatar, trail, and aura. */
  readonly root = new Group();
  private rig: AvatarRig;
  private readonly trail = new Trail();
  private readonly aura = new Aura();

  private coyote = 0;
  private buffer = 0;
  private runPhase = 0;
  private heading = 0;
  private inputFreeze = 0;
  /**
   * Delta object of the solid stood on last step, captured by REFERENCE (each
   * piece reuses one delta object), so platform carry stays correct even when
   * the solids array shifts between steps (e.g. a vanish tile disappearing).
   */
  private groundDelta: Vec3 | null = null;
  // External drift (units/sec) accumulated by conveyors this step's onStand,
  // consumed on the following step (onStand runs after the move).
  private pendingPushX = 0;
  private pendingPushZ = 0;
  private boostTimer = 0;
  private boostMult = 1;

  private readonly moveResult: MoveResult = {
    x: 0,
    y: 0,
    z: 0,
    onGround: false,
    hitCeiling: false,
    groundIndex: -1,
  };
  private readonly box: Box = {
    cx: 0,
    cy: 0,
    cz: 0,
    hx: PLAYER_HX,
    hy: PLAYER_HY,
    hz: PLAYER_HZ,
  };
  private readonly events: StepEvents = { jumped: false, landed: false };

  constructor() {
    this.rig = buildAvatar("classic", null, "face-classic");
    this.root.add(this.rig.group, this.trail.points, this.aura.points);
  }

  /** Rebuild the avatar for the equipped cosmetics + body customization. */
  applyCosmetics(
    skinId: string,
    hatId: string | null,
    trailId: string | null,
    faceId = "face-classic",
    auraId: string | null = null,
    skinToneId = "tone-2",
    heightScale = 1,
  ): void {
    this.root.remove(this.rig.group);
    this.rig = buildAvatar(skinId, hatId, faceId, skinToneId, heightScale);
    this.root.add(this.rig.group);
    this.trail.setDef(trailById(trailId));
    this.aura.setDef(auraById(auraId));
    this.syncMesh();
  }

  /** Collider AABB (reused object) for trigger checks. */
  colliderBox(): Readonly<Box> {
    this.box.cx = this.pos.x;
    this.box.cy = this.pos.y;
    this.box.cz = this.pos.z;
    return this.box;
  }

  teleport(x: number, y: number, z: number, heading = 0): void {
    this.pos.x = x;
    this.pos.y = y + PLAYER_HY;
    this.pos.z = z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.grounded = false;
    this.groundIndex = -1;
    this.groundDelta = null;
    this.coyote = 0;
    this.buffer = 0;
    this.heading = heading;
    this.syncMesh();
  }

  /**
   * Ignore movement/jump intents for a moment (respawn grace) so a held
   * joystick can't steer the player straight off the platform again before
   * they've even landed. Physics keeps running so the player settles.
   */
  freezeInput(seconds: number): void {
    this.inputFreeze = seconds;
  }

  /** Conveyor drift for the next step, in units/sec (accumulates). */
  addPush(x: number, z: number): void {
    this.pendingPushX += x;
    this.pendingPushZ += z;
  }

  /** Temporary run-speed multiplier (speed pads). */
  boost(mult: number, seconds: number): void {
    this.boostMult = mult;
    this.boostTimer = seconds;
  }

  get boosted(): boolean {
    return this.boostTimer > 0;
  }

  step(
    dt: number,
    input: InputController,
    cameraYaw: number,
    solids: readonly Box[],
    solidDeltas: readonly Vec3[],
  ): StepEvents {
    this.events.jumped = false;
    this.events.landed = false;

    // Ride whatever we were standing on last step.
    if (this.grounded && this.groundDelta) {
      this.pos.x += this.groundDelta.x;
      this.pos.y += this.groundDelta.y;
      this.pos.z += this.groundDelta.z;
    }

    const frozen = this.inputFreeze > 0;
    if (frozen) this.inputFreeze -= dt;
    if (this.boostTimer > 0) this.boostTimer -= dt;
    const speed = WALK_SPEED * (this.boostTimer > 0 ? this.boostMult : 1);

    // Camera-relative horizontal velocity, plus external drift (conveyors).
    const fx = -Math.sin(cameraYaw);
    const fz = -Math.cos(cameraYaw);
    const rx = -fz;
    const rz = fx;
    const mx = frozen ? 0 : input.move.x;
    const my = frozen ? 0 : input.move.y;
    this.vel.x = (fx * my + rx * mx) * speed + this.pendingPushX;
    this.vel.z = (fz * my + rz * mx) * speed + this.pendingPushZ;
    this.pendingPushX = 0;
    this.pendingPushZ = 0;

    // Jumping: buffer the press, allow it during coyote time.
    this.coyote = this.grounded ? COYOTE_SECONDS : Math.max(0, this.coyote - dt);
    this.buffer =
      input.jumpPressed && !frozen ? BUFFER_SECONDS : Math.max(0, this.buffer - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vel.y = JUMP_VELOCITY;
      this.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.events.jumped = true;
    }
    if (!input.jumpHeld && this.vel.y > JUMP_CUT_VELOCITY) this.vel.y = JUMP_CUT_VELOCITY;

    this.vel.y = Math.max(this.vel.y - GRAVITY * dt, TERMINAL_VELOCITY);

    const r = moveBox(
      this.pos.x,
      this.pos.y,
      this.pos.z,
      PLAYER_HX,
      PLAYER_HY,
      PLAYER_HZ,
      this.vel.x * dt,
      this.vel.y * dt,
      this.vel.z * dt,
      solids,
      this.moveResult,
    );
    this.pos.x = r.x;
    this.pos.y = r.y;
    this.pos.z = r.z;
    if (r.onGround) {
      if (!this.grounded && this.vel.y < -3) this.events.landed = true;
      this.vel.y = 0;
    } else if (r.hitCeiling && this.vel.y > 0) {
      this.vel.y = 0;
    }
    this.grounded = r.onGround;
    this.groundIndex = r.groundIndex;
    this.groundDelta =
      r.groundIndex >= 0 && r.groundIndex < solidDeltas.length
        ? solidDeltas[r.groundIndex]
        : null;

    this.animate(dt);
    this.trail.update(
      dt,
      this.pos.x,
      this.pos.y - PLAYER_HY + 0.2,
      this.pos.z,
      Math.hypot(this.vel.x, this.vel.z) > 1 || !this.grounded,
    );
    this.aura.update(dt, this.pos.x, this.pos.y - PLAYER_HY, this.pos.z);
    this.syncMesh();
    return this.events;
  }

  private animate(dt: number): void {
    const speed = Math.hypot(this.vel.x, this.vel.z);
    if (speed > 0.1) {
      // Face travel direction (shortest-arc lerp).
      const target = Math.atan2(this.vel.x, this.vel.z);
      let diff = target - this.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.heading += diff * Math.min(1, dt * 14);
    }

    const rig = this.rig;
    if (!this.grounded) {
      // Airborne: arms up, legs tucked slightly.
      rig.leftArm.rotation.x = -2.6;
      rig.rightArm.rotation.x = -2.6;
      rig.leftLeg.rotation.x = 0.35;
      rig.rightLeg.rotation.x = -0.2;
    } else {
      this.runPhase += dt * speed * 1.6;
      const swing = Math.sin(this.runPhase) * Math.min(1, speed / WALK_SPEED) * 0.8;
      rig.leftArm.rotation.x = swing;
      rig.rightArm.rotation.x = -swing;
      rig.leftLeg.rotation.x = -swing;
      rig.rightLeg.rotation.x = swing;
    }
  }

  private syncMesh(): void {
    this.rig.group.position.set(this.pos.x, this.pos.y - PLAYER_HY, this.pos.z);
    this.rig.group.rotation.y = this.heading;
  }
}
