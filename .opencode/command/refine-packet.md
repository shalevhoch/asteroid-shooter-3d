---
description: Pre-pipeline product grilling with Gilad for one packet issue. Resolves its open questions and writes refined scope, decisions and done criteria back into the issue. No code, no spec files.
model: xai/grok-4.7
variant: xhigh
---

# /refine-packet

Refine `$ARGUMENTS` (a packet id `PNN` or an issue number) right before it is delivered. You are talking
with **Gilad (the product owner)** live. The goal is to settle *what* to build so that `/spec-to-ship`'s
spec-author only has to settle *how precisely*.

## Read first

- `gh issue view <N> --repo shalevhoch/asteroid-shooter-3d --comments`
- `PLAN.md` (the technical plan + the index row for this packet and its dependencies)
- `SPEC.md` (the truth so far, including its §Open list) and `AGENTS.md` vocabulary
- The relevant part of the original game, as a reference for feel only: github.com/hochgi/astroid-shooter-3D

## Grill

Follow `.claude/skills/grilling/SKILL.md`. **One question at a time**, each with your recommended answer
and its trade-off, so Gilad can reply "yes" or pick. Cover:

1. Every item under the issue's **Open questions**.
2. Scope edges: what is explicitly *out*, and what moves to another packet.
3. Player-facing behaviour that SPEC.md doesn't settle yet (numbers can be "start with X, tune later").
4. Done criteria that are observable: a test, a visible behaviour on the dev page, or a live check.

Don't ask engineering questions you can answer with BSSN, and don't reopen decisions already in SPEC.md
unless Gilad does. Stop when no open question is left or Gilad says "enough".

## Write back (the issue is the artifact)

Rewrite the issue body with `gh issue edit <N> --body-file -`, keeping this shape:

```
## Scope            (refined, bullet list)
## Out of scope
## Decisions        (each: decision — short why; game rules here go into SPEC.md during /spec-to-ship)
## Done criteria    (observable checklist)
## Dependencies
## Open questions   (should be "none"; anything left is deliberately deferred, with its owner)
```

Then run `gh issue edit <N> --add-label refined`, and add a comment summarising what changed. Don't edit `SPEC.md`,
`PLAN.md` or code here. That happens inside `/spec-to-ship`. Finish by telling Gilad the packet is ready for
`/spec-to-ship PNN`.
