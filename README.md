# ☄️ Asteroid Shooter 3D

Defend Earth from incoming asteroids in a 3D space shooter that runs in your browser.

**Play:** <https://games.hochgi.com/asteroid-shooter-3d/> (one of Shalev's games at [games.hochgi.com](https://games.hochgi.com/))

This is a **vibe-coded port** of [hochgi/astroid-shooter-3D](https://github.com/hochgi/astroid-shooter-3D),
a university computer-graphics project written in Java 6 + JOGL. The original Java sources stay in that repository.
This one is a fresh TypeScript + three.js rewrite that keeps the feel, reuses the original models, textures and sounds,
and adds the playability the course project never needed (waves, objectives, scoring, achievements, touch).

## Develop

```bash
corepack enable          # pnpm 11 via packageManager
pnpm install
pnpm dev                 # http://localhost:5175
pnpm verify              # harness check + typecheck + lint + test
pnpm build:pages         # production build for /asteroid-shooter-3d/
```

- How we work: [AGENTS.md](./AGENTS.md) (rules for humans and agents) · [PLAN.md](./PLAN.md) (plan + packet index)
  · [SPEC.md](./SPEC.md) (game rules) · packets are [GitHub issues](https://github.com/shalevhoch/asteroid-shooter-3d/issues).
- Workflow: one branch + PR per packet (`packet/PNN-…`), CI must be green, and Gilad reviews and merges. `main` is protected,
  and every merge to it deploys to GitHub Pages.
