---
paths:
  - "packages/web/src/**/*.ts"
description: Composites vs thin injected I/O leaves in packages/web
globs: packages/web/src/**/*.ts
alwaysApply: false
---

# Adapter leaf dependencies (packages/web)

The sim core has no I/O at all. At the edge, I/O is allowed but lives in **leaves**.

- A **leaf** does one kind of I/O and stays thin: WebAudio playback, `localStorage`, pointer lock,
  the Gamepad API, asset fetch/loaders, the rAF clock. Data goes in and out, with no game logic.
- **Composites** (the game loop, HUD controller, FX director) hold orchestration and *receive* leaves through a
  deps object or factory parameter (`createGame({ clock, storage, audio })`). A default parameter on the
  leaf factory (`storage = window.localStorage`) is the accepted shortcut.
- A clock is I/O: inject `now: () => number`. Never read `performance.now()` inside a composite you want to test.
- Pure helpers (projection, sorting, keymaps, scoring display) are plain functions with plain tests.
