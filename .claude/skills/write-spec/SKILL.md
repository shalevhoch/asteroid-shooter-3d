---
name: write-spec
description: Turns a refined packet issue into SPEC.md updates plus a test-derivable spec under docs/spec/<feature>/ — overview with mermaid, Gherkin core + edge-case features, EARS invariants. Phase 1 of spec-to-ship.
---

# write-spec: refined issue → spec

Your output is the contract: tests are derived from it, code makes them pass, and review checks against it.
**A behaviour that isn't in your spec won't be built.**

## Produce

1. **`SPEC.md` updates.** Each player-facing rule is stated once, in the current design only (no strikethroughs,
   no "changed from"; history lives in git). Constants get a name and a default ("rocket carry limit: 3").
   Unresolved design questions go to `SPEC.md` §Open.
2. Under `docs/spec/<feature>/`:
   - `<feature>.md`: purpose, a terms table (AGENTS.md vocabulary), a mermaid state or flow diagram, and
     `## Invariants` as EARS one-liners ("While a wave is active, the system shall …").
   - `<feature>.core.feature`: happy paths. `<feature>.edge-cases.feature`: boundaries and races.

## Gherkin style

- Concrete and tick-based: "Given a small asteroid 30 units from Earth moving at 2 units/tick … When 15 ticks pass".
- Seeded where randomness matters ("Given RNG seed 42"). Assert observable state or events, not internals.
- Edge cases worth hunting: simultaneous events in one tick (a rocket and a photon hit the same asteroid), carry limits
  (the 4th rocket), zero or negative resources (fuel at 0 with turbo held), wrap-around and far distances,
  pause/resume mid-wave, a restart with the same seed.

## Precision vs design

Answer precision questions yourself (BSSN) and record the answer. A design question (what the player experiences)
that the issue and SPEC.md don't answer goes to §Open and halts the run.
