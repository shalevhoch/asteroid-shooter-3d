# Asset pipeline

Runtime assets live in `packages/web/public/assets/` and are committed. They come from the original game's
`models/`, `textures/` and `sounds/` (Gilad's own work, so it's free to use, including the models the Java game never loaded).

Regenerate them with:

```sh
ASSET_SRC=/path/to/astroid-shooter-3D node scripts/import-assets.mjs   # needs unzip and ffmpeg
```

The script wipes `public/assets/` and writes it again:

- `.wng` → `.obj`, each with its own clean `.mtl`.
  - Texture names are fixed to the real, lowercase file names (Pages is case-sensitive).
  - `mothership.mtl` pointed at a missing `COLOR.JPG`; it now points at `mothership.jpg`.
  - `astro01.mtl` was a stray copy of geometry, so it's dropped; the game shades the asteroids itself.
- Duplicates (`* - Copy*`, `*.wng.mtl`) are dropped.
- `space.jpg` is re-encoded from 4096² / 2.8 MB to 2048² / ~0.5 MB.
- 3DS models (buildings, space station, the Space-pack fighters, shuttles and the hover car) get lowercase texture
  names. The 3DS format stores 8.3 names (`METAL07_.JPG`), so the names are patched in place, and each texture is
  copied next to its model under that name.
  - The full names come from the `.max` sources.
  - Where an 8.3 name is ambiguous (`metal07_door` vs `door2` vs `nucl`), the script picks one.
- LWO (`g_ship`) is copied as is. three's `LWOLoader` goes away in r195, so bake these to GLB before upgrading past it.
- The mothership's six collision boxes go to `models/mothership/boxes.json`, and to
  `packages/sim/src/data/mothershipBoxes.ts` for the sim. A test keeps the two equal.
- `manifest.json` lists every model, texture and sound, marking the `core` set the game loads.
  - `packages/web/test/manifest.core.test.ts` checks every reference resolves with exact case.
  - The same test keeps the core payload under 4 MB (it's about 2 MB).

`gallery.html` (live at `/asteroid-shooter-3d/gallery.html`, not linked from the game) renders every model from the
manifest. `?model=<id>` opens one directly.
