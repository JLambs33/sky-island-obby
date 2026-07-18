/**
 * Generates the PWA icons (512/192 + apple-touch-icon 180) with zero deps:
 * simple shape rasterizer → hand-rolled PNG encoder using node's zlib.
 * Run via `npm run icons`; outputs are committed in public/icons/.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

// ---------- PNG encoding ----------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // Filter byte 0 prepended to each scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- Drawing ----------

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };
  const rect = (x0, y0, x1, y1, r, g, b) => {
    for (let y = Math.round(y0 * size); y < y1 * size; y++)
      for (let x = Math.round(x0 * size); x < x1 * size; x++) set(x, y, r, g, b);
  };
  const ellipse = (cx, cy, rx, ry, r, g, b) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = (x / size - cx) / rx;
        const dy = (y / size - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, r, g, b);
      }
  };

  // Sky gradient.
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(0x6e + (0xc2 - 0x6e) * t);
    const g = Math.round(0xc2 + (0xe8 - 0xc2) * t);
    const b = 0xf7;
    for (let x = 0; x < size; x++) set(x, y, r, g, b);
  }
  // Sun.
  ellipse(0.79, 0.2, 0.13, 0.13, 0xff, 0xd6, 0x40);
  // Cloud.
  ellipse(0.22, 0.24, 0.11, 0.055, 0xff, 0xff, 0xff);
  ellipse(0.32, 0.22, 0.09, 0.05, 0xff, 0xff, 0xff);
  // Floating island: dirt underside, grass top.
  ellipse(0.5, 0.74, 0.3, 0.13, 0x9b, 0x6b, 0x3f);
  ellipse(0.5, 0.68, 0.34, 0.09, 0x58, 0xc0, 0x4d);
  // Blocky character standing on the island.
  rect(0.44, 0.32, 0.56, 0.44, 0xff, 0xdd, 0xb0); // head
  rect(0.46, 0.35, 0.485, 0.38, 0x33, 0x33, 0x33); // eyes
  rect(0.515, 0.35, 0.54, 0.38, 0x33, 0x33, 0x33);
  rect(0.43, 0.45, 0.57, 0.6, 0xe8, 0x4c, 0x3c); // torso
  rect(0.39, 0.45, 0.425, 0.58, 0xff, 0xdd, 0xb0); // arms
  rect(0.575, 0.45, 0.61, 0.58, 0xff, 0xdd, 0xb0);
  rect(0.44, 0.6, 0.49, 0.68, 0x2f, 0x4f, 0x8f); // legs
  rect(0.51, 0.6, 0.56, 0.68, 0x2f, 0x4f, 0x8f);
  return px;
}

for (const [name, size] of [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(outDir, name), encodePng(size, drawIcon(size)));
  console.log(`wrote icons/${name}`);
}
