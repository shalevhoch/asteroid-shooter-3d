# ADR 0001 — Pure sim core on a fixed 25 Hz tick

- **Status:** accepted (P00)
- **Context:** The original ran its physics on a 40 ms timer thread separate from rendering, with every constant
  expressed per tick. We want the same feel, gameplay that is testable without a GPU, and exact replays.
- **Decision:** `packages/sim` is a pure module: `step(state, input) → { state, events }` at 25 Hz. It has a seeded
  RNG in the state, and no clock, DOM, `three`, `Math.random` or I/O (ESLint-guarded). `packages/web` runs a
  requestAnimationFrame accumulator (`ticksFor`), steps the sim N times, and renders by interpolating the last two
  states. FX, audio, HUD, scoring display and achievements consume the sim's events.
- **Consequences:** Tuned per-tick constants carry over. Gameplay is covered by Vitest scenario, property and replay tests.
  Visual-only randomness (particle jitter) lives in the renderer. Input is sampled once per tick, so latency is ≤ 40 ms
  plus a frame, which is acceptable for this genre. Revisit if it feels sluggish.
