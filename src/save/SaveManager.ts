/**
 * SaveManager — versioned JSON in localStorage. Storage is injected so the
 * logic unit-tests in node without a browser. Every mutation persists
 * immediately; there is nothing to lose on a crash or tab kill.
 *
 * v2 adds face/aura cosmetic slots, per-course completion counts (progression
 * unlocks), all-coins stars, and the music toggle. v1 saves migrate in place.
 */

export interface SaveData {
  version: 2;
  coins: number;
  owned: string[];
  equipped: {
    skin: string;
    hat: string | null;
    trail: string | null;
    face: string;
    aura: string | null;
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

const defaults = (): SaveData => ({
  version: 2,
  coins: 0,
  owned: ["classic", "face-classic"],
  equipped: { skin: "classic", hat: null, trail: null, face: "face-classic", aura: null },
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

export class SaveManager {
  readonly data: SaveData;

  constructor(private readonly storage: StorageLike) {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = this.storage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw) as Partial<Omit<SaveData, "version">> & { version?: number };
      if (parsed.version !== 1 && parsed.version !== 2) return defaults();
      // v1 → v2 and partial saves both heal by merging over defaults.
      const d = defaults();
      const merged: SaveData = {
        ...d,
        ...parsed,
        version: 2,
        equipped: { ...d.equipped, ...parsed.equipped },
        bestTimes: { ...parsed.bestTimes },
        completions: { ...parsed.completions },
        stars: Array.isArray(parsed.stars) ? parsed.stars : [],
        owned: Array.isArray(parsed.owned) && parsed.owned.length > 0 ? parsed.owned : d.owned,
      };
      for (const id of d.owned) if (!merged.owned.includes(id)) merged.owned.push(id);
      return merged;
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
}
