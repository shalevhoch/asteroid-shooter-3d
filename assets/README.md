# Asset pipeline

Runtime assets live in `packages/web/public/assets/` and are committed. They come from the original game's
`models/`, `textures/` and `sounds/` (Gilad's own work, so it's free to use, including the models the Java game never loaded).

- **P00 (now):** a hand-copied asteroid (`astro01.wng` → `.obj`, `mtllib` line dropped) and one particle texture for
  the placeholder page.
- **P02:** `scripts/import-assets.mjs` takes a local clone of the original repo (`ASSET_SRC=…`), copies the used set,
  renames `.wng` → `.obj`, fixes MTL texture-name case (Pages is case-sensitive), drops duplicates (`* - Copy*`,
  `*.wng.mtl`), re-encodes the 2.8 MB `space.jpg`, extracts the mothership AABBs to JSON, and writes `manifest.json`.
  `.3DS`/`.lwo` load via three's `TDSLoader`/`LWOLoader`, and get baked to GLB only if needed.

Known quirk: `models/asteroids/astro01.mtl` in the original is actually a copy of the OBJ geometry, not a material file.
