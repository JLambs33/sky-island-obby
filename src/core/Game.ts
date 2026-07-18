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
import type { CourseDef, CourseId } from "../world/courses/defs";
import type { GameHost } from "../world/types";
import { SaveManager } from "../save/SaveManager";
import { Sfx, type SfxName } from "../audio/Sfx";
import { Hud } from "../ui/Hud";
import { TouchControls } from "../ui/TouchControls";
import { Menu } from "../ui/Menu";
import { Shop } from "../ui/Shop";

const COURSES: Record<CourseId, CourseDef> = { easy: EASY, medium: MEDIUM, hard: HARD };
const RETURN_TO_HUB_SECONDS = 3;

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

  private hub: Hub | null = null;
  private course: Course | null = null;
  private shopOpen = false;
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
    });
    this.hud.setMuted(this.sfx.muted);
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
    new Menu(ui, () => {
      this.sfx.unlock();
      this.sfx.play("click");
      this.state = "hub";
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
    if (this.state !== "menu" && !this.shopOpen) {
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

  private enterHub(): void {
    this.removeWorld();
    this.hub = new Hub(this, this.signSubs());
    this.scene.add(this.hub.group);
    this.player.teleport(this.hub.spawn.x, this.hub.spawn.y, this.hub.spawn.z, Math.PI);
    this.followCam.snap(this.player.pos, 0);
    this.hud.showHub();
    this.state = "hub";
  }

  enterCourse(id: CourseId): void {
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

  private signSubs(): Record<CourseId, string> {
    const subs = {} as Record<CourseId, string>;
    for (const def of Object.values(COURSES)) {
      const best = this.save.data.bestTimes[def.id];
      subs[def.id] =
        best === undefined ? "Walk through to play!" : `Best: ${best.toFixed(1)}s ${this.medalFor(def, best)}`;
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

  courseComplete(timeSec: number): void {
    if (!this.course) return;
    const def = this.course.def;
    this.sfx.play("win");
    this.addCoins(def.bonus);
    const newBest = this.save.recordTime(def.id, timeSec);
    const medal = this.medalFor(def, timeSec);
    this.hud.toast(
      `🏆 ${def.name} complete! ${medal}\n+${def.bonus} coins${newBest ? " · New best time!" : ""}`,
      2800,
    );
    this.returnTimer = RETURN_TO_HUB_SECONDS;
  }

  openShop(): void {
    if (this.state !== "hub" || this.shopOpen) return;
    this.shopOpen = true;
    this.input.controller.setEnabled(false);
    this.sfx.play("click");
    this.shop.open();
  }

  private applyCosmetics(): void {
    const e = this.save.data.equipped;
    this.player.applyCosmetics(e.skin, e.hat, e.trail);
  }
}
