# Sky Island Obby

A Roblox-style 3D obstacle-course ("obby") game for kids 8–12. three.js + Vite + TypeScript,
no backend — progress lives in localStorage. Ships as a PWA playable offline on an iPad
saved to the home screen, with keyboard/mouse on desktop and touch controls (virtual
joystick + jump button) on tablets.

## Commands

- `npm run dev` — dev server (add `--host` to test on iPad over LAN)
- `npm run build` — typecheck + production build to `dist/`
- `npm run typecheck` / `npm test` — checks (vitest covers pure logic only)
- `npm run icons` — regenerate PWA icons into `public/icons/` (zero-dep PNG writer)

## Architecture

- **Fixed-step simulation** (`core/Time.ts`, 60 Hz) decoupled from render; adapted from
  `~/Code/detective-game`. One WebGL context, pixel ratio capped at 2 (iOS Safari limits).
- **Input** (`src/input/`): game logic only reads intents (`move`, `lookDelta`, `jumpPressed`)
  from `InputController`; the touch + keyboard/mouse drivers both stay active so hybrid
  devices just work. The on-screen jump button feeds a `ButtonsDriver`. No pointer lock —
  drag-to-orbit is the single camera scheme everywhere.
- **Physics** (`world/physics.ts`): pure AABB axis-separated collision, no physics engine.
  Player is a box; every solid is a box. Moving platforms carry the player via per-step deltas.
- **Courses** (`world/courses/*.ts`) are data-only piece lists; `world/Course.ts` instantiates
  pieces (`world/pieces/`) and runs triggers (coins, checkpoints, lava, trophy).
- **Game flow** (`core/Game.ts`): Menu → Hub ⇄ Course; shop is a DOM overlay. Walk-into
  triggers (portals, shop pad) — no raycast/tap interactions.
- **Saves** (`save/SaveManager.ts`): versioned JSON in localStorage — coins, owned/equipped
  cosmetics, best times.
- **Audio** (`audio/Sfx.ts`): WebAudio-synthesized SFX, no asset files. Must resume on first
  user gesture (iOS).
- **PWA**: `public/sw.js` cache-first with network-first navigations; iOS standalone config
  is meta tags in `index.html`, not the manifest.

## Conventions

- No per-frame allocation in input/physics hot paths (reuse out-params).
- All world geometry is procedural three.js primitives — no external assets.
- Course tuning constants: jump ≈ 1.8 m high / ≈ 4.5 m flat gap at full run speed.
  Keep required gaps ≤ 3.5 m (easy ≤ 2.5) so kids clear them with margin.
