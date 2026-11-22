---
name: code-to-green
description: The red→green→refactor loop — implement until the approved suite passes, keep packages/sim pure and deterministic, never weaken a test or change the spec. Phase 3 of spec-to-ship.
---

# code-to-green

1. Run the suite and read every failure.
2. Implement the smallest thing that turns one test green. Repeat.
3. Re-run the replay fixtures. Green units plus a drifted replay means you introduced nondeterminism.
4. Refactor to the AGENTS.md layering and complexity budget (`hotspot-expansion-review` before growing a big function).
5. `pnpm verify` green, then hand off with the output you actually saw.

## Not allowed

- **Changing the spec** (phase 1 owns `SPEC.md`) or **weakening a test** (no loosening, widening or deleting).
- **Inventing a rule.** "Just make it pass" often hides a design call: which hit counts when two land in the same tick,
  whether a destroyed asteroid still damages Earth on that tick, whether turbo works at 0 fuel. Check SPEC.md.
  If it's silent, kick back to phase 1.

## Determinism in packages/sim

- Randomness only from the state's seeded RNG, consumed in a fixed order.
- Iterate entities in a stable order (by id). Every `sort` has a total comparator with an id tie-break.
- Floats are fine (this is a real-time sim), but the same inputs must give the same floats: no time-based dt,
  only the fixed tick.
