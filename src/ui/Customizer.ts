/**
 * Style Studio — the character customizer. A side panel over the live game
 * view (the camera is snapped to face the avatar, so the player IS the
 * preview); every tap equips instantly. Body customization (skin tone,
 * height) is free and always available — only the clothing/hat/trail/aura
 * sections are gated by ownership, since those come from the shop.
 */

import { AURAS, FACES, HATS, HEIGHTS, SKIN_TONES, SKINS, TRAILS } from "../world/cosmetics";
import type { BodyKind, CosmeticKind, SaveManager } from "../save/SaveManager";
import type { SfxName } from "../audio/Sfx";

const css = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

const FACE_EMOJI: Record<string, string> = {
  "face-classic": "🙂",
  "face-happy": "😄",
  "face-wink": "😉",
  "face-wow": "😮",
  "face-cool": "😎",
};

interface Choice {
  id: string | null;
  label: string;
  swatch: string; // CSS background, or "emoji:X"
}

function choices(kind: CosmeticKind): Choice[] {
  switch (kind) {
    case "skin":
      return SKINS.map((s) => ({
        id: s.id,
        label: s.name,
        swatch: `linear-gradient(${css(s.torso)} 55%, ${css(s.legs)} 45%)`,
      }));
    case "hat":
      return [
        { id: null, label: "No hat", swatch: "emoji:🚫" },
        ...HATS.map((h) => ({ id: h.id, label: h.name, swatch: css(h.color) })),
      ];
    case "trail":
      return [
        { id: null, label: "No trail", swatch: "emoji:🚫" },
        ...TRAILS.map((t) => ({
          id: t.id,
          label: t.name,
          swatch: `linear-gradient(90deg, ${t.colors.map(css).join(", ")})`,
        })),
      ];
    case "face":
      return FACES.map((f) => ({ id: f.id, label: f.name, swatch: `emoji:${FACE_EMOJI[f.id] ?? "🙂"}` }));
    case "aura":
      return [
        { id: null, label: "No aura", swatch: "emoji:🚫" },
        ...AURAS.map((a) => ({
          id: a.id,
          label: a.name,
          swatch: `radial-gradient(circle, ${a.colors.map(css).join(", ")})`,
        })),
      ];
  }
}

const SECTION_TITLES: Record<CosmeticKind, string> = {
  skin: "👕 Skin",
  face: "🙂 Face",
  hat: "🎩 Hat",
  trail: "✨ Trail",
  aura: "💫 Aura",
};

export class Customizer {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;

  constructor(
    ui: HTMLElement,
    private readonly save: SaveManager,
    private readonly hooks: {
      onClose: () => void;
      onChanged: () => void;
      sfxPlay: (name: SfxName) => void;
    },
  ) {
    this.panel = document.createElement("div");
    this.panel.id = "customizer";
    this.panel.classList.add("hidden");

    const head = document.createElement("div");
    head.className = "customizer-head";
    const title = document.createElement("span");
    title.textContent = "🪞 Style Studio";
    const done = document.createElement("button");
    done.className = "big-btn customizer-done";
    done.textContent = "Done!";
    done.addEventListener("click", () => this.close());
    head.append(title);

    this.body = document.createElement("div");
    this.body.className = "customizer-body";

    this.panel.append(head, this.body, done);
    ui.appendChild(this.panel);
  }

  open(): void {
    this.panel.classList.remove("hidden");
    this.render();
  }

  close(): void {
    this.panel.classList.add("hidden");
    this.hooks.sfxPlay("click");
    this.hooks.onClose();
  }

  private render(): void {
    this.body.replaceChildren();
    this.body.appendChild(this.renderBodySection("skinTone", "🎨 Skin Tone", SKIN_TONES));
    this.body.appendChild(this.renderBodySection("height", "📏 Height", HEIGHTS));
    for (const kind of ["skin", "face", "hat", "trail", "aura"] as CosmeticKind[]) {
      this.body.appendChild(this.renderSection(kind));
    }
  }

  /** Free body options (skin tone, height) — never ownership-gated. */
  private renderBodySection(
    kind: BodyKind,
    title: string,
    options: readonly { id: string; name: string; color?: number; scale?: number }[],
  ): HTMLElement {
    const section = document.createElement("div");
    section.className = "customizer-section";
    const titleEl = document.createElement("div");
    titleEl.className = "customizer-title";
    titleEl.textContent = title;
    const row = document.createElement("div");
    row.className = "customizer-row";

    const equippedId = this.save.data.body[kind];
    for (const opt of options) {
      const chip = document.createElement("button");
      chip.className = "customizer-chip";
      chip.title = opt.name;
      if (opt.color !== undefined) {
        chip.style.background = css(opt.color);
      } else {
        // Height presets: a little person glyph scaled to preview size.
        chip.textContent = "🧍";
        chip.style.fontSize = `${18 + (opt.scale ?? 1) * 10}px`;
      }
      if (equippedId === opt.id) chip.classList.add("selected");
      chip.addEventListener("click", () => {
        this.save.setBody(kind, opt.id);
        this.hooks.sfxPlay("click");
        this.hooks.onChanged();
        this.render();
      });
      row.appendChild(chip);
    }

    section.append(titleEl, row);
    return section;
  }

  private renderSection(kind: CosmeticKind): HTMLElement {
    const section = document.createElement("div");
    section.className = "customizer-section";
    const title = document.createElement("div");
    title.className = "customizer-title";
    title.textContent = SECTION_TITLES[kind];
    const row = document.createElement("div");
    row.className = "customizer-row";

    const equippedId = this.save.data.equipped[kind];
    let lockedCount = 0;
    for (const c of choices(kind)) {
      if (c.id !== null && !this.save.owns(c.id)) {
        lockedCount++;
        continue;
      }
      const chip = document.createElement("button");
      chip.className = "customizer-chip";
      chip.title = c.label;
      if (c.swatch.startsWith("emoji:")) {
        chip.textContent = c.swatch.slice(6);
      } else {
        chip.style.background = c.swatch;
      }
      if (equippedId === c.id) chip.classList.add("selected");
      chip.addEventListener("click", () => {
        this.save.equip(kind, c.id);
        this.hooks.sfxPlay("click");
        this.hooks.onChanged();
        this.render();
      });
      row.appendChild(chip);
    }

    section.append(title, row);
    if (lockedCount > 0) {
      const hint = document.createElement("div");
      hint.className = "customizer-hint";
      hint.textContent = `${lockedCount} more in the Shop! 🛒`;
      section.appendChild(hint);
    }
    return section;
  }
}
