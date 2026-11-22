---
name: engineering-principles
description: Standing engineering conventions for asteroid-shooter-3d — pure deterministic sim at 25 Hz, renderer as adapter, BSSN, the ratchet, naming from the vocabulary, CRAP vs mutation. Read when making a design call not covered by a packet.
---

# engineering-principles

- **Pure sim, impure shell.** `packages/sim` is `step(state, input) → { state, events }` at a fixed 25 Hz (ADR 0001).
  The renderer interpolates between the last two states and turns events into FX, audio and HUD updates. Gameplay is
  testable without a GPU, and replays are exact.
- **Events, not callbacks into rules.** The sim never calls the renderer. FX, audio, scoring toasts and achievements
  subscribe to events.
- **Data over code for tuning.** Waves, difficulty presets, craft stats and scoring tables are typed data in `sim`, with
  defaults stated in `SPEC.md`.
- **BSSN + the ratchet** (AGENTS.md). Add an abstraction when it pays today: a second caller, isolating I/O, or making a test possible.
- **Names from the vocabulary** (AGENTS.md), so code reads as the rule.
- **Two independent quality signals:** Stryker says whether the tests are good, and CRAP (`pnpm crap`) says whether the shape is
  good. Neither is a gate. Both guide boy-scouting.
- **Performance budget** (renderer): one draw call per FX texture batch, a particle cap, DPR ≤ 1.5 on touch devices, and
  no per-frame allocation in hot loops.
