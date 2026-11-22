---
name: verify-changes
description: Phase 4 gate — re-run pnpm verify, pnpm build:pages, and Stryker incremental when packages/sim/src changed; report exit codes and new survivors; no judgment.
---

# verify-changes

```bash
pnpm verify                        # check:harness, typecheck, lint, test
pnpm build:pages                   # the deploy build must succeed
pnpm test:mutation:incremental     # only if the patch touches packages/sim/src
```

Each command's exit code is the verdict. Stryker's `break` is `null`, so read the survivor list. A new survivor goes to
test-author, and a failing command goes to coder. Pre-existing survivors: name them and leave them. List the suppressions
(`eslint-disable`, `Stryker disable`, `@ts-expect-error`) the patch adds, for the reviewer. Don't run CRAP as a gate.
