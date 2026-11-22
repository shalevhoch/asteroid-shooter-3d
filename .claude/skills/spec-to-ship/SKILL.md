---
name: spec-to-ship
description: >-
  Orchestrator overview of the delivery pipeline for asteroid-shooter-3d: refine-packet (before) →
  spec-author → test-author → coder → verifier → reviewer → packet branch + PR + PLAN.md sync → green CI →
  Gilad reviews and merges. No human gate between phases.
---

# Spec-to-Ship

The workflow for every non-trivial change. It exists because plausible-but-wrong code is the main failure
mode of agent-driven development. Design comes before tests, tests before code, and a coherence check after.

```
  /refine-packet   Gilad + agent settle WHAT (open questions → decisions in the issue)
  PHASE 1 SPEC     spec-author: issue → SPEC.md + docs/spec/<feature>/ (Gherkin, mermaid, EARS)
  PHASE 2 RED      test-author: one test per scenario, property tests, replay fixture — red
  PHASE 3 GREEN    coder: implement, keep packages/sim pure
  PHASE 4 VERIFY   verifier (read-only): pnpm verify, build:pages, Stryker on sim — no judgment
  PHASE 5 REVIEW   reviewer (read-only): spec↔tests↔code, purity, suppressions, PLAN.md, AGENTS.md
  SHIP             orchestrator: branch packet/PNN-… → PR "🤖: PNN: …" (Closes #N) → tick PLAN.md row → CI green
                   → Gilad reviews and merges (agents merge only when Gilad says so). Never push to main.
```

- **Nobody grades their own homework.** Phases 4–5 can't edit. Re-run the gate after every phase.
- **SPEC.md is the truth; the Java original is a reference.** The failure mode here isn't fidelity, it's an
  *unchosen* rule: a number or behaviour that nobody decided and that now looks designed. Engineering detail is BSSN.
  A player-facing choice comes from SPEC.md, the refined issue, or a question to Gilad.
- **Context moves through artifacts.** A resolved ambiguity goes into `SPEC.md` or the spec folder, not just a report.
- Skip the pipeline for typos, docs, dependency bumps, mechanical refactors and harness work.

References: `.opencode/command/{refine-packet,spec-to-ship}.md`, `.opencode/agent/*`, skills `write-spec`,
`write-failing-tests`, `code-to-green`, `verify-changes`, `review-changes`, `sim-invariants`,
`engineering-principles`, `mutation-testing`. Index: `PLAN.md`. Packets: GitHub issues.
