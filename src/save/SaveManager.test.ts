import { describe, it, expect } from "vitest";
import { SaveManager } from "./SaveManager";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

describe("SaveManager", () => {
  it("starts with defaults on empty storage", () => {
    const save = new SaveManager(memoryStorage());
    expect(save.data.coins).toBe(0);
    expect(save.data.equipped.skin).toBe("classic");
    expect(save.owns("classic")).toBe(true);
  });

  it("recovers defaults from corrupted JSON", () => {
    const save = new SaveManager(memoryStorage({ "sky-obby-save": "{not json!!" }));
    expect(save.data.coins).toBe(0);
  });

  it("persists coins and reloads them", () => {
    const storage = memoryStorage();
    new SaveManager(storage).addCoins(45);
    const reloaded = new SaveManager(storage);
    expect(reloaded.data.coins).toBe(45);
  });

  it("spend fails without funds and succeeds with them", () => {
    const save = new SaveManager(memoryStorage());
    expect(save.spend(10)).toBe(false);
    save.addCoins(25);
    expect(save.spend(10)).toBe(true);
    expect(save.data.coins).toBe(15);
  });

  it("owning and equipping cosmetics round-trips through storage", () => {
    const storage = memoryStorage();
    const save = new SaveManager(storage);
    save.own("ocean");
    save.equip("skin", "ocean");
    save.equip("hat", "cap");
    save.equip("hat", null); // unequip
    const reloaded = new SaveManager(storage);
    expect(reloaded.owns("ocean")).toBe(true);
    expect(reloaded.data.equipped.skin).toBe("ocean");
    expect(reloaded.data.equipped.hat).toBeNull();
  });

  it("recordTime keeps only improvements", () => {
    const save = new SaveManager(memoryStorage());
    expect(save.recordTime("easy", 60)).toBe(true);
    expect(save.recordTime("easy", 80)).toBe(false);
    expect(save.recordTime("easy", 42)).toBe(true);
    expect(save.data.bestTimes["easy"]).toBe(42);
  });

  it("heals missing fields from older/partial saves", () => {
    const storage = memoryStorage({
      "sky-obby-save": JSON.stringify({ version: 1, coins: 7 }),
    });
    const save = new SaveManager(storage);
    expect(save.data.coins).toBe(7);
    expect(save.data.equipped.skin).toBe("classic");
    expect(save.data.owned).toContain("classic");
  });

  it("migrates a v1 save to v2, keeping progress and adding new fields", () => {
    const v1 = {
      version: 1,
      coins: 340,
      owned: ["classic", "ocean", "cap"],
      equipped: { skin: "ocean", hat: "cap", trail: null },
      bestTimes: { easy: 41.2 },
      muted: true,
    };
    const storage = memoryStorage({ "sky-obby-save": JSON.stringify(v1) });
    const save = new SaveManager(storage);
    expect(save.data.version).toBe(2);
    expect(save.data.coins).toBe(340);
    expect(save.data.equipped.skin).toBe("ocean");
    expect(save.data.equipped.hat).toBe("cap");
    expect(save.data.equipped.face).toBe("face-classic");
    expect(save.data.equipped.aura).toBeNull();
    expect(save.data.owned).toContain("face-classic"); // default granted
    expect(save.data.bestTimes["easy"]).toBeCloseTo(41.2);
    expect(save.data.completions).toEqual({});
    expect(save.data.stars).toEqual([]);
    expect(save.data.muted).toBe(true);
    expect(save.data.musicOn).toBe(true);
  });

  it("tracks completions, total, and stars", () => {
    const storage = memoryStorage();
    const save = new SaveManager(storage);
    save.recordCompletion("easy");
    save.recordCompletion("easy");
    save.recordCompletion("candy");
    expect(save.data.completions["easy"]).toBe(2);
    expect(save.totalCompletions()).toBe(3);

    expect(save.earnStar("easy")).toBe(true);
    expect(save.earnStar("easy")).toBe(false); // only once
    const reloaded = new SaveManager(storage);
    expect(reloaded.data.stars).toEqual(["easy"]);
    expect(reloaded.totalCompletions()).toBe(3);
  });

  it("face cannot be unequipped, aura can", () => {
    const save = new SaveManager(memoryStorage());
    save.equip("face", "face-cool");
    save.equip("face", null); // ignored
    expect(save.data.equipped.face).toBe("face-cool");
    save.equip("aura", "aura-spark");
    save.equip("aura", null);
    expect(save.data.equipped.aura).toBeNull();
  });
});
