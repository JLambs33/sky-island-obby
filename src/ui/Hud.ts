/**
 * HUD — coin counter, course name + timer, home/mute buttons, and toasts.
 * Plain DOM over the canvas; styles live in index.html.
 */

export class Hud {
  private readonly coinsEl: HTMLElement;
  private readonly courseEl: HTMLElement;
  private readonly timerEl: HTMLElement;
  private readonly homeBtn: HTMLButtonElement;
  private readonly muteBtn: HTMLButtonElement;
  private readonly toastEl: HTMLElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTimerText = "";

  constructor(
    ui: HTMLElement,
    handlers: { onHome: () => void; onToggleMute: () => boolean },
  ) {
    this.coinsEl = document.createElement("div");
    this.coinsEl.className = "hud-pill";
    this.coinsEl.id = "hud-coins";
    ui.appendChild(this.coinsEl);

    this.courseEl = document.createElement("div");
    this.courseEl.className = "hud-pill";
    this.courseEl.id = "hud-course";
    const nameSpan = document.createElement("span");
    this.timerEl = document.createElement("span");
    this.timerEl.className = "timer";
    this.courseEl.append(nameSpan, this.timerEl);
    this.courseEl.style.display = "none";
    ui.appendChild(this.courseEl);

    const btns = document.createElement("div");
    btns.className = "hud-btns";
    this.homeBtn = document.createElement("button");
    this.homeBtn.className = "round-btn";
    this.homeBtn.textContent = "🏠";
    this.homeBtn.style.display = "none";
    this.homeBtn.addEventListener("click", handlers.onHome);
    this.muteBtn = document.createElement("button");
    this.muteBtn.className = "round-btn";
    this.muteBtn.textContent = "🔊";
    this.muteBtn.addEventListener("click", () => {
      const muted = handlers.onToggleMute();
      this.muteBtn.textContent = muted ? "🔇" : "🔊";
    });
    btns.append(this.homeBtn, this.muteBtn);
    ui.appendChild(btns);

    this.toastEl = document.createElement("div");
    this.toastEl.id = "toast";
    ui.appendChild(this.toastEl);

    this.setCoins(0);
  }

  setCoins(coins: number): void {
    this.coinsEl.textContent = `🪙 ${coins}`;
  }

  setMuted(muted: boolean): void {
    this.muteBtn.textContent = muted ? "🔇" : "🔊";
  }

  /** Course mode: show name + live timer + home button. */
  showCourse(name: string): void {
    (this.courseEl.firstChild as HTMLElement).textContent = `${name} · `;
    this.courseEl.style.display = "flex";
    this.homeBtn.style.display = "block";
    this.setTimer(0);
  }

  /** Hub mode: hide course chrome. */
  showHub(): void {
    this.courseEl.style.display = "none";
    this.homeBtn.style.display = "none";
  }

  setTimer(seconds: number): void {
    const text = `${seconds.toFixed(1)}s`;
    if (text === this.lastTimerText) return; // avoid DOM churn every frame
    this.lastTimerText = text;
    this.timerEl.textContent = text;
  }

  toast(message: string, ms = 1800): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("show");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove("show"), ms);
  }
}
