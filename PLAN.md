# PLAN — Asteroid Shooter 3D → web

> The technical plan and the **packet index**. Each packet is a GitHub issue that holds its scope, done criteria,
> dependencies and open questions. `/refine-packet` sharpens the issue with Gilad, and `/spec-to-ship` delivers it.
> **Sync rule:** a packet PR ticks its own row below (✅, delivered-by, PR) and says `Closes #N`. The orchestrator does
> it in the ship phase, the reviewer checks it, and the `packet-pr` CI job enforces it.
>
> Live: <https://games.hochgi.com/asteroid-shooter-3d/> · Original (reference only): <https://github.com/hochgi/astroid-shooter-3D>
> Stance: a vibe-coded port, not a 1:1 restoration. **SPEC.md is the truth**. Improve wherever it's simpler or more idiomatic,
> and add cheap playability.

## 1. Packet index

Milestones: **tracer bullet** = the thinnest deployed end-to-end slice (fly a ship live) · **MVP** = the playable
milestone (★) · **shippable** = the version we'd show people · **nice to have** = the rest.
Status: 📋 open · 🔎 refined · 🚧 in progress · ✅ done.

| ✓ | Packet | Issue | Milestone | Status | Delivered by | PR |
|---|---|---|---|---|---|---|
| [x] | P00: Repo skeleton, harness, CI + Pages deploy | #21 (hidden) | tracer bullet | ✅ live | Coder Bot (manual, skip-pipeline) | direct push (pre-protection) |
| [x] | P01: SPEC.md v1 — core rules and defaults | [#22](https://github.com/shalevhoch/asteroid-shooter-3d/issues/22) (was #1) | tracer bullet | ✅ | Coder Bot (spec only, self-merged per Gilad) | [#43](https://github.com/shalevhoch/asteroid-shooter-3d/pull/43) |
| [x] | P02: Asset import and model gallery | [#23](https://github.com/shalevhoch/asteroid-shooter-3d/issues/23) (was #2) | tracer bullet | ✅ | Coder Bot (spec-to-ship, self-merged per Gilad) | [#44](https://github.com/shalevhoch/asteroid-shooter-3d/pull/44) |
| [x] | P03: Sim skeleton and flight model | [#24](https://github.com/shalevhoch/asteroid-shooter-3d/issues/24) (was #3) | tracer bullet | ✅ | Coder Bot (spec-to-ship, self-merged per Gilad) | [#45](https://github.com/shalevhoch/asteroid-shooter-3d/pull/45) |
| [x] | P04: Renderer loop and keyboard/mouse input | [#25](https://github.com/shalevhoch/asteroid-shooter-3d/issues/25) (was #4) | tracer bullet | ✅ live | Coder Bot (spec-to-ship, self-merged per Gilad) | [#46](https://github.com/shalevhoch/asteroid-shooter-3d/pull/46) |
| [ ] | P05: Asteroids, Earth and collisions | [#26](https://github.com/shalevhoch/asteroid-shooter-3d/issues/26) (was #5) | MVP | 📋 | | |
| [ ] | P06: Weapons and base scoring | [#27](https://github.com/shalevhoch/asteroid-shooter-3d/issues/27) (was #6) | MVP | 📋 | | |
| [ ] | P07: Game loop, HUD v0 and audio ★ playable | [#28](https://github.com/shalevhoch/asteroid-shooter-3d/issues/28) (was #7) | MVP | 📋 | | |
| [ ] | P08: Waves, objectives and difficulty presets | [#29](https://github.com/shalevhoch/asteroid-shooter-3d/issues/29) (was #8) | shippable | 📋 | | |
| [ ] | P09: Threat awareness (off-screen arrows, time-to-impact, radar) | [#30](https://github.com/shalevhoch/asteroid-shooter-3d/issues/30) (was #9) | shippable | 📋 | | |
| [ ] | P10: Scoring v2 and run summary | [#31](https://github.com/shalevhoch/asteroid-shooter-3d/issues/31) (was #10) | shippable | 📋 | | |
| [ ] | P11: FX foundation (instanced billboard batches) | [#32](https://github.com/shalevhoch/asteroid-shooter-3d/issues/32) (was #11) | shippable | 📋 | | |
| [ ] | P12: Line sprites and full explosion | [#33](https://github.com/shalevhoch/asteroid-shooter-3d/issues/33) (was #12) | shippable | 📋 | | |
| [ ] | P13: Pause, help and settings overlay | [#34](https://github.com/shalevhoch/asteroid-shooter-3d/issues/34) (was #13) | shippable | 📋 | | |
| [ ] | P14: Portal look and portal entry | [#35](https://github.com/shalevhoch/asteroid-shooter-3d/issues/35) (was #14) | shippable | 📋 | | |
| [ ] | P15: Touch controls | [#36](https://github.com/shalevhoch/asteroid-shooter-3d/issues/36) (was #15) | shippable | 📋 | | |
| [ ] | P16: Achievements | [#37](https://github.com/shalevhoch/asteroid-shooter-3d/issues/37) (was #16) | nice to have | 📋 | | |
| [ ] | P17: Craft select | [#38](https://github.com/shalevhoch/asteroid-shooter-3d/issues/38) (was #17) | nice to have | 📋 | | |
| [ ] | P18: Space station landmark and second reload point | [#39](https://github.com/shalevhoch/asteroid-shooter-3d/issues/39) (was #18) | nice to have | 📋 | | |
| [ ] | P19: Gamepad support | [#40](https://github.com/shalevhoch/asteroid-shooter-3d/issues/40) (was #19) | nice to have | 📋 | | |
| [ ] | P20: Low-end tablet performance pass | [#41](https://github.com/shalevhoch/asteroid-shooter-3d/issues/41) (was #20) | nice to have | 📋 | | |

New packets get the next free `PNN`, an issue, and a row here, in the PR that discovers them.

_Issues #1–#21 were authored by `conquarrow-dev` and are hidden while GitHub has that account flagged. P01–P20 were
recreated under Shalev's account as #22–#41 (the original numbers are shown as "was #N"). The originals are closed as not planned,
with a link to their replacements, so only one live copy shows. Agents file new issues with Shalev's token._

## 2. Facts from the original (reference, not contract)

- About 6.5k lines of Java. The bundled OBJ loader gets dropped, because three.js has `OBJLoader`/`MTLLoader`.
- The game loads only ship1, the mothership (+ 6 bounding-box meshes), Earth, the sky sphere and 2 asteroid meshes. **The unused models
  (space station, 3 buildings, hover car, g_ship `.lwo`, SpaceFighter01–03 / Shuttle01–02 zips) are Gilad's own and free to use.**
  Every `.max` has a `.3DS` sibling, so `.max` is never needed.
- The sim ran on a fixed 40 ms tick (25 Hz). These are tuned constants worth reusing as SPEC defaults: speed levels −2..5, turbo step 8,
  fuel 600, photon 10 hits / rocket 1 hit, max 3 rockets, hangar refills rockets + fuel, points big 20/15 and small 10/8, Earth damage
  big 10 / small 2, atmosphere = 1.5 × Earth radius, shockwave ×1.25 / α×0.85 per tick, rocket homing radius +10 per tick.

## 3. Architecture and tech choices

| Choice | Why |
|---|---|
| **TypeScript strict + Vite 6 + pnpm workspace** | Same toolchain as Conquarrow. The harness, CI and Pages workflow carry over almost verbatim. |
| **three.js, WebGLRenderer** | OBJ, MTL, 3DS, LWO and GLTF loaders, instancing and blending are all in the box, and it's the safest choice on tablets. WebGPU buys nothing here. |
| **No React.** HUD and menus are a plain DOM overlay. | A handful of widgets. CSS carries the portal look. |
| **Pure sim core** (`packages/sim`): `step(state, input) → {state, events}` at a fixed 25 Hz, with a seeded RNG and no DOM, three.js or clock | The tuned per-tick constants keep their feel. Vitest runs without WebGL, and replays are exact (waves, scoring and achievements become testable). It maps onto the harness's "core is pure" blinker. |
| A small `vec3`/`quat` module in the core | three.js stays out of the core. The renderer copies state into `Object3D`s. |
| **Renderer** (`packages/web`): rAF accumulator → N ticks → render, interpolating between the last 2 states | 25 Hz rules, 60/120 Hz drawing. This replaces the Java threads and lock lists. |
| The sim emits **events** (`asteroidDestroyed`, `earthHit`, `waveCleared`, `rocketFired` …) | FX, audio, HUD, scoring toasts and achievements all subscribe. No coupling back into the rules. |
| WebAudio (3 WAVs) and a `localStorage` leaf (high scores, achievements, settings) | They replace JavaSound and `record.rec`. |

## 4. Asset pipeline

- **`.wng` = Wavefront OBJ (Wings 3D export).** `scripts/import-assets.mjs` copies the used set as `.obj`, fixes the case of MTL
  texture names (`F02_512.JPG` vs `.jpg`, which matters because Pages is case-sensitive), drops the `* - Copy*` and `*.wng.mtl` twins, re-encodes the 2.8 MB
  `space.jpg` to about 2k WebP, writes the mothership AABBs to JSON (the core gets them as data) and writes `manifest.json`. Expected load is about 3 MB.
- **`.3DS` (station, buildings, SpaceFighter/Shuttle) and `.lwo` (g_ship):** load them at runtime with `TDSLoader`/`LWOLoader` in the model
  gallery first. Bake them to GLB (Blender headless, or three's `GLTFExporter` in a script) only if materials or load time misbehave.
- Textures stay PNG with alpha. Sounds stay WAV (256 KB total). KTX2/GLB compression waits for the polish packet.

## 5. Particles and billboards: original → three.js

**Out of the box:** `depthWrite:false` on transparent materials, `AdditiveBlending` (= `SRC_ALPHA, ONE`, exactly the Java Flash/Flame/Glint
blend), `renderOrder`, per-object transparent sorting, and `THREE.Sprite`. **Not out of the box:** per-particle sorting inside one draw call,
velocity-aligned quads, and the view-plane flattening. `THREE.Sprite` is one draw call per sprite, which is fine for tens and not for the
200+ particles one explosion spawns.

**Plan (`web/src/fx/`):** a `BillboardBatch` per texture, built from an instanced quad and a short `ShaderMaterial` (about 40 lines of GLSL).
- **CPU sort by view-space z each frame**, matching Java's `zedDistanceTo` order. It's trivial at a few hundred instances.
- **Premultiplied alpha with one blend mode (`ONE, ONE_MINUS_SRC_ALPHA`).** Additive sprites write α = 0, so smoke and flame interleave
  correctly in one sorted draw, which three.js per-material blending can't do.
- **Gilad's view-plane projection** becomes one line in the vertex shader, `mv.xyz *= centerView.z / mv.z;`. Each corner slides along
  its eye ray onto the plane parallel to the view plane through the sprite centre, so the screen image is the same and the depth is constant.
  Honest note: with `depthWrite:false`, sprite-vs-sprite seams already vanish, so today the trick mainly fixes **sprite vs asteroid** clipping.
  It's cheap, so keep it. Soft particles come later, if needed.

| Original | Blend | Web technique | OOTB? |
|---|---|---|---|
| `Sprite` base, `Photon`, `Flare`, `Shot` emitter | alpha | batch kind 0 (camera-facing), sorted, premultiplied. Collisions live in `sim` | mostly |
| `Flash` (rotating, 4 frames), `Flame`, `Glint` | additive | kind 0 + rotation attribute, α = 0 | yes |
| `Spark`, `SmokeTrail` (`LineSprite`) | alpha | **kind 1, velocity-aligned:** width = `normalize(cross(toCam, head−tail))·ratio·len` (as `LineSprite.getQuadBillboard`), then flattened | **custom shader** (about 15 lines) |
| `Shockwave` (ring on the explosion normal, drawn first) | alpha | its own `Mesh(PlaneGeometry)` oriented by the normal, `depthWrite:false`, lowest `renderOrder`, flattened | **custom shader** |
| Earth atmosphere halo | additive | one `THREE.Sprite` | fully |
| `Explosion` | — | a renderer recipe on `asteroidDestroyed`: shockwave + flash + flame + smoke + sparks + `kaboom` | — |

## 6. Layout and harness (built in P00)

The layout is in [AGENTS.md § Repository layout](./AGENTS.md#repository-layout). The harness came from Conquarrow's current
`main`, minus everything Conquarrow-specific:

- **Kept:** the 37 vendored skills (`.agents/skills`, `skills-lock.json`), the OpenCode five-phase pipeline (agents + `/spec-to-ship`),
  Claude/Cursor pointer agents and commands, lefthook pre-push `pnpm verify`, the strict `tsconfig.base.json`, the ESLint
  purity guard (retargeted to `packages/sim`), Vitest, Stryker (on `sim`), and the CRAP/Stryker report scripts.
- **Adapted:** `AGENTS.md` (the single tool-neutral rules file; `CLAUDE.md`, `CURSOR.md` and `OPENCODE.md` are pointers), the pipeline
  skills (`spec-to-ship`, `write-spec`, `write-failing-tests`, `code-to-green`, `verify-changes`, `review-changes`,
  `engineering-principles`, `mutation-testing`, `hotspot-expansion-review`, `regression-dog`), `rules-invariants` → `sim-invariants`,
  and the adapter-leaf rule for `web`.
- **New:** `/refine-packet` (product grilling → issue), PLAN.md sync in the ship phase + reviewer + `packet-pr` CI,
  the AGENTS.md drift guard (`scripts/check-harness.mjs` in `pnpm verify` + the reviewer item), and ADR 0001.
- **Dropped:** AWS `infra/`, the online-API workflow and Stryker config, BYOK tools, board/bot scripts, `component-testing`
  (server I/O edges; none here), `refactor-to-hexagonal`, Conquarrow's SPEC, ADRs and packets.

## 7. Open project-level decisions

Packet-level questions (control defaults, craft stats, campaign vs endless, touch milestone, …) live in each issue's
*Open questions* and get settled by `/refine-packet`.

1. **Where the pipeline runs:** Grok Bot, or Gilad's OpenCode/SuperGrok.
2. _Resolved:_ `main` is protected, and every change goes through a PR with green CI that Gilad merges.
