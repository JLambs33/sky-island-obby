/**
 * Title screen. Its Play button doubles as the required user gesture that
 * unlocks WebAudio on iOS.
 */

export class Menu {
  private readonly overlay: HTMLElement;

  constructor(ui: HTMLElement, onPlay: () => void) {
    this.overlay = document.createElement("div");
    this.overlay.className = "overlay";
    this.overlay.id = "menu";

    const title = document.createElement("h1");
    title.className = "game-title";
    title.textContent = "☁️ Sky Island Obby ☁️";

    const play = document.createElement("button");
    play.className = "big-btn";
    play.textContent = "▶  Play";
    play.addEventListener("click", () => {
      this.hide();
      onPlay();
    });

    const hint = document.createElement("p");
    hint.className = "menu-hint";
    hint.textContent =
      "Run and jump through the sky courses, grab coins, and unlock cool gear! " +
      "Move: WASD or left-thumb joystick · Jump: Space or the JUMP button · Look: drag";

    this.overlay.append(title, play, hint);
    ui.appendChild(this.overlay);
  }

  hide(): void {
    this.overlay.classList.add("hidden");
  }
}
