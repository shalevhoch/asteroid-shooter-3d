---
name: mutation-testing
description: Run and triage Stryker on packages/sim — incremental runs, reading survivors, killing them with spec-implied tests. Advisory (break null).
---

# mutation-testing

```bash
pnpm test:mutation:incremental     # changed mutants only (use in the pipeline)
pnpm test:mutation                 # full run on packages/sim/src
pnpm test:mutation:report          # format reports/mutation/mutation.json as Markdown
```

- Config: `stryker.config.json` mutates `packages/sim/src/**/*.ts` (not `index.ts`). The web package isn't mutated.
- A survivor means a behaviour the tests don't pin. Kill it with a test the spec implies. If the spec doesn't imply one,
  it's a spec gap, so report it. Only the reviewer accepts an "equivalent mutant" suppression, with a reason.
- Timeouts on tick loops usually mean a mutated loop bound. Keep loops bounded by data, not by `while (true)`.
