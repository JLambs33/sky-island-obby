/**
 * Shop overlay — tabs for skins/hats/trails, big touch targets. Buying
 * auto-equips; tapping an equipped hat/trail removes it (skins always have
 * one equipped). All state lives in SaveManager; this class just renders it.
 */

import { HATS, SKINS, TRAILS } from "../world/cosmetics";
import type { SaveManager } from "../save/SaveManager";
import type { SfxName } from "../audio/Sfx";

type Kind = "skin" | "hat" | "trail";

interface Item {
  id: string;
  name: string;
  price: number;
  swatch: string; // CSS background
}

const css = (c: number) => `#${c.toString(16).padStart(6, "0")}`;

const CATALOG: Record<Kind, Item[]> = {
  skin: SKINS.map((s) => ({
    id: s.id,
    name: s.name,
    price: s.price,
    swatch: `linear-gradient(${css(s.torso)} 55%, ${css(s.legs)} 45%)`,
  })),
  hat: HATS.map((h) => ({ id: h.id, name: h.name, price: h.price, swatch: css(h.color) })),
  trail: TRAILS.map((t) => ({
    id: t.id,
    name: t.name,
    price: t.price,
    swatch: `linear-gradient(90deg, ${t.colors.map(css).join(", ")})`,
  })),
};

const TAB_LABELS: Record<Kind, string> = { skin: "Skins", hat: "Hats", trail: "Trails" };

export class Shop {
  private readonly overlay: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly tabButtons = new Map<Kind, HTMLButtonElement>();
  private activeTab: Kind = "skin";

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
    for (const kind of ["skin", "hat", "trail"] as Kind[]) {
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

  private renderItem(kind: Kind, item: Item): HTMLElement {
    const card = document.createElement("div");
    card.className = "shop-item";

    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.background = item.swatch;

    const name = document.createElement("span");
    name.textContent = item.name;

    const btn = document.createElement("button");
    const equippedId =
      kind === "skin"
        ? this.save.data.equipped.skin
        : kind === "hat"
          ? this.save.data.equipped.hat
          : this.save.data.equipped.trail;
    const equipped = equippedId === item.id;
    const owned = this.save.owns(item.id) || item.price === 0;

    if (equipped && kind === "skin") {
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

    card.append(swatch, name, btn);
    return card;
  }

  private buy(kind: Kind, item: Item): void {
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

  private equip(kind: Kind, id: string | null): void {
    this.save.equip(kind, id);
    this.hooks.sfxPlay("click");
    this.hooks.onChanged();
    this.render();
  }
}
