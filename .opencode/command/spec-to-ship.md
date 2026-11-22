---
description: Drive one packet issue through spec, red tests, green, a read-only verify and a read-only review, then open the packet PR, tick PLAN.md, get CI green, and hand it to Gilad to review and merge. No approval gates between phases.
model: xai/grok-4.7
variant: xhigh
---

# /spec-to-ship

Drive `$ARGUMENTS` (a packet id `PNN` or an issue number) to a green, review-ready PR that Gilad merges. You are the
orchestrator and you run every phase. Read `AGENTS.md` and `.claude/skills/spec-to-ship/SKILL.md` first.
Context moves through artifacts (issue, spec files, tests, diff), not chat history.

**No approval gates.** Halt only for a game-design question that neither `SPEC.md` nor the refined
issue answers (add it to `SPEC.md` §Open and ask Gilad), a substantial unexpected cost, or a big
behavioural shift versus `SPEC.md` or a shipped packet. Engineering BSSN: decide, write it down, continue.

**SPEC.md is the truth.** The Java original (github.com/hochgi/astroid-shooter-3D) is a reference for feel
and tuned constants only. Improve on it wherever that is simpler or more idiomatic, and record the result in `SPEC.md`.

**A subagent's "green" is a hypothesis.** Re-run the gate yourself after every phase. Omit the `model`
argument when launching a subagent, because frontmatter is the pin.

| Phase | Who | Variant |
|---|---|---|
| 0 setup | you | — |
| 1 spec | you, in this thread, as `spec-author` / `write-spec` | `xhigh` |
| 2 red | `@test-author` | `high` |
| 3 green | `@coder` | `high` |
| 4 verify | `@verifier` (read-only) | `low` |
| 5 review | `@reviewer` (read-only) | `xhigh` |

## Phase 0: Setup

```bash
gh issue view <N> --repo shalevhoch/asteroid-shooter-3d     # scope, decisions, done criteria
git switch main && git pull && git switch -c packet/PNN-<slug>     # one branch per packet, never commit to main
```

If the issue isn't labelled `refined` and still lists open questions, stop and suggest `/refine-packet PNN` first.

## Phase 1: Specify (this thread)

Follow `.opencode/agent/spec-author.md`. Update `SPEC.md`, and write `docs/spec/<feature>/` (overview +
`.core.feature` + `.edge-cases.feature` + EARS invariants). Don't launch a subagent for this phase.

## Phase 2: Red (`@test-author`)

Delegate with the spec paths. Run the new tests yourself and read every failure. It must be red for a missing
behaviour, not a compile error.

## Phase 3: Green (`@coder`)

Delegate. Then run `pnpm verify` yourself.

## Phase 4: Verify (`@verifier`)

Delegate. A red gate goes back to `@coder`, and a new survivor goes back to `@test-author`. Loop until it passes.

## Phase 5: Review (`@reviewer`)

Delegate, with the verifier's suppression list. Route each must-fix to the owning phase, then re-run phases 4 and 5.

## Ship

Never push to `main` (it is protected). Push and run `gh` with Shalev's token: `GH_TOKEN=$GH_SHALEV_TOKEN` (never print it).
Commits are authored as `conquarrow-dev`.

1. Commit, then `git push -u origin packet/PNN-<slug>` (origin = `github.com/shalevhoch/asteroid-shooter-3d`).
2. `GH_TOKEN=$GH_SHALEV_TOKEN gh pr create --base main --title "🤖: PNN: <name>" --body "🤖: … Closes #N …"`. The body links the issue and the spec.
3. **Sync PLAN.md on the same branch:** in the `PLAN.md` packet index, tick this packet's checkbox and set its
   row's status ✅, delivered-by (`/spec-to-ship` + the agent/model), and the PR link. Commit
   `docs(plan): PNN shipped` and push. CI's `packet-pr` check fails without it.
4. Wait for CI (`gh pr checks --watch`) and fix until it is green (`verify` and `packet-pr`).
5. **Hand off to Gilad:** report the PR link and a summary. **Gilad reviews and merges** (squash). Run
   `gh pr merge --squash --delete-branch` only when Gilad explicitly tells you to. Merging closes the issue via
   `Closes #N`, and `main` deploys to games.hochgi.com/asteroid-shooter-3d/.
6. After the merge, check the live page (`curl -sf https://games.hochgi.com/asteroid-shooter-3d/`) and report it.

New findings the run turned up become new issues (label `packet` or `bug`) plus a `PLAN.md` row, in the same PR.

## Skip the pipeline

Typos, doc-only changes, dependency bumps, mechanical refactors and harness work: a small PR on a `chore/…`,
`docs/…` or `fix/…` branch with a one-line scope note and no packet title. It still needs green CI and Gilad's merge.
