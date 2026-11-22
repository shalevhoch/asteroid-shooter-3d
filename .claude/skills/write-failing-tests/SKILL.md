---
name: write-failing-tests
description: Turn a spec into a red Vitest suite — one component test per Gherkin scenario, property tests per EARS invariant, replay fixtures for tick-loop changes, and skeletons that throw 'not implemented'. Phase 2 of spec-to-ship.
---

# write-failing-tests: spec → red suite

1. **One test per Gherkin scenario**, named after it, in `*.core.test.ts` / `*.edge-cases.test.ts`, against
   the public API of `packages/sim` (or a pure helper exported from `packages/web`). Never against three.js
   objects or the DOM.
2. **One property test per EARS invariant** (`*.invariants.test.ts`, see `sim-invariants`). Use a seeded
   generator, a fixed number of runs, and print the seed on failure.
3. **A replay fixture** (`*.replay.test.ts`) when the packet changes what a tick does: seed + input log →
   asserted summary of the final state. Goldens are recorded once and never re-recorded silently.
4. **Skeletons only:** exported signatures that `throw new Error('not implemented')`. No behaviour.

Assert behaviour ("Earth health is 90 after the big asteroid hits"), not shape ("state.earth.hp key exists").
Done when every scenario and invariant has a test and each one fails for a missing behaviour, not a type error.
