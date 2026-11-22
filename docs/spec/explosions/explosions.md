# Explosions: shockwave, sparks, smoke and Earth-hit feedback (P12)

SPEC.md §12 holds the rules. This file adds the structure and the invariants the tests pin.

```mermaid
flowchart LR
  E[sim events] -->|recipesFor| R[recipes]
  R -->|explosion with normal| W[shockwave layer: pooled ring meshes, ×1.25 / ×0.85 per tick]
  R -->|explosion| P[10 flash + 40 flame + 50 smoke + 100 spark]
  R -->|impact at chipPoint| C[1 flash + 3 spark + 5 smoke]
  S[flying rockets] -->|per tick| T[rocket smoke streak]
  P --> B[BillboardBatch: camera-facing quads and line quads]
  C --> B
  T --> B
  H[earthHit] -->|hitStrength| J[jolt]
  J -->|joltAt| K[camera yaw/pitch, if shake on]
  J -->|joltAt| F[#hitflash opacity]
```

## Invariants (EARS)

- **INV-1**: Every explosion particle and shockwave shall die within 200 FX ticks.
- **INV-2**: Before flattening, a line sprite's width shall be ⊥ the line and ⊥ the eye ray to its middle, and
  `ratio × length` across.
- **INV-3**: The camera shake shall never exceed `SHAKE_MAX_RAD` per axis, and the flash shall stay within
  `[0, FLASH_MAX]`.
- **INV-4**: The engine shall never hold more than `MAX_SHOCKWAVES` shockwaves, and shall drop the oldest first.
- **INV-5**: When shake is off, an Earth hit shall leave the camera still, and the flash shall still show.
