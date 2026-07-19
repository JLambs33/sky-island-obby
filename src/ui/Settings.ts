/**
 * Settings — mute/music are already on the HUD; this panel's job is backup
 * and restore. There's no backend, so all progress lives in this browser's
 * localStorage only. A "backup code" lets a kid (or parent) copy their save
 * out as text and paste it back in later — after clearing the browser cache,
 * on a different device, etc.
 */

import type { SaveManager } from "../save/SaveManager";
import type { SfxName } from "../audio/Sfx";

export class Settings {
  private readonly overlay: HTMLElement;
  private readonly codeBox: HTMLTextAreaElement;
  private readonly pasteBox: HTMLTextAreaElement;
  private readonly status: HTMLElement;

  constructor(
    ui: HTMLElement,
    private readonly save: SaveManager,
    private readonly hooks: {
      onClose: () => void;
      onRestored: () => void;
      sfxPlay: (name: SfxName) => void;
    },
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "overlay hidden";

    const panel = document.createElement("div");
    panel.className = "shop-panel settings-panel";

    const head = document.createElement("div");
    head.className = "shop-head";
    const title = document.createElement("span");
    title.textContent = "⚙️ Settings";
    const close = document.createElement("button");
    close.className = "round-btn";
    close.textContent = "✕";
    close.addEventListener("click", () => this.close());
    head.append(title, close);

    const body = document.createElement("div");
    body.className = "settings-body";

    const backupLabel = document.createElement("div");
    backupLabel.className = "settings-label";
    backupLabel.textContent = "🔑 Your backup code — copy it somewhere safe!";
    this.codeBox = document.createElement("textarea");
    this.codeBox.className = "settings-code";
    this.codeBox.readOnly = true;
    this.codeBox.rows = 3;
    const copyBtn = document.createElement("button");
    copyBtn.className = "big-btn settings-btn";
    copyBtn.textContent = "📋 Copy Code";
    copyBtn.addEventListener("click", () => void this.copy());

    const restoreLabel = document.createElement("div");
    restoreLabel.className = "settings-label";
    restoreLabel.textContent = "📥 Got a code? Paste it here to restore your stuff:";
    this.pasteBox = document.createElement("textarea");
    this.pasteBox.className = "settings-code";
    this.pasteBox.rows = 3;
    this.pasteBox.placeholder = "Paste your backup code here...";
    const restoreBtn = document.createElement("button");
    restoreBtn.className = "big-btn settings-btn restore-btn";
    restoreBtn.textContent = "Restore";
    restoreBtn.addEventListener("click", () => this.restore());

    this.status = document.createElement("div");
    this.status.className = "settings-status";

    body.append(
      backupLabel,
      this.codeBox,
      copyBtn,
      restoreLabel,
      this.pasteBox,
      restoreBtn,
      this.status,
    );
    panel.append(head, body);
    this.overlay.appendChild(panel);
    ui.appendChild(this.overlay);
  }

  open(): void {
    this.codeBox.value = this.save.exportCode();
    this.pasteBox.value = "";
    this.status.textContent = "";
    this.overlay.classList.remove("hidden");
  }

  close(): void {
    this.overlay.classList.add("hidden");
    this.hooks.sfxPlay("click");
    this.hooks.onClose();
  }

  private async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codeBox.value);
    } catch {
      // Clipboard API unavailable/blocked — fall back to select-and-copy so
      // the user can still grab it manually.
      this.codeBox.focus();
      this.codeBox.select();
      document.execCommand("copy");
    }
    this.hooks.sfxPlay("click");
    this.status.textContent = "✅ Copied! Save it somewhere safe.";
  }

  private restore(): void {
    const code = this.pasteBox.value.trim();
    if (!code) return;
    const ok = window.confirm(
      "This will replace your current coins and items with what's in the code. Continue?",
    );
    if (!ok) return;

    const result = this.save.importCode(code);
    if (result.ok) {
      this.hooks.sfxPlay("buy");
      this.status.textContent = "🎉 Restored! Your progress is back.";
      this.codeBox.value = this.save.exportCode();
      this.hooks.onRestored();
    } else {
      this.hooks.sfxPlay("denied");
      this.status.textContent = `❌ ${result.error}`;
    }
  }
}
