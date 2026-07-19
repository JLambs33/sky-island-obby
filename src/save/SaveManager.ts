/**
 * SaveManager — versioned JSON in localStorage. Storage is injected so the
 * logic unit-tests in node without a browser. Every mutation persists
 * immediately; there is nothing to lose on a crash or tab kill.
 *
 * v2 added face/aura cosmetic slots, per-course completion counts
 * (progression unlocks), all-coins stars, and the music toggle. v3 adds free
 * body customization (skin tone, height) independent of shop purchases, plus
 * a portable backup code (exportCode/importCode) since there's no backend —
 * clearing browser storage would otherwise erase progress permanently. Older
 * saves migrate in place.
 */

export interface SaveData {
  version: 3;
  coins: number;
  owned: string[];
  equipped: {
    skin: string;
    hat: string | null;
    trail: string | null;
    face: string;
    aura: string | null;
  };
  /** Free body customization — not gated by ownership. */
  body: {
    skinTone: string;
    height: string;
  };
  /** Best completion time in seconds, per course id. */
  bestTimes: Record<string, number>;
  /** Times each course has been completed (drives unlocks). */
  completions: Record<string, number>;
  /** Course ids where every coin was collected in a single run. */
  stars: string[];
  muted: boolean;
  musicOn: boolean;
}

const KEY = "sky-obby-save";
const CODE_PREFIX = "SKYOBBY1:";

const defaults = (): SaveData => ({
  version: 3,
  coins: 0,
  owned: ["classic", "face-classic"],
  equipped: { skin: "classic", hat: null, trail: null, face: "face-classic", aura: null },
  body: { skinTone: "tone-2", height: "height-medium" },
  bestTimes: {},
  completions: {},
  stars: [],
  muted: false,
  musicOn: true,
});

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type CosmeticKind = "skin" | "hat" | "trail" | "face" | "aura";
export type BodyKind = "skinTone" | "height";

type LooseSave = Partial<Omit<SaveData, "version" | "equipped" | "body">> & {
  version?: number;
  equipped?: Partial<SaveData["equipped"]>;
  body?: Partial<SaveData["body"]>;
};

/** Merge a partial/older save over fresh defaults, healing missing fields. */
function heal(parsed: LooseSave): SaveData {
  const d = defaults();
  const merged: SaveData = {
    ...d,
    ...parsed,
    version: 3,
    equipped: { ...d.equipped, ...parsed.equipped },
    body: { ...d.body, ...parsed.body },
    bestTimes: { ...parsed.bestTimes },
    completions: { ...parsed.completions },
    stars: Array.isArray(parsed.stars) ? parsed.stars : [],
    owned: Array.isArray(parsed.owned) && parsed.owned.length > 0 ? parsed.owned : d.owned,
  };
  for (const id of d.owned) if (!merged.owned.includes(id)) merged.owned.push(id);
  return merged;
}

export class SaveManager {
  readonly data: SaveData;

  constructor(private readonly storage: StorageLike) {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw) as LooseSave;
      if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) return defaults();
      return heal(parsed);
    } catch {
      return defaults();
    }
  }

  private persist(): void {
    try {
      this.storage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Storage full/blocked — keep playing with in-memory state.
    }
  }

  addCoins(n: number): void {
    this.data.coins += n;
    this.persist();
  }

  /** Spend if affordable; returns whether the purchase went through. */
  spend(n: number): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.persist();
    return true;
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id);
  }

  own(id: string): void {
    if (!this.owns(id)) {
      this.data.owned.push(id);
      this.persist();
    }
  }

  equip(kind: CosmeticKind, id: string | null): void {
    if (kind === "skin" || kind === "face") {
      if (id !== null) this.data.equipped[kind] = id;
    } else {
      this.data.equipped[kind] = id;
    }
    this.persist();
  }

  /** Free body customization (skin tone, height) — always available. */
  setBody(kind: BodyKind, id: string): void {
    this.data.body[kind] = id;
    this.persist();
  }

  /** Record a completion; returns true when it's a new best time. */
  recordTime(courseId: string, seconds: number): boolean {
    const prev = this.data.bestTimes[courseId];
    if (prev !== undefined && prev <= seconds) return false;
    this.data.bestTimes[courseId] = seconds;
    this.persist();
    return true;
  }

  recordCompletion(courseId: string): void {
    this.data.completions[courseId] = (this.data.completions[courseId] ?? 0) + 1;
    this.persist();
  }

  totalCompletions(): number {
    return Object.values(this.data.completions).reduce((a, b) => a + b, 0);
  }

  /** Record an all-coins star; returns true when newly earned. */
  earnStar(courseId: string): boolean {
    if (this.data.stars.includes(courseId)) return false;
    this.data.stars.push(courseId);
    this.persist();
    return true;
  }

  setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.persist();
  }

  setMusicOn(on: boolean): void {
    this.data.musicOn = on;
    this.persist();
  }

  /** A short copyable code encoding the entire save, for backup/restore. */
  exportCode(): string {
    return CODE_PREFIX + btoa(JSON.stringify(this.data));
  }

  /**
   * Restore from a code produced by exportCode(). Overwrites current
   * progress in place (same object reference, so callers holding `data`
   * see the update). Returns an error message on any malformed input
   * instead of throwing.
   */
  importCode(code: string): { ok: true } | { ok: false; error: string } {
    const trimmed = code.trim();
    if (!trimmed.startsWith(CODE_PREFIX)) {
      return { ok: false, error: "That code doesn't look right. Double-check and try again." };
    }
    let parsed: LooseSave;
    try {
      parsed = JSON.parse(atob(trimmed.slice(CODE_PREFIX.length))) as LooseSave;
    } catch {
      return { ok: false, error: "That code doesn't look right. Double-check and try again." };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "That code doesn't look right. Double-check and try again." };
    }
    if (parsed.version !== 1 && parsed.version !== 2 && parsed.version !== 3) {
      return { ok: false, error: "That code doesn't look right. Double-check and try again." };
    }
    Object.assign(this.data, heal(parsed));
    this.persist();
    return { ok: true };
  }
}
