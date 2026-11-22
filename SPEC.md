# SPEC — Asteroid Shooter 3D (web)

> **This file is the truth for game behaviour.** It states the current design once per rule, with no history
> (git has that) and no reasoning (ADRs and issues have that). The Java original
> ([hochgi/astroid-shooter-3D](https://github.com/hochgi/astroid-shooter-3D)) is a reference for feel and tuned
> constants only. Every constant has a name (`CODE_STYLE`) and a v1 default. Defaults are tunable without changing a rule.

## 1. Game overview

You fly a fighter near Earth. Asteroids drift in from deep space toward Earth. Shoot them down before they hit it.
Photon guns chip at an asteroid. A homing rocket destroys one outright, but you carry only a few, and you reload by
flying into the mothership's hangar. The run ends when Earth's health or your hull reaches 0. The goal is a high score.

## 2. World and time

- The sim advances in fixed **ticks**: `TICK_HZ = 25` (40 ms). Every rate below is per tick. The sim has no notion of
  wall-clock time.
- World units are the original's. Axes are right-handed with +Y up.
- **Earth**: centre `EARTH_POS = (3000, 0, 0)`, radius `EARTH_RADIUS = 920`, health `EARTH_MAX_HEALTH = 100`.
- **Atmosphere**: the sphere around Earth with radius `ATMOSPHERE_RADIUS = 1.5 × EARTH_RADIUS`.
- **Mothership**: origin `MOTHERSHIP_POS = (0, −1180, 40)`, scale `MOTHERSHIP_SCALE = 5`. Its solid volume is the union of
  6 axis-aligned boxes taken from the original's bounding meshes (`b1..b6`), scaled and translated.
- **Hangar**: a sphere of radius `HANGAR_RADIUS = 100` centred at `MOTHERSHIP_POS + (0, 150, 0)`.
- Randomness comes only from the run's seeded RNG (`seed` is part of the initial state). The same seed and input
  log always give the same run.

## 3. Ship

- **Pose**: position plus an orthonormal frame (forward, up, right = forward × up). Start: position
  `SHIP_START = (0, −960, 0)` inside the hangar bay, facing +Z out of the bay's open end, with up +Y. From there the
  incoming asteroids are to the right (−X) and Earth is to the left (+X).
- **Turning**: input axes pitch (+ = nose up), yaw (+ = nose right) and roll (+ = right wing down), each clamped to
  [−1, 1], with non-finite input counting as 0. Each tick the frame rotates by `axis × TURN_RATE` (`TURN_RATE = 2°`)
  about the ship's own right, up and forward axes, in the order pitch → yaw → roll. The frame is re-orthonormalised
  every tick.
- **No inertia**: the ship moves exactly the per-tick steps below. There is no velocity carried between ticks.
- **Throttle**: an integer level `0..THROTTLE_MAX` (`THROTTLE_MAX = 4`), changed by ±1 per throttle input. Each tick the
  ship moves `level × THROTTLE_STEP` along forward (`THROTTLE_STEP = 1`).
- **Turbo**: while turbo is held and `fuel > 0`, the ship moves `TURBO_STEP = 8` along forward *instead of* the throttle
  movement, and fuel drops by 1 per tick. Fuel starts at and refills to `FUEL_MAX = 600`. At 0 fuel, turbo does nothing.
- **Strafe and reverse**: held strafe inputs move the ship `STRAFE_STEP = 1` per tick along ±right, ±up, or −forward
  (reverse). They add to the throttle movement.
- **Hull**: `HULL_MAX = 100`.
  - Inside the atmosphere, the hull loses `ATMOSPHERE_BURN = 1` per tick.
  - Within `EARTH_RADIUS + SHIP_RADIUS` of Earth's centre, the ship is destroyed (hull → 0).
- **Collision sphere**: `SHIP_RADIUS = 20`, centred on the ship's position.
- **Mothership**: if the ship's sphere overlaps a mothership box, the ship is pushed out along that box's axis of least
  penetration, and the throttle drops by 1 level.
- **Hangar**: while the ship's position is inside the hangar sphere, fuel, rockets and hull refill to their maxima
  (`shipReloaded` fires on the tick anything actually refilled).

## 4. Asteroids

- Two sizes:
  - **big**: `BIG_RADIUS = 100`, `BIG_HP = 20`
  - **small**: `SMALL_RADIUS = 20`, `SMALL_HP = 8`
- **Spawning**: every `SPAWN_INTERVAL = 200` ticks, starting at tick `SPAWN_INTERVAL`, one asteroid spawns at
  `(−800, U[−500, 500), U[−500, 500))`. It is big with probability `BIG_CHANCE = 1/5`, otherwise small.
- **Motion**: straight toward Earth's centre at `ASTEROID_SPEED = 3` per tick. The direction is fixed at spawn. Tumbling
  is visual only.
- **Earth impact**: when an asteroid's sphere touches Earth's sphere, the asteroid is destroyed without scoring, and
  Earth loses `BIG_EARTH_DAMAGE = 10` or `SMALL_EARTH_DAMAGE = 2`. It passes through the atmosphere unharmed (the
  atmosphere is a ship hazard; its burn glow is visual).
- **Split**: a big asteroid destroyed by photons splits into `SPLIT_COUNT = 4` small asteroids, placed at the original's
  offsets (+20,+20,+20), (0,+20,+20), (+20,−20,+20), (−20,+20,0) from its position, each aimed at Earth's centre.
  A big asteroid destroyed by a rocket does **not** split.
- **No ship collisions**: asteroids pass through the ship without effect, as in the original.
- Each asteroid has a unique, increasing integer id. Every per-tick iteration over asteroids goes in id order.

## 5. Weapons

- **Photon**:
  - Firing: while fire is held, one photon every `PHOTON_COOLDOWN = 5` ticks (the first on the tick fire is pressed).
  - Spawn: at the muzzle, `forward × 50 ± right × 12 − up × 8`, alternating sides shot by shot.
  - Flight: moves `PHOTON_SPEED = 36` per tick along the ship's forward at fire time, and lives `PHOTON_LIFE = 20` ticks.
  - Hit: a photon hits the first asteroid (lowest id) whose sphere its tick path segment intersects. It deals 1 damage
    and is consumed. A photon that touches Earth or a mothership box is consumed.
- **Rocket**:
  - Carry: up to `ROCKET_MAX = 3`. One is fired per press of the rocket input if rockets > 0, from the centre muzzle
    point (`forward × 50 − up × 8`).
  - Flight: moves `ROCKET_SPEED = 15` per tick and lives `ROCKET_LIFE = 400` ticks.
  - **Lock at launch**: the asteroid with the smallest angle to the ship's forward within `ROCKET_LOCK_CONE = 30°` (the
    one nearest the crosshair; ties go to the lowest id).
  - **Unlocked**: if nothing is in the cone, or its target is destroyed, the rocket locks the asteroid nearest to itself
    each tick until it finds one (ties go to the lowest id; `rocketLocked` fires).
  - **Homing**: while locked, each tick before moving its direction becomes
    `normalize(dir + normalize(target − pos) × max(ROCKET_STEER / distance, ROCKET_MIN_STEER))` (`ROCKET_STEER = 6`,
    `ROCKET_MIN_STEER = 0.15`). Within `ROCKET_TERMINAL_RANGE = 200` it aims straight at the target, so a locked rocket
    always reaches its target unless something else is in the way.
  - Hit: like a photon (swept segment, consumed by Earth and the mothership). It destroys the asteroid it hits regardless
    of HP, and is consumed.
- Within a tick, projectiles resolve in projectile-id order. An asteroid destroyed earlier in the tick can't be hit again.

## 6. Scoring and run end

| Kill | Points |
|---|---|
| big, by photons (splits) | `BIG_PHOTON_POINTS = 20` |
| big, by rocket | `BIG_ROCKET_POINTS = 15` |
| small, by photons | `SMALL_PHOTON_POINTS = 10` |
| small, by rocket | `SMALL_ROCKET_POINTS = 8` |

- The score starts at 0 and only increases. Each kill's `asteroidDestroyed` event carries its `points`.
- The run ends on the tick Earth's health or the hull reaches 0 (clamped at 0). After that, `step` returns the state unchanged.
- The best score is kept per browser (`localStorage`). Only a strictly higher score replaces it.

## 7. Tick order

Each tick, in this order:
1. Apply input: turning, throttle, turbo/strafe movement, firing.
2. Ship hazards: mothership push-out, hangar refill, atmosphere burn, Earth contact.
3. Spawn asteroids (if due).
4. Move asteroids, then resolve Earth impacts.
5. Move projectiles and resolve hits (rockets home before moving).
6. Expire projectiles whose life ran out, and check the run's end.

The sim emits **events** for anything the renderer, audio or HUD react to (`turboStarted`, `turboEnded`,
`fuelEmpty`, `mothershipBump`, `photonFired`, `rocketFired {target}`, `rocketLocked`, `projectileSpent`, `asteroidHit {hp}`,
`asteroidDestroyed {by, size, pos, points}`,
`asteroidSpawned`, `earthHit`, `shipReloaded`, `hullBurning`, `runEnded`).

## 8. Controls and camera

- **Layouts**: **modern** is the default; **classic** is the alternative. The choice is kept per browser.
- **Modern layout**:
  - Aim: mouse (pointer lock) for pitch and yaw. Arrow keys also aim.
  - Throttle: W/S or the mouse wheel.
  - Strafe and roll: A/D strafe, R/F strafe up/down, Q/E roll.
  - Turbo: hold Shift. Reverse: hold X.
  - Photons: hold LMB or Space. Rocket: RMB.
- **Classic layout** (the original's keys):
  - I/K pitch, J/L yaw, U/O roll.
  - W turbo, S reverse.
  - A/D strafe, E/Q strafe up/down.
  - 0/9 throttle.
  - Space photons, R rocket.
- **Toggles**:
  - C switches the camera.
  - L switches the layout (T in classic, where L is yaw).
  - Y inverts the mouse's Y axis.
  - H or F1 shows the controls during play. They're always shown on the title and pause screens.
  - M mutes. P pauses.
- **Mouse aim**: `MOUSE_PX_PER_TICK = 6` px of movement in one tick is a full-rate turn (axis 1).
  - Faster movement queues up, to at most `MOUSE_BUFFER_TICKS = 4` ticks of full-rate turn, and turns over the next ticks.
  - Mouse up is nose up; invert-Y defaults to off.
- **Throttle presses**: each press is one level. Presses made between ticks apply one per tick.
- **Cameras**:
  - **chase** (the default): behind and above the ship.
  - **classic**: the original's eye point, just behind the ship with the ship low in view.
- **FOV**: 50°, easing toward 80° while the turbo is moving the ship.
- The renderer draws the state interpolated between the last two ticks. It never feeds rendering back into the sim.

## 9. Run flow, HUD and audio

- **Flow**: title → playing → game over → playing again.
  - Leaving pointer lock (Esc), switching tabs, the window losing focus, or P pauses a run. The sim doesn't tick while paused.
  - Click or Enter starts, resumes and restarts.
- **Game over** shows:
  - the cause (Earth fell, or the ship was destroyed);
  - the score, the best score, and "NEW BEST!" when this run set it;
  - time survived, asteroids destroyed (and how many were big), photon accuracy, rockets fired and Earth hits taken;
  - Play again, and a link back to all games.
- **HUD**:
  - score and best;
  - Earth, hull and fuel bars, which flash at ≤ 30 %;
  - rocket pips, and a speed gauge (throttle, full under turbo);
  - warnings: Earth critical, hull damaged or critical, no fuel, no rockets;
  - a crosshair on the line of fire, `AIM_DISTANCE = 600` units ahead.
- **Audio**: the original's three sounds.
  - `photon`: a photon fired.
  - `rocket`: a rocket fired.
  - `kaboom`: a kill, an Earth hit or the run ending.
  - At most `MAX_CUES_PER_TICK = 4` sounds per tick. Audio starts on the first input; M mutes and the choice is kept.
- **Placeholder FX**: kills, Earth hits and photon hits flash a growing, fading sprite. A destroyed ship leaves one big flash.

## Open

Game-design questions not yet decided. `/refine-packet` resolves them with Gilad, and `/spec-to-ship` halts on
any it meets that are still open.

- **P08**: waves, objectives and difficulty presets that replace the steady spawn of §4.
- **P10**: scoring v2 (combos, multipliers, the run summary) on top of §6.
- **P16**: the achievement list.
- **P17**: per-craft stat differences against §3.
