# AGENTS.md — asteroid-shooter-3d

The **single, tool-neutral source of rules** for every human and AI agent working here
(OpenCode, Cursor, Claude Code, Codex, …), following the [agents.md](https://agents.md/) convention.
`CLAUDE.md`, `CURSOR.md` and `OPENCODE.md` are pointers to this file and add nothing.
If you change a convention, command, layout or workflow, **update this file in the same PR**
(the reviewer checks it, and CI checks the structure: `pnpm check:harness`).

## Project overview

A browser 3D space shooter: defend Earth from asteroids with photon guns and homing rockets.
It is a **vibe-coded port** of Gilad's university project
[hochgi/astroid-shooter-3D](https://github.com/hochgi/astroid-shooter-3D) (Java 6 + JOGL),
rebuilt with TypeScript + three.js + Vite and served at
<https://games.hochgi.com/asteroid-shooter-3d/> on Shalev's games portal.

- **`SPEC.md` is the truth** for game behaviour. The Java original is a *reference for feel and
  mechanics only*, not a contract. Where an improvement is easier or more idiomatic, improve, and
  write the improvement into `SPEC.md`. Tuned constants from the original are welcome defaults.
  The Java source stays in the old repo. Don't copy it here.
- **`PLAN.md`** holds the technical plan and the **packet index**. Each work packet is a GitHub issue
  (`PNN: <name>`), and the issue holds the detailed scope.
- Architecture decisions: `docs/adr/`. Per-packet specs: `docs/spec/<feature>/`.

## Repository layout

```
packages/sim/      PURE game core: state, step(), seeded RNG, math, rules. No DOM, no three.js, no clock.
packages/web/      Adapters: three.js renderer, FX, input, audio, HUD, storage, assets. Vite app.
  public/assets/   Runtime assets (models, textures, sounds) produced by scripts/import-assets.mjs.
assets/            Asset-pipeline notes and source manifests (raw originals are fetched from the old repo).
scripts/           Repo tooling (harness checks, asset import, CRAP/Stryker reports). Node, not shipped.
docs/adr/          Architecture decision records.     docs/spec/   Specs written in phase 1.
.opencode/         Live agents + commands (/refine-packet, /spec-to-ship).  .claude/skills/  Shared skills.
```

Dependencies point inward: `web` → `sim`. Nothing in `sim` imports `web`, `three`, or a browser API.

## Setup and commands

Node ≥ 22, pnpm 11 (via `packageManager`/corepack).

```bash
pnpm install                 # also installs lefthook (pre-push runs pnpm verify)
pnpm dev                     # Vite dev server for packages/web
pnpm verify                  # check:harness && typecheck && lint && test — run before saying you are done
pnpm build                   # production build (base /) ; pnpm build:pages → base /asteroid-shooter-3d/
pnpm test:watch | pnpm crap | pnpm test:mutation[:incremental]   # advisory extras
```

Reproduce known state with commands, not hand edits (`git restore --source`, `pnpm add`, codemods).

## Code style and architecture

- **The sim core is pure.** `step(state, input) → { state, events }` at a fixed **25 Hz** tick
  (ADR 0001). No `Date.now`, `performance.now`, `Math.random`, `fetch`, DOM, or `three` inside
  `packages/sim/src`. Randomness comes from the seeded RNG in the state. ESLint enforces the loud
  cases. You enforce the quiet ones: no ordered decision driven by unordered iteration, and every `sort`
  has a total comparator. Determinism gives exact replays, which is how gameplay gets tested.
- **The renderer owns the impure world**: the rAF loop, interpolation, FX randomness, audio, input and storage.
  Each external boundary is a thin injected leaf (`.claude/rules/adapter-leaf-dependencies.md`).
- **BSSN, the Best Simple System for Now.** No cut corners, as simple as possible, built for today's packet.
- **The ratchet.** Existing code is context, not precedent. Leave each slice you touch better,
  proportionally. Narrow, deep interfaces. Add an abstraction only when it pays today.
- TypeScript strict plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. ESLint complexity budget
  (warn) in `sim`: cyclomatic ≤ 12, depth ≤ 4, ≤ 80 lines per function, ≤ 5 params.
- Use the vocabulary below for names. No synonyms.

## Testing instructions

- Vitest, `packages/*/test/**/*.test.ts`, Node environment (no WebGL in tests).
- Suffixes: `*.core.test.ts` (one test per Gherkin scenario), `*.edge-cases.test.ts`,
  `*.invariants.test.ts` (property tests, see the `sim-invariants` skill), `*.replay.test.ts`
  (seed + input log → exact final state; a re-recorded golden without a rule change is a bug).
- Renderer and FX logic worth testing is extracted into pure helpers (projection, sorting, keymaps) and tested there.
  Visual checks happen on a dev page and get described in the PR.
- Stryker mutates `packages/sim/src` (advisory, `break: null`). New survivors go back to the test-author.

## Delivery workflow

1. **Packet = GitHub issue** `PNN: <name>`, listed in the `PLAN.md` index, with a milestone
   (`tracer bullet`, `MVP`, `shippable`, `nice to have`).
2. **`/refine-packet PNN`** (`.opencode/command/refine-packet.md`): product grilling with Gilad
   right before delivery. It resolves the issue's open questions and writes the refined scope, decisions and
   done criteria back into the issue. Labels it `refined`.
3. **`/spec-to-ship PNN`** (`.opencode/command/spec-to-ship.md`): spec-author → test-author →
   coder → verifier → reviewer → branch + PR → green CI → **Gilad reviews and merges** (or tells us to merge).
   No human gates between the phases themselves.
   Escalate only for a game-design question SPEC.md and the refined issue don't answer, an
   unexpected cost, or a big shift against SPEC.md or a shipped packet.
4. Skip the pipeline for typos, docs, dependency bumps, mechanical refactors and harness work: open a small PR.

## PR and commit conventions

- **Never push to `main`.** `main` is protected: every change lands through a PR with green CI (`verify`).
- **One branch and one PR per packet:** branch `packet/PNN-<slug>` (e.g. `packet/P01-spec-v1`), opened with
  `gh pr create`. Other work uses `chore/…`, `fix/…` or `docs/…` branches, also via PR.
- Packet PR title `🤖: PNN: <name>`. The body starts with `🤖: `, links the issue and spec, and says `Closes #N`.
- **A packet PR updates its `PLAN.md` index row** (status ✅, delivered-by, PR link). CI
  (`packet-pr` workflow) fails a packet PR that doesn't touch `PLAN.md` or lacks `Closes #N`.
- **Gilad reviews and merges** each PR (squash), or explicitly tells the agent to merge it. Agents don't merge on their own.
- Conventional-commit subjects (`feat(sim): …`, `chore(harness): …`).
- Remote `origin` = `github.com/shalevhoch/asteroid-shooter-3d`. Agents push branches and call `gh` with Shalev's token
  (`GH_TOKEN=$GH_SHALEV_TOKEN`; never print it), with commits authored as `conquarrow-dev`. A merge to `main` deploys to Pages.

## Security considerations

- No secrets in the repo, ever (`.env*` is gitignored). The game is a static site with no backend.
- Don't add network calls, analytics or third-party CDNs without an ADR. Assets are served from this origin.
- `localStorage` holds only scores, achievements and settings. Never anything personal.

## Agent tooling

- **OpenCode** is the live pipeline: `opencode.json` pins `xai/grok-4.7`, and the variant is a separate field
  (never `grok-4.7#xhigh`). Agents are in `.opencode/agent/`, commands in `.opencode/command/`. Auth is via `/connect`
  (never commit `XAI_API_KEY`).
- **Skills** live in `.claude/skills/` (shared by OpenCode, Cursor and Claude Code). Vendored ones are in `.agents/skills/`
  (`skills-lock.json`).
- **Cursor and Claude Code** agent and command files are pointers to the OpenCode ones. Don't launch a phase with a
  `model` override, because frontmatter is the pin.

## Vocabulary

| Term | Means |
|---|---|
| **tick** | one 40 ms sim step. All rule constants are per tick |
| **ship** | the player craft; **craft** = a selectable ship model |
| **throttle** | forward speed setting; **turbo** = a fuel-burning boost |
| **photon** | light weapon, rapid fire with cool-off |
| **rocket** | homing heavy weapon, carry limit, always reaches its target |
| **asteroid** | big (splits into small) or small |
| **Earth / atmosphere** | the defended planet / the shell that blocks the ship |
| **mothership / hangar** | the carrier / the fly-through reload point (rockets + fuel) |
| **wave** | a scripted group of asteroids; **objective** = an optional per-wave goal |
| **event** | a sim output (`asteroidDestroyed`, `earthHit`, …) consumed by FX, audio, HUD, scoring |
| **packet** | one deliverable unit = one issue = one `/spec-to-ship` run |
