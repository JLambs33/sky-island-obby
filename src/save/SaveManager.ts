/**
 * SaveManager — versioned JSON in localStorage. Storage is injected so the
 * logic unit-tests in node without a browser. Every mutation persists
 * immediately; there is nothing to lose on a crash or tab kill.
 */

export interface SaveData {
  version: 1;
  coins: number;
  owned: string[];
  equipped: { skin: string; hat: string | null; trail: string | null };
  /** Best completion time in seconds, per course id. */
  bestTimes: Record<string, number>;
  muted: boolean;
}

const KEY = "sky-obby-save";

const defaults = (): SaveData => ({
  version: 1,
  coins: 0,
  owned: ["classic"],
  equipped: { skin: "classic", hat: null, trail: null },
  bestTimes: {},
  muted: false,
});

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      if (parsed.version !== 1) return defaults();
      // Merge over defaults so missing fields (older saves) heal themselves.
      const d = defaults();
      return {
        ...d,
        ...parsed,
        version: 1,
        equipped: { ...d.equipped, ...parsed.equipped },
        bestTimes: { ...parsed.bestTimes },
        owned: Array.isArray(parsed.owned) && parsed.owned.length > 0 ? parsed.owned : d.owned,
      };
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

  equip(kind: "skin" | "hat" | "trail", id: string | null): void {
    if (kind === "skin") {
      if (id !== null) this.data.equipped.skin = id;
    } else {
      this.data.equipped[kind] = id;
    }
    this.persist();
  }

  /** Record a completion; returns true when it's a new best. */
  recordTime(courseId: string, seconds: number): boolean {
    const prev = this.data.bestTimes[courseId];
    if (prev !== undefined && prev <= seconds) return false;
    this.data.bestTimes[courseId] = seconds;
    this.persist();
    return true;
  }

  setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.persist();
  }
}
