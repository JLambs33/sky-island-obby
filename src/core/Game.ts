/**
 * Game — the orchestrator and state machine: Menu → Hub ⇄ Course, with the
 * shop as a DOM overlay that pauses world input. Owns the fixed-step loop and
 * everything the worlds need (player, camera, input, save, sfx, UI).
 */

import type { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { Mesh, Sprite, type Object3D } from "three";
import { Time } from "./Time";
import { createInputController, type InputSetup } from "../input/InputController";
import { Player } from "../world/Player";
import { FollowCamera } from "../world/FollowCamera";
import { Environment } from "../world/environment";
import { Hub } from "../world/Hub";
import { Course } from "../world/Course";
import { EASY } from "../world/courses/easy";
import { MEDIUM } from "../world/courses/medium";
import { HARD } from "../world/courses/hard";
import { CANDY } from "../world/courses/candy";
import { GEARS } from "../world/courses/gears";
import { VOLCANO } from "../world/courses/volcano";
import type { CourseDef, CourseId } from "../world/courses/defs";
import type { GameHost } from "../world/types";
import { heightById } from "../world/cosmetics";
import { SaveManager } from "../save/SaveManager";
import { Sfx, type SfxName } from "../audio/Sfx";
import { Music } from "../audio/Music";
import { Hud } from "../ui/Hud";
import { TouchControls } from "../ui/TouchControls";
import { Menu } from "../ui/Menu";
import { Shop } from "../ui/Shop";
import { Customizer } from "../ui/Customizer";
import { Settings } from "../ui/Settings";

const COURSES: Record<CourseId, CourseDef> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
  candy: CANDY,
  gears: GEARS,
  volcano: VOLCANO,
};
const LOCK_HINTS: Record<CourseId, string> = {
  easy: "",
  medium: "",
  hard: "",
  candy: "Finish any course!",
  gears: "Finish Candy Rush!",
  volcano: "Finish Gear Works!",
};
const RETURN_TO_HUB_SECONDS = 3;
const STAR_BONUS = 100;

type State = "menu" | "hub" | "course";

function disposeGroup(root: Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      const m = obj.material;
      if (Array.isArray(m)) m.forEach((mat) => mat.dispose());
      else m.dispose();
    } else if (obj instanceof Sprite) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
}

export class Game implements GameHost {
  private state: State = "menu";
  private readonly time = new Time();
  private readonly input: InputSetup;
  private readonly player = new Player();
  private readonly followCam: FollowCamera;
  private readonly env: Environment;
  private readonly save = new SaveManager(localStorage);
  private readonly sfx = new Sfx();
  private readonly hud: Hud;
  private readonly touchControls: TouchControls;
  private readonly shop: Shop;
  private readonly customizer: Customizer;
  private readonly settings: Settings;
  private readonly music = new Music();

  private hub: Hub | null = null;
  private course: Course | null = null;
  private shopOpen = false;
  private customizerOpen = false;
  private settingsOpen = false;
  private returnTimer = 0;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly scene: Scene,
    private readonly camera: PerspectiveCamera,
  ) {
    this.env = new Environment(scene);
    this.followCam = new FollowCamera(camera);
    this.input = createInputController(renderer.domElement);
    this.sfx.muted = this.save.data.muted;

    const ui = document.getElementById("ui")!;
    this.hud = new Hud(ui, {
      onHome: () => {
        if (this.state === "course") {
          this.sfx.play("click");
          this.enterHub();
        }
      },
      onToggleMute: () => {
        this.sfx.muted = !this.sfx.muted;
        this.save.setMuted(this.sfx.muted);
        return this.sfx.muted;
      },
      onToggleMusic: () => {
        const on = !this.save.data.musicOn;
        this.save.setMusicOn(on);
        this.syncMusic();
        return on;
      },
      onSettings: () => this.openSettings(),
    });
    this.hud.setMuted(this.sfx.muted);
    this.hud.setMusicOn(this.save.data.musicOn);
    this.hud.setCoins(this.save.data.coins);
    this.touchControls = new TouchControls(ui, this.input.touch, this.input.buttons);
    this.shop = new Shop(ui, this.save, {
      onClose: () => {
        this.shopOpen = false;
        this.input.controller.setEnabled(true);
      },
      onChanged: () => this.applyCosmetics(),
      sfxPlay: (name) => this.sfx.play(name),
    });
    this.customizer = new Customizer(ui, this.save, {
      onClose: () => {
        this.customizerOpen = false;
        this.input.controller.setEnabled(true);
        this.followCam.snap(this.player.pos, this.followCam.yaw);
      },
      onChanged: () => this.applyCosmetics(),
      sfxPlay: (name) => this.sfx.play(name),
    });
    this.settings = new Settings(ui, this.save, {
      onClose: () => {
        this.settingsOpen = false;
        this.input.controller.setEnabled(true);
      },
      onRestored: () => {
        this.sfx.muted = this.save.data.muted;
        this.hud.setMuted(this.sfx.muted);
        this.hud.setMusicOn(this.save.data.musicOn);
        this.syncMusic();
        this.hud.setCoins(this.save.data.coins);
        this.applyCosmetics();
      },
      sfxPlay: (name) => this.sfx.play(name),
    });
    new Menu(ui, () => {
      this.sfx.unlock();
      this.sfx.play("click");
      this.state = "hub";
      this.syncMusic();
    });

    this.applyCosmetics();
    this.scene.add(this.player.root);
    this.enterHub();
    this.state = "menu"; // hub is built and visible behind the menu overlay

    // Re-baseline the clock when returning from a backgrounded tab so we
    // don't fast-forward the simulation through skipped time.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.time.reset();
    });
  }

  /** Called once per animation frame from main.ts. */
  frame(nowMs: number): void {
    const { steps } = this.time.frame(nowMs);
    for (let i = 0; i < steps; i++) this.step(this.time.fixedDeltaSeconds);
    this.touchControls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private step(dt: number): void {
    this.env.update(dt);
    if (this.state !== "menu" && !this.shopOpen && !this.settingsOpen) {
      if (this.state === "hub" && this.hub) {
        this.hub.step(dt, this.input.controller, this.followCam.yaw, this.player);
      } else if (this.state === "course" && this.course) {
        this.course.step(dt, this.input.controller, this.followCam.yaw);
        this.hud.setTimer(this.course.elapsed);
        if (this.course.completed) {
          this.returnTimer -= dt;
          if (this.returnTimer <= 0) this.enterHub();
        }
      }
      this.followCam.update(dt, this.input.controller.lookDelta, this.player.pos);
    }
    this.input.controller.endFrame();
  }

  // ---------- world transitions ----------

  private removeWorld(): void {
    if (this.hub) {
      this.scene.remove(this.hub.group);
      disposeGroup(this.hub.group);
      this.hub = null;
    }
    if (this.course) {
      this.scene.remove(this.course.group);
      disposeGroup(this.course.group);
      this.course = null;
    }
  }

  enterHub(): void {
    this.removeWorld();
    this.hub = new Hub(this, this.signSubs(), this.unlockedCourses(), LOCK_HINTS);
    this.scene.add(this.hub.group);
    // heading 0 = facing +Z, toward the camera — a friendly hello.
    this.player.teleport(this.hub.spawn.x, this.hub.spawn.y, this.hub.spawn.z, 0);
    this.followCam.snap(this.player.pos, 0);
    this.hud.showHub();
    this.state = "hub";
  }

  enterCourse(id: CourseId): void {
    if (!this.unlockedCourses()[id]) return; // hub gates this; belt and braces
    const def = COURSES[id];
    this.removeWorld();
    this.course = new Course(def, this, this.player);
    this.scene.add(this.course.group);
    this.course.begin();
    this.followCam.snap(this.player.pos, 0);
    this.hud.showCourse(def.name);
    this.toast(`${def.name}\nGO!`);
    this.state = "course";
  }

  private unlockedCourses(): Record<CourseId, boolean> {
    const c = this.save.data.completions;
    return {
      easy: true,
      medium: true,
      hard: true,
      candy: this.save.totalCompletions() >= 1,
      gears: (c["candy"] ?? 0) >= 1,
      volcano: (c["gears"] ?? 0) >= 1,
    };
  }

  private signSubs(): Record<CourseId, string> {
    const subs = {} as Record<CourseId, string>;
    for (const def of Object.values(COURSES)) {
      const best = this.save.data.bestTimes[def.id];
      const star = this.save.data.stars.includes(def.id) ? " ⭐" : "";
      subs[def.id] =
        best === undefined
          ? "Walk through to play!"
          : `Best: ${best.toFixed(1)}s ${this.medalFor(def, best)}${star}`;
    }
    return subs;
  }

  private medalFor(def: CourseDef, seconds: number): string {
    if (seconds <= def.medals.gold) return "🥇";
    if (seconds <= def.medals.silver) return "🥈";
    return "🥉";
  }

  // ---------- GameHost ----------

  addCoins(n: number): void {
    this.save.addCoins(n);
    this.hud.setCoins(this.save.data.coins);
  }

  toast(msg: string): void {
    this.hud.toast(msg);
  }

  sfxPlay(name: SfxName): void {
    this.sfx.play(name);
  }

  courseComplete(timeSec: number, coinsCollected: number, totalCoins: number): void {
    if (!this.course) return;
    const def = this.course.def;
    this.sfx.play("win");
    const unlockedBefore = this.unlockedCourses();
    this.save.recordCompletion(def.id);
    const newBest = this.save.recordTime(def.id, timeSec);
    const medal = this.medalFor(def, timeSec);

    let bonus = def.bonus;
    const lines = [`🏆 ${def.name} complete! ${medal}`];
    if (coinsCollected === totalCoins && totalCoins > 0 && this.save.earnStar(def.id)) {
      bonus += STAR_BONUS;
      lines.push(`⭐ ALL ${totalCoins} coins! +${STAR_BONUS} bonus`);
      this.sfx.play("star");
    }
    lines.push(`+${bonus} coins${newBest ? " · New best time!" : ""}`);
    this.addCoins(bonus);

    const unlockedAfter = this.unlockedCourses();
    for (const id of Object.keys(unlockedAfter) as CourseId[]) {
      if (unlockedAfter[id] && !unlockedBefore[id]) {
        lines.push(`🎉 ${COURSES[id].name} unlocked!`);
        this.sfx.play("unlock");
      }
    }

    this.hud.toast(lines.join("\n"), 3400);
    this.returnTimer = RETURN_TO_HUB_SECONDS;
  }

  openShop(): void {
    if (this.state !== "hub" || this.shopOpen || this.customizerOpen || this.settingsOpen) return;
    this.shopOpen = true;
    this.input.controller.setEnabled(false);
    this.sfx.play("click");
    this.shop.open();
  }

  openCustomizer(): void {
    if (
      this.state !== "hub" ||
      this.shopOpen ||
      this.customizerOpen ||
      this.settingsOpen ||
      !this.hub
    )
      return;
    this.customizerOpen = true;
    this.input.controller.setEnabled(false);
    this.sfx.play("click");
    // Pose on the podium facing the camera; the live view is the preview.
    const spot = this.hub.studioSpot;
    this.player.teleport(spot.x, spot.y, spot.z, 0);
    this.followCam.snap(this.player.pos, 0);
    this.customizer.open();
  }

  openSettings(): void {
    if (this.shopOpen || this.customizerOpen || this.settingsOpen) return;
    this.settingsOpen = true;
    this.input.controller.setEnabled(false);
    this.sfx.play("click");
    this.settings.open();
  }

  private syncMusic(): void {
    const ctx = this.sfx.context;
    if (!ctx) return;
    if (this.save.data.musicOn && this.state !== "menu") this.music.start(ctx);
    else this.music.stop();
  }

  respawned(): void {
    // Snap instead of lerping back from the fall point: during the long
    // swoosh, camera-relative input steers somewhere the player doesn't
    // expect, which is how respawn loops felt like "spawning in mid-air".
    this.followCam.snap(this.player.pos, this.followCam.yaw);
  }

  private applyCosmetics(): void {
    const e = this.save.data.equipped;
    const b = this.save.data.body;
    this.player.applyCosmetics(e.skin, e.hat, e.trail, e.face, e.aura, b.skinTone, heightById(b.height).scale);
  }
}
