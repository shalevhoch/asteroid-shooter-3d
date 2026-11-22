---
name: regression-dog
description: List the behavioural delta of an asteroid-shooter-3d change — "used to do X, now does Y" — without judging it. Use after a refactor, on any diff that claims no behaviour change, or when asked to check a range for regressions. Takes a git range; defaults to the last commit.
---

# regression-dog

Read the before and after code and enumerate every **behavioural difference**.
You report the delta; you do not grade it. Whether the old or the new behaviour
is right is the author's call — and for game behaviour, SPEC.md's.

Spend the whole budget on reading and reasoning. `pnpm verify` and CI cover
typecheck, lint and tests, so leave them to those.

## Scope

| Argument | Range |
|---|---|
| none | the last commit (`HEAD~1..HEAD`) |
| `main` | `$(git merge-base HEAD main)..HEAD` |
| `HEAD~3`, `abc123..HEAD`, … | as given |

## What counts as a delta

Each changed function, for every input class: the return value, thrown errors,
side effects (events emitted, storage, audio), call order, and anything
persisted or sent on the wire. A pure move that keeps all of those identical is
cleared.

Look hardest where this repo hides behaviour:

- **Ordering in the sim** — iteration over a `Set` / `Map` feeding an ordered
  decision, a `sort` comparator that lost its tie-break. These change replays
  without failing a unit test.
- **Number semantics** — integer vs float, `floor` vs `round`, a per-tick constant
  turned into a per-second one.
- **Storage shapes** — `localStorage` keys and records (high scores, achievements,
  settings). A changed shape breaks data players already have.
- **Defaults and fallbacks** — a changed default parameter, `??` vs `||`, an
  error now swallowed or now thrown.

## Severity

- **rule** — game behaviour changed in `packages/sim`. Name the SPEC.md section
  it touches.
- **high** — persisted shape, or anything that loses a player's saved data.
- **medium** — renderer/input/audio behaviour a player can observe.
- **low** — logs, messages, cosmetics.

## Output

1. **Deltas**, numbered, most severe first: `severity — file:line — used to X,
   now Y — the inputs that show it`.
2. **Cleared** — every changed unit you checked and found behaviour-identical,
   each prefixed ✅.

Done when every function the range touches appears in exactly one of the two
lists.
