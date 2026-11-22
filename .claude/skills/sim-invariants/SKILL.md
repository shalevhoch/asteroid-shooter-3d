---
name: sim-invariants
description: Property tests for the sim's stated invariants plus golden replay fixtures — the cheapest way to catch whole classes of rule bugs and any nondeterminism. Use when writing tests for packages/sim.
---

# sim-invariants

## Property tests (`*.invariants.test.ts`)

Generate random-but-seeded input sequences (thrust, turn, fire, rocket) for N ticks and assert after every tick:

- resources stay in range: rockets ∈ [0, carry limit], fuel ∈ [0, max], Earth health ∈ [0, max]
- score never decreases within a run, and every score change has a matching event
- conservation: a destroyed big asteroid yields exactly the specified number of small ones; entity ids are unique
- a fired rocket either reaches its target or its target was destroyed first (it "always hits")
- the ship never ends a tick inside the atmosphere or a mothership box
- determinism: the same seed + inputs → a deep-equal state (run twice)

Use a small seeded generator in the test helper (not `Math.random`), a fixed run count, and log the failing seed.

## Replay fixtures (`*.replay.test.ts`)

`{ seed, inputs: [{ tick, input }], expect: summary }`, where the summary is score, Earth health, live entity counts and
the event histogram. Record once, commit, and never re-record without a rule change in the same commit. Drift is a
nondeterminism bug until proven otherwise.
