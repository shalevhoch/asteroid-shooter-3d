---
name: review-changes
description: Phase 5 coherence review — hunt unchosen rules, verify sim purity, check spec↔tests↔code, judge every suppression, and check PLAN.md and AGENTS.md hygiene. Read-only; rank findings, never fix.
---

# review-changes

The suite is green. You're checking that it tests the right game.

1. **Hunt unchosen rules.** For each conditional and constant in the diff, find the `SPEC.md` sentence (or refined-issue
   decision) behind it. Flag any that has none, especially the obviously-correct ones.
2. **Purity and determinism.** Grep `packages/sim/src` for `Date`, `performance`, `Math.random`, `fetch`, `window`,
   `document`, and `three`. A hit is a **blocker**. Then look for the quiet ones: unordered iteration feeding a decision, sorts
   without an id tie-break, dt taken from wall time. A replay golden re-recorded without a rule change is a **blocker**.
3. **Spec ↔ tests ↔ code.** One test per scenario, an assertion per EARS invariant, behaviour over shape, and no test
   that is weaker than its scenario.
4. **Suppressions.** Each one needs a reason that holds for all inputs, not just the tested ones.
5. **PLAN.md.** A packet PR updates exactly its own index row (checkbox, status ✅, delivered-by, PR) and the body says `Closes #N`.
6. **AGENTS.md drift.** A changed convention, command, script name, layout or workflow means `AGENTS.md` changed in the same
   PR. `CLAUDE.md`, `CURSOR.md` and `OPENCODE.md` stay pointer-only.
7. Ordinary review: naming from the vocabulary, the complexity budget, dead code, and leaf boundaries in `web`.

Output: findings ranked **blocker / must-fix / nit**, each with file:line and the owning phase. Then the PR title
`🤖: PNN: <name>` and a body (starting `🤖: `, with `Closes #N`).
