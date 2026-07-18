/**
 * Touch UI: the joystick visual (driven by TouchDriver state each frame) and
 * the on-screen jump button (feeds ButtonsDriver). The jump button only
 * appears once a real touch happens, so desktop stays clean while hybrid
 * devices get it the moment they're touched.
 */

import type { TouchDriver } from "../input/TouchDriver";
import type { ButtonsDriver } from "../input/InputController";

export class TouchControls {
  private readonly joyBase = document.getElementById("joy-base")!;
  private readonly joyKnob = document.getElementById("joy-knob")!;

  constructor(
    ui: HTMLElement,
    private readonly touch: TouchDriver,
    buttons: ButtonsDriver,
  ) {
    const jumpBtn = document.createElement("button");
    jumpBtn.id = "jump-btn";
    jumpBtn.textContent = "JUMP";
    ui.appendChild(jumpBtn);

    const press = (e: Event) => {
      e.preventDefault();
      buttons.setJump(true);
    };
    const release = () => buttons.setJump(false);
    jumpBtn.addEventListener("pointerdown", press);
    jumpBtn.addEventListener("pointerup", release);
    jumpBtn.addEventListener("pointercancel", release);
    jumpBtn.addEventListener("pointerleave", release);

    // Reveal touch UI on the first real touch anywhere.
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType !== "mouse") document.body.classList.add("touch-mode");
      },
      { capture: true },
    );
  }

  /** Call once per rendered frame. */
  update(): void {
    const j = this.touch.joystickVisual;
    const display = j.active ? "block" : "none";
    this.joyBase.style.display = display;
    this.joyKnob.style.display = display;
    if (j.active) {
      this.joyBase.style.left = `${j.originX}px`;
      this.joyBase.style.top = `${j.originY}px`;
      this.joyKnob.style.left = `${j.knobX}px`;
      this.joyKnob.style.top = `${j.knobY}px`;
    }
  }
}
