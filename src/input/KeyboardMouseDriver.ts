/**
 * KeyboardMouseDriver — the desktop superset layered on the touch scheme
 * (adapted from ~/Code/detective-game). WASD/arrows → move, Space → jump,
 * mouse drag → look. No pointer lock: mouse-look is plain drag-to-orbit, the
 * same scheme as touch.
 *
 * Mouse uses Pointer Events filtered to pointerType "mouse" so it coexists
 * with TouchDriver on hybrid devices. Keyboard listens on window. Outputs
 * reuse objects — no per-frame allocation.
 */

import type { InputDriver, Vec2 } from "./InputController";
import { keysToMove } from "./mapping";

const LOOK_SENSITIVITY = 0.005; // radians per px of drag

interface MouseDrag {
  lastX: number;
  lastY: number;
}

export class KeyboardMouseDriver implements InputDriver {
  readonly move: Vec2 = { x: 0, y: 0 };
  readonly lookDelta: Vec2 = { x: 0, y: 0 };
  jumpPressed = false;
  jumpHeld = false;

  private enabled = true;
  private up = false;
  private down = false;
  private left = false;
  private right = false;
  private drag: MouseDrag | null = null;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("pointermove", this.onPointerMove);
    target.addEventListener("pointerup", this.onPointerUp);
    target.addEventListener("pointercancel", this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled || e.repeat) return;
    if (this.applyKey(e.code, true)) e.preventDefault();
    if (e.code === "Space") {
      e.preventDefault();
      this.jumpPressed = true;
      this.jumpHeld = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    // Always process key-up so releases aren't stuck when input is re-enabled.
    this.applyKey(e.code, false);
    if (e.code === "Space") this.jumpHeld = false;
  };

  /** Update direction flags for a key; returns true if it was a movement key. */
  private applyKey(code: string, pressed: boolean): boolean {
    switch (code) {
      case "KeyW":
      case "ArrowUp":
        this.up = pressed;
        break;
      case "KeyS":
      case "ArrowDown":
        this.down = pressed;
        break;
      case "KeyA":
      case "ArrowLeft":
        this.left = pressed;
        break;
      case "KeyD":
      case "ArrowRight":
        this.right = pressed;
        break;
      default:
        return false;
    }
    keysToMove(this.up, this.down, this.left, this.right, this.move);
    return true;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled || e.pointerType !== "mouse") return;
    this.drag = { lastX: e.clientX, lastY: e.clientY };
    this.target.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || e.pointerType !== "mouse" || !this.drag) return;
    this.lookDelta.x += (e.clientX - this.drag.lastX) * LOOK_SENSITIVITY;
    this.lookDelta.y += (e.clientY - this.drag.lastY) * LOOK_SENSITIVITY;
    this.drag.lastX = e.clientX;
    this.drag.lastY = e.clientY;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType !== "mouse" || !this.drag) return;
    this.drag = null;
    if (this.target.hasPointerCapture(e.pointerId)) this.target.releasePointerCapture(e.pointerId);
  };

  endFrame(): void {
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
    this.jumpPressed = false;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.up = this.down = this.left = this.right = false;
      this.drag = null;
      this.move.x = 0;
      this.move.y = 0;
      this.lookDelta.x = 0;
      this.lookDelta.y = 0;
      this.jumpPressed = false;
      this.jumpHeld = false;
    }
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("pointermove", this.onPointerMove);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
  }
}
