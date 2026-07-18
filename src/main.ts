/**
 * Bootstrap: one WebGL context, one render loop. The renderer is created once
 * and never recreated (iOS Safari WebGL context limits); pixel ratio is
 * capped at 2. Everything else lives in Game.
 */

import { PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { Game } from "./core/Game";

const app = document.getElementById("app")!;

const renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const camera = new PerspectiveCamera(60, 1, 0.1, 300);
const scene = new Scene();
const game = new Game(renderer, scene, camera);

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

renderer.setAnimationLoop((nowMs) => game.frame(nowMs));

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}
