/**
 * InputController — the mandatory input abstraction (adapted from
 * ~/Code/detective-game). Game logic reads *intents* from this interface,
 * never raw devices. Only the driver files in this folder attach DOM
 * listeners; everything else consumes this shape.
 *
 * All drivers are always active so a desktop touchscreen "just works". There
 * is no pointer lock anywhere — drag-to-orbit is the single camera scheme on
 * all platforms. The obby adds jump intents: `jumpPressed` is an edge (true
 * only on the frame the jump started), `jumpHeld` is level (for variable jump
 * height). The on-screen jump button feeds ButtonsDriver from the UI layer.
 */

import { TouchDriver } from "./TouchDriver";
import { KeyboardMouseDriver } from "./KeyboardMouseDriver";

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputController {
  /** Normalized movement, magnitude 0..1. Left-half virtual joystick or WASD/arrows. */
  readonly move: Readonly<Vec2>;

  /** Camera orbit delta accumulated this frame, in radians. Right-half drag or mouse drag. */
  readonly lookDelta: Readonly<Vec2>;

  /** True only on the frame a jump intent fires (Space or on-screen button). */
  readonly jumpPressed: boolean;

  /** True while the jump key/button is held. */
  readonly jumpHeld: boolean;

  /** Advance per-frame edge state; call once per frame after consumers read intents. */
  endFrame(): void;

  /** Panels disable world input while open. Disabled controllers report neutral intents. */
  setEnabled(enabled: boolean): void;

  /** Detach listeners / release resources. */
  dispose(): void;
}

/**
 * One input source. Each driver owns its DOM listeners and reports its own
 * contribution to the shared intents; the composite merges every driver.
 */
export interface InputDriver {
  readonly move: Readonly<Vec2>;
  readonly lookDelta: Readonly<Vec2>;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  endFrame(): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

/**
 * Driver fed by DOM UI buttons (the on-screen jump button). The UI calls
 * `setJump`; the rising edge becomes a one-frame `jumpPressed`.
 */
export class ButtonsDriver implements InputDriver {
  readonly move: Vec2 = { x: 0, y: 0 };
  readonly lookDelta: Vec2 = { x: 0, y: 0 };
  jumpPressed = false;
  jumpHeld = false;

  private enabled = true;

  setJump(held: boolean): void {
    if (!this.enabled) return;
    if (held && !this.jumpHeld) this.jumpPressed = true;
    this.jumpHeld = held;
  }

  endFrame(): void {
    this.jumpPressed = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.jumpPressed = false;
      this.jumpHeld = false;
    }
  }

  dispose(): void {}
}

/**
 * Merges the always-on drivers into one InputController.
 * - move: summed and clamped to length 1 (usually only one driver is active).
 * - lookDelta: summed (touch drag + mouse drag can coexist on hybrid devices).
 * - jumpPressed / jumpHeld: OR of the drivers.
 * Merges write into reused vectors so reads never allocate.
 */
export class CompositeInputController implements InputController {
  private readonly _move: Vec2 = { x: 0, y: 0 };
  private readonly _look: Vec2 = { x: 0, y: 0 };

  constructor(private readonly drivers: readonly InputDriver[]) {}

  get move(): Readonly<Vec2> {
    let x = 0;
    let y = 0;
    for (const d of this.drivers) {
      x += d.move.x;
      y += d.move.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this._move.x = x;
    this._move.y = y;
    return this._move;
  }

  get lookDelta(): Readonly<Vec2> {
    let x = 0;
    let y = 0;
    for (const d of this.drivers) {
      x += d.lookDelta.x;
      y += d.lookDelta.y;
    }
    this._look.x = x;
    this._look.y = y;
    return this._look;
  }

  get jumpPressed(): boolean {
    for (const d of this.drivers) if (d.jumpPressed) return true;
    return false;
  }

  get jumpHeld(): boolean {
    for (const d of this.drivers) if (d.jumpHeld) return true;
    return false;
  }

  endFrame(): void {
    for (const d of this.drivers) d.endFrame();
  }

  setEnabled(enabled: boolean): void {
    for (const d of this.drivers) d.setEnabled(enabled);
  }

  dispose(): void {
    for (const d of this.drivers) d.dispose();
  }
}

export interface InputSetup {
  controller: InputController;
  /** Exposed for the joystick visual in the touch UI. */
  touch: TouchDriver;
  /** Exposed so the on-screen jump button can feed jump intents. */
  buttons: ButtonsDriver;
}

/**
 * Build the game's input stack for a target element (the render canvas).
 * All drivers attach and stay active simultaneously.
 */
export function createInputController(target: HTMLElement): InputSetup {
  const touch = new TouchDriver(target);
  const buttons = new ButtonsDriver();
  const controller = new CompositeInputController([
    touch,
    buttons,
    new KeyboardMouseDriver(target),
  ]);
  return { controller, touch, buttons };
}
