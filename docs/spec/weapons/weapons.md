# Weapons and base scoring (P06)

SPEC.md §5 and §6 hold the rules. This file adds the structure and the invariants the tests pin.

```mermaid
flowchart TD
  F[step 1: fire] --> C{photon held and cooldown 0?}
  C -- yes --> PH[photon at the alternating wing muzzle, cooldown = 5]
  F --> R{rocket pressed and rockets > 0?}
  R -- yes --> RK[rocket at the centre muzzle, lock nearest crosshair within 30°]
  M[step 5: each projectile in id order] --> HO{rocket?}
  HO -- yes --> L[keep the target or lock the nearest asteroid; steer, aim straight inside 200]
  HO -- no --> MV
  L --> MV[move along dir by speed]
  MV --> HIT{path segment hits an asteroid, lowest id?}
  HIT -- photon --> D1[hp − 1, or destroy: photon kill splits big]
  HIT -- rocket --> D2[destroy outright, no split]
  HIT -- no --> W{hits Earth or the mothership?}
  W -- yes --> X[consumed]
  W -- no --> E{age reached life?}
  E -- yes --> X
  E -- no --> K[keep]
  D1 --> S[score += points; asteroidDestroyed with points]
  D2 --> S
```

## Invariants (EARS)

- **INV-1**: A rocket locked on an asteroid that nothing else destroys, with nothing in the way, shall hit it within
  `ROCKET_LIFE` ticks (1000 randomised trials: any direction, 150–2000 units away, a moving big or small target).
- **INV-2**: The score shall always equal the sum of the `points` in every `asteroidDestroyed` event so far.
- **INV-3**: Projectiles shall stay sorted by id, with age below their life.
- **INV-4**: Rockets carried shall stay in 0..`ROCKET_MAX`.
- **INV-5**: Photons shall fire at most once per `PHOTON_COOLDOWN` ticks, alternating wings.
- **INV-6**: A projectile shall not pass through an asteroid between ticks (swept test), and an asteroid destroyed
  earlier in a tick shall not be hit again.
