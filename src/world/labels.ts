/**
 * Canvas-drawn text sprites for 3D signs (portal names, best times, shop).
 * Sprites always face the camera, which is exactly right for signage.
 */

import { CanvasTexture, Sprite, SpriteMaterial } from "three";

export function makeSign(title: string, sub: string, accent = "#35415a"): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 208, 36);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.textAlign = "center";
  ctx.font = "bold 72px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillText(title, 256, 100);
  ctx.fillStyle = "#6b7280";
  ctx.font = "bold 44px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillText(sub, 256, 172);

  const texture = new CanvasTexture(canvas);
  const sprite = new Sprite(new SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.4, 1.5, 1);
  return sprite;
}
