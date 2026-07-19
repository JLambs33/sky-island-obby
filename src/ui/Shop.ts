/**
 * Shop overlay — five cosmetic tabs with rarity-tiered cards, big touch
 * targets. Buying auto-equips; tapping an equipped hat/trail/aura removes it
 * (skins and faces always have one equipped). All state lives in SaveManager;
 * this class just renders it.
 */

import { AURAS, FACES, HATS, SKINS, TRAILS, type Rarity } from "../world/cosmetics";
import type { CosmeticKind, SaveManager } from "../save/SaveManager";
import type { SfxName } from "../audio/Sfx";

interface Item {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  swatch: string; // CSS background
}

const css = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

const FACE_SWATCHES: Record<string, string> = {
  "face-classic": "🙂",
  "face-happy": "😄",
  "face-wink": "😉",
  "face-wow": "😮",
  "face-cool": "😎",
};

const CATALOG: Record<CosmeticKind, Item[]> = {
  skin: SKINS.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    rarity: s.rarity,
    swatch: `linear-gradient(${css(s.torso)} 55%, ${css(s.legs)} 45%)`,
  })),
  hat: HATS.map((h) => ({ id: h.id, name: h.name, price: h.price, rarity: h.rarity, swatch: css(h.color) })),
  trail: TRAILS.map((t) => ({
    id: t.id,
    name: t.name,
    price: t.price,
    rarity: t.rarity,
    swatch: `linear-gradient(90deg, ${t.colors.map(css).join(", ")})`,
  })),
  face: FACES.map((f) => ({ id: f.id, name: f.name, price: f.price, rarity: f.rarity, swatch: "face" })),
  aura: AURAS.map((a) => ({
    id: a.id,
    name: a.name,
    price: a.price,
    rarity: a.rarity,
    swatch: `radial-gradient(circle, ${a.colors.map(css).join(", ")})`,
  })),
};

const TAB_LABELS: Record<CosmeticKind, string> = {
  skin: "Skins",
  hat: "Hats",
  trail: "Trails",
  face: "Faces",
  aura: "Auras",
};

const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  rare: "Rare ◆",
  epic: "Epic ★",
  legendary: "Legendary ✦",
};

export class Shop {
  private readonly overlay: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly tabButtons = new Map<CosmeticKind, HTMLButtonElement>();
  private activeTab: CosmeticKind = "skin";

  constructor(
    ui: HTMLElement,
    private readonly save: SaveManager,
    private readonly hooks: {
      onClose: () => void;
      onChanged: () => void;
      sfxPlay: (name: SfxName) => void;
    },
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "overlay hidden";

    const panel = document.createElement("div");
    panel.className = "shop-panel";

    const head = document.createElement("div");
    head.className = "shop-head";
    const title = document.createElement("span");
    title.textContent = "🛒 Shop";
    this.coinsEl = document.createElement("span");
    const close = document.createElement("button");
    close.className = "round-btn";
    close.textContent = "✕";
    close.addEventListener("click", () => this.close());
    head.append(title, this.coinsEl, close);

    const tabs = document.createElement("div");
    tabs.className = "shop-tabs";
    for (const kind of ["skin", "hat", "trail", "face", "aura"] as CosmeticKind[]) {
      const btn = document.createElement("button");
      btn.textContent = TAB_LABELS[kind];
      btn.addEventListener("click", () => {
        this.activeTab = kind;
        this.hooks.sfxPlay("click");
        this.render();
      });
      this.tabButtons.set(kind, btn);
      tabs.appendChild(btn);
    }

    this.grid = document.createElement("div");
    this.grid.className = "shop-grid";

    panel.append(head, tabs, this.grid);
    this.overlay.appendChild(panel);
    ui.appendChild(this.overlay);
  }

  open(): void {
    this.overlay.classList.remove("hidden");
    this.render();
  }

  close(): void {
    this.overlay.classList.add("hidden");
    this.hooks.sfxPlay("click");
    this.hooks.onClose();
  }

  private render(): void {
    this.coinsEl.textContent = `🪙 ${this.save.data.coins}`;
    for (const [kind, btn] of this.tabButtons) {
      btn.classList.toggle("active", kind === this.activeTab);
    }

    this.grid.replaceChildren();
    for (const item of CATALOG[this.activeTab]) {
      this.grid.appendChild(this.renderItem(this.activeTab, item));
    }
  }

  private renderItem(kind: CosmeticKind, item: Item): HTMLElement {
    const card = document.createElement("div");
    card.className = `shop-item r-${item.rarity}`;

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    if (item.swatch === "face") {
      swatch.classList.add("swatch-emoji");
      swatch.textContent = FACE_SWATCHES[item.id] ?? "🙂";
    } else {
      swatch.style.background = item.swatch;
    }

    const name = document.createElement("span");
    name.textContent = item.name;

    const rarity = document.createElement("span");
    rarity.className = "rarity-label";
    rarity.textContent = RARITY_LABELS[item.rarity];

    const btn = document.createElement("button");
    const equippedId = this.save.data.equipped[kind];
    const equipped = equippedId === item.id;
    const owned = this.save.owns(item.id) || item.price === 0;
    const removable = kind === "hat" || kind === "trail" || kind === "aura";

    if (equipped && !removable) {
      btn.textContent = "Equipped";
      btn.className = "equipped";
      btn.disabled = true;
    } else if (equipped) {
      btn.textContent = "Remove";
      btn.className = "equipped";
      btn.addEventListener("click", () => this.equip(kind, null));
    } else if (owned) {
      btn.textContent = "Equip";
      btn.addEventListener("click", () => this.equip(kind, item.id));
    } else {
      btn.textContent = `🪙 ${item.price}`;
      btn.addEventListener("click", () => this.buy(kind, item));
    }

    card.append(swatch, name, rarity, btn);
    return card;
  }

  private buy(kind: CosmeticKind, item: Item): void {
    if (!this.save.spend(item.price)) {
      this.hooks.sfxPlay("denied");
      return;
    }
    this.save.own(item.id);
    this.save.equip(kind, item.id);
    this.hooks.sfxPlay("buy");
    this.hooks.onChanged();
    this.render();
  }

  private equip(kind: CosmeticKind, id: string | null): void {
    this.save.equip(kind, id);
    this.hooks.sfxPlay("click");
    this.hooks.onChanged();
    this.render();
  }
}
