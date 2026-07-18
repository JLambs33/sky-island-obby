/**
 * TouchDriver — the only place touch DOM listeners live (adapted from
 * ~/Code/detective-game).
 *
 * Left half of the target = dynamic-origin virtual joystick (appears under the
 * thumb, capped throw radius). Right half = single-finger drag → look. The
 * joystick finger and the look finger are tracked independently by pointerId,
 * so both work at once. Jumping comes from the on-screen button (ButtonsDriver),
 * not from this driver.
 *
 * Uses Pointer Events filtered to non-mouse pointers; mouse is handled by
 * KeyboardMouseDriver so both drivers can stay active together. All per-frame
 * outputs are reused objects — no allocation in the hot path.
 */

import type { InputDriver, Vec2 } from "./InputController";
import { joystickVector } from "./mapping";

const JOYSTICK_MAX_RADIUS = 60; // px throw
const LOOK_SENSITIVITY = 0.005; // radians per px of drag

interface JoystickState {
  pointerId: number;
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

interface LookState {
  pointerId: number;
  lastX: number;
  lastY: number;
}

export class TouchDriver implements InputDriver {
  readonly move: Vec2 = { x: 0, y: 0 };
  readonly lookDelta: Vec2 = { x: 0, y: 0 };
  readonly jumpPressed = false; // jump comes from ButtonsDriver
  readonly jumpHeld = false;

  private enabled = true;
  private joystick: JoystickState | null = null;
  private look: LookState | null = null;

  constructor(private readonly target: HTMLElement) {
    target.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    target.addEventListener("pointermove", this.onPointerMove, { passive: false });
    target.addEventListener("pointerup", this.onPointerUp);
    target.addEventListener("pointercancel", this.onPointerUp);
    // Suppress iOS Safari gestures that would fight the game surface.
    target.addEventListener("contextmenu", this.preventDefault, { passive: false });
    target.addEventListener("gesturestart", this.preventDefault as EventListener, { passive: false });
    target.addEventListener("gesturechange", this.preventDefault as EventListener, { passive: false });
  }

  /** Live joystick visuals in client px, for the touch-controls UI. */
  get joystickVisual(): { active: boolean; originX: number; originY: number; knobX: number; knobY: number } {
    const j = this.joystick;
    return j
      ? { active: true, originX: j.originX, originY: j.originY, knobX: j.knobX, knobY: j.knobY }
      : { active: false, originX: 0, originY: 0, knobX: 0, knobY: 0 };
  }

  private preventDefault = (e: Event): void => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled || e.pointerType === "mouse") return;
    e.preventDefault();

    const rect = this.target.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;

    if (isLeftHalf && this.joystick === null) {
      this.joystick = {
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        knobX: e.clientX,
        knobY: e.clientY,
      };
      this.target.setPointerCapture(e.pointerId);
    } else if (!isLeftHalf && this.look === null) {
      this.look = {
        pointerId: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      this.target.setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled) return;

    if (this.joystick && e.pointerId === this.joystick.pointerId) {
      const dx = e.clientX - this.joystick.originX;
      const dy = e.clientY - this.joystick.originY;
      joystickVector(dx, dy, JOYSTICK_MAX_RADIUS, this.move);
      // Clamp knob to the throw radius for the visual.
      const len = Math.hypot(dx, dy);
      const s = len > JOYSTICK_MAX_RADIUS ? JOYSTICK_MAX_RADIUS / len : 1;
      this.joystick.knobX = this.joystick.originX + dx * s;
      this.joystick.knobY = this.joystick.originY + dy * s;
    } else if (this.look && e.pointerId === this.look.pointerId) {
      this.lookDelta.x += (e.clientX - this.look.lastX) * LOOK_SENSITIVITY;
      this.lookDelta.y += (e.clientY - this.look.lastY) * LOOK_SENSITIVITY;
      this.look.lastX = e.clientX;
      this.look.lastY = e.clientY;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.joystick && e.pointerId === this.joystick.pointerId) {
      this.joystick = null;
      this.move.x = 0;
      this.move.y = 0;
      this.releaseCapture(e.pointerId);
    } else if (this.look && e.pointerId === this.look.pointerId) {
      this.look = null;
      this.releaseCapture(e.pointerId);
    }
  };

  private releaseCapture(pointerId: number): void {
    if (this.target.hasPointerCapture(pointerId)) this.target.releasePointerCapture(pointerId);
  }

  endFrame(): void {
    this.lookDelta.x = 0;
    this.lookDelta.y = 0;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.joystick = null;
      this.look = null;
      this.move.x = 0;
      this.move.y = 0;
      this.lookDelta.x = 0;
      this.lookDelta.y = 0;
    }
  }

  dispose(): void {
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("pointermove", this.onPointerMove);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
    this.target.removeEventListener("contextmenu", this.preventDefault);
    this.target.removeEventListener("gesturestart", this.preventDefault as EventListener);
    this.target.removeEventListener("gesturechange", this.preventDefault as EventListener);
  }
}
