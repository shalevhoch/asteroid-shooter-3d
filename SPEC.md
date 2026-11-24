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
- **Crafts** (P17): picked on the title card and kept per browser. The Fighter is the original ship with exactly the
  numbers above. The others trade against it:

  | Craft | Model | Turn | Fuel | Hull | Rockets |
  |---|---|---|---|---|---|
  | Fighter (default) | ship1 | `TURN_RATE` | 600 | 100 | 3 |
  | Interceptor | ship2 | ×1.25 | 450 | 75 | 2 |
  | Shuttle | shuttle-01 (3DS, baked to GLB) | ×0.8 | 900 | 140 | 5 |

  - Turbo, throttle, strafe and weapons are the same for every craft. The hangar refills to the craft's own maxima,
    and the HUD bars and rocket pips use them too.
  - Every model is scaled to the Fighter's length, so the 20-unit collision sphere fits them all.
  - **Decisions**: real trade-offs, with the Fighter unchanged as the default, so no existing tuning knob moves. The
    g_ship models are left out for now; since P25 they're baked to GLB like every 3DS model, so a later packet can add one
    as a craft.
- **Space station** (P18): a second reload point and landmark at `STATION_POS = (1000, 1000, 0)`, above the
  asteroid lane between the spawn line and Earth, on the opposite side from the mothership.
  - Inside `STATION_DOCK_RADIUS = 150` of it, the ship refills exactly as in the hangar. `shipReloaded` carries
    `at: 'mothership' | 'station'`.
  - The web draws the station above its landing dock, with the graving dock and barrack as dressing and a pulsing
    green ring around the dock. It shows on the radar as a green diamond.
  - **Decisions**: the station has no collision boxes (it's a fly-through landmark) and never comes under threat:
    asteroids aim at Earth, and its position is clear of their lane.

## 4. Asteroids

- Two sizes:
  - **big**: `BIG_RADIUS = 100`, `BIG_HP = 20`
  - **small**: `SMALL_RADIUS = 20`, `SMALL_HP = 8`
- **Spawning**: the waves of §10 decide when asteroids spawn, how many, and how fast. Each spawns at
  `(SPAWN_X = −800, U[−500, 500), U[−500, 500))`, drawing y, z, then size from the RNG. It is big with the wave's
  probability, otherwise small. Wave 1 on Normal is the original's pace: one every `SPAWN_INTERVAL = 200` ticks from
  tick 200, `BIG_CHANCE = 1/5`, at `ASTEROID_SPEED = 3`.
- **Motion**: straight toward Earth's centre at the asteroid's own speed per tick, fixed at spawn (the wave's speed ×
  the difficulty's scale). The direction is also fixed at spawn. Split pieces inherit the speed. Tumbling is visual only.
- **Earth impact**: when an asteroid's sphere touches Earth's sphere, the asteroid is destroyed without scoring, and
  Earth loses `BIG_EARTH_DAMAGE = 10` or `SMALL_EARTH_DAMAGE = 2`, × the difficulty's scale (rounded, at least 1). It passes through the atmosphere unharmed (the
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

- The score starts at 0 and only increases. Each kill's `asteroidDestroyed` event carries its `points` (base × the
  combo multiplier), its `base`, its chain position `combo` and its `multiplier`.
- **Combo** (P10): a kill within `COMBO_WINDOW = 75` ticks (3 s) of the previous kill extends the chain; otherwise
  it starts a new chain of one. Any Earth impact breaks the chain. The multiplier is
  `min(COMBO_MAX_MULTIPLIER = 4, 1 + ⌊(chain − 1) / 2⌋)`: kills 1–2 ×1, 3–4 ×2, 5–6 ×3, 7+ ×4. The HUD shows
  `COMBO n · next ×m` while a chain of 2+ is live.
- **Wave-clear bonuses** (P10), paid on the clear tick and carried on `waveCleared`: `clearBonus = 20 × wave` and
  `earthBonus = ⌊30 × earthHealth / EARTH_MAX_HEALTH⌋`, judged before that clear's repair and regen.
- **Invariant**: the score always equals the sum of the scored events: kill `points`, `objectiveMet.points`,
  `waveCleared.clearBonus + earthBonus` (`pointsIn`).
- **Accuracy** is photon hits (`asteroidHit` + photon kills) over photons fired. It is shown, not scored.
- The run ends on the tick Earth's health or the hull reaches 0 (clamped at 0). After that, `step` returns the state unchanged.
- The best score is kept per browser (`localStorage`). Only a strictly higher score replaces it.
- **Run summary** (P10): the game-over card breaks the score into kills (base), combo bonus, objectives, wave clears
  and Earth bonus (adding up to the total), then difficulty, time, accuracy, rockets fired and Earth hits.
- **Local top-10** (P10): the 10 best runs in this browser (score, difficulty, waves cleared or 🌍 for a won
  campaign, date), no name entry. A run that places is highlighted with its rank. Ties keep the older run ahead;
  0-point runs are never recorded.

## 7. Tick order

Each tick, in this order:
1. Apply input: turning, throttle, turbo/strafe movement, firing.
2. Ship hazards: mothership push-out, hangar refill, atmosphere burn, Earth contact.
3. Waves: the lead-in countdown, scheduled spawns, and the wave clear (§10).
4. Move asteroids, then resolve Earth impacts.
5. Move projectiles and resolve hits (rockets home before moving).
6. Expire projectiles whose life ran out, fold the tick's events into the wave's objective tallies, and check the run's end.

The sim emits **events** for anything the renderer, audio or HUD react to (`turboStarted`, `turboEnded`,
`fuelEmpty`, `mothershipBump`, `photonFired`, `rocketFired {target}`, `rocketLocked`, `projectileSpent {on: asteroid | earth | mothership}`, `asteroidHit {hp}`,
`asteroidDestroyed {by, size, pos, points}`,
`asteroidSpawned`, `earthHit`, `shipReloaded`, `hullBurning`, `runEnded`, `waveStarted {wave, count, objective}`,
`waveCleared {wave, objectiveMet, regen}`, `objectiveMet {wave, points, repair}`, `campaignWon`).

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
- **Keyboard rockets** (P27): V fires a homing rocket in both layouts, alongside right mouse (modern) and R (classic), so
  every flight action has a keyboard key and the game plays 100 % from the keyboard (arrows aim in modern). Touch and
  gamepad already had rocket buttons. Follow-ups in this packet: collecting a perk plays a short synthesised chime,
  and pickups show on the radar as small squares in the perk's colour.
- **Hyperdrive thrusters** (P28): every craft's nozzles glow with the throttle; holding Shift ramps up a hot plume, a particle trail (not on low quality) and a whoosh. Render-only. See [hyperdrive-thrusters](docs/spec/hyperdrive-thrusters/hyperdrive-thrusters.md).
- **Credits and station shop** (P29): kills, objectives and wave clears earn credits (a tenth of their points). In a wave's lead-in, B pauses into the station shop: photon damage, fire rate, hull, Earth shield, engines and perk duration, 3 levels each at 100 / 250 / 450. Credits are saved globally, upgrades per ship. See [credits-shop](docs/spec/credits-shop/credits-shop.md).
- **Look and feel** (P30): bloom (high and medium quality), a procedural nebula sky, smoke from a ship below half hull, a cockpit reticle with a hit marker and a ×N combo badge, a hit-stop and white flash on big kills, and a synthesised rumble under big explosions. See [look-and-feel](docs/spec/look-and-feel/look-and-feel.md).
- **Wave missions** (P31): every wave has one mission, its campaign objective or a seeded draw (fast clear, combo chain, no hull burns). Completing it pays 25 + 5 × wave bonus credits. See [wave-missions](docs/spec/wave-missions/wave-missions.md).
- **Lock-on missiles** (P32): bought in the station shop (200 / 350 / 550). Hold the rocket button to lock up to 1 + level targets (one every 0.3 s) and release to fire a homing volley for one rocket. Numbered red brackets mark the locks. See [lock-on-missiles](docs/spec/lock-on-missiles/lock-on-missiles.md).
- **Daily challenge** (P33): a title-card button starts the UTC day's seeded run (Normal, Fighter, no upgrades, no credits). Today's best is kept locally, separate from the all-time best and top 10. See [daily-challenge](docs/spec/daily-challenge/daily-challenge.md).
- **Boss waves** (P34): every 5th wave opens with a boss asteroid (radius 220, 120 hp, slow) that sheds a fragment every 5 s and hits Earth for 40. Rockets chip it for 15 and bombs for 30. Defeat pays 300 points plus 100 credits. A HUD bar shows its health. See [boss-waves](docs/spec/boss-waves/boss-waves.md).
- **G-Ship** (P35): a fourth craft on the picker. It turns 10 % faster, carries 15 % more fuel and an extra rocket, and has 20 % less hull than the Fighter. Built from the mirrored g-ship model. See [g-ship](docs/spec/g-ship/g-ship.md).
- **Hebrew and tutorial** (P36): an English / עברית language toggle on the title card and in settings (Hebrew is right to left). A five-step first-run tutorial covers aim, fire, rocket, throttle and reload; K skips it, and it can be replayed from the title card. See [i18n-tutorial](docs/spec/i18n-tutorial/i18n-tutorial.md).
- **Replays** (P37): every run is recorded as its seed, rules and per-tick inputs. The last run can be watched, exported as JSON and imported again from the title or game-over card. Watching never touches scores, the wallet or achievements. See [replays](docs/spec/replays/replays.md).
- **Touch controls** (P15), for tablets and phones in landscape:
  - Shown during play when the primary pointer is coarse and the device has touch points. `?touch` forces them
    on and `?touch=0` off. The keyboard and mouse keep working alongside.
  - **Stick**: a finger anywhere on the left half drops a floating stick under it, 64 px in radius with a 12 %
    dead zone. Deflection is pitch and yaw (up is nose up; invert-Y and sensitivity apply), clamped to a full-rate
    turn.
  - **Throttle slider** on the right edge: levels 0 to 4. It follows the ship's throttle until touched, then steps
    the throttle one level per tick toward the finger's level. A key or wheel step wins that tick.
  - **Buttons**: FIRE (hold, photons), ROCKET (tap; up to 3 taps queue) and TURBO (hold). Ⅱ pauses; tap to resume.
  - No pointer lock in touch mode. In portrait, a "turn your device sideways" card covers the game.
  - **Decisions**: touch devices default to Kid / Easy (a stored difficulty wins). No gyro aim for now. Touch
    controls ship in the shippable milestone, for Shalev's tablet.
- **Gamepad** (P19), any pad the browser reports (the W3C *standard* mapping, so Xbox and PlayStation pads alike;
  a standard pad is preferred when several are connected). It works alongside the keyboard, mouse and touch:
  - **Held**: left stick aims (up is nose up; invert-Y applies, a 15 % radial dead zone, full deflection is a
    full-rate turn), right stick strafes (past the dead zone), LB / RB roll, RT holds photons, LT holds the turbo
    and B holds reverse. Triggers count past half way.
  - **Presses** (once per push): A launches a rocket, Y or d-pad up throttles up, X or d-pad down throttles down,
    Back cycles the camera and Start starts, pauses and resumes.
  - Stick axes add to the keyboard and mouse and clamp to [−1, 1]; buttons OR with the keys.
  - The controls list adds a gamepad section while a pad is connected. Disconnecting releases everything.
  - **Card prompts** (P22): while a pad is connected the title and pause buttons read "Press Start to play" /
    "Press Start to resume", and the win and game-over buttons Start triggers get "(Start)". They update live on
    connect and disconnect; otherwise "Tap" (touch) or "Click".
  - **Decisions**: no rebinding, rumble or menu navigation by d-pad for now; the mapping is fixed and documented.
- **Pause and settings overlay** (P13):
  - Esc (leaving pointer lock, or a plain keypress in the classic layout) or P pauses; click, Enter or P resumes.
    The sim doesn't tick while paused.
  - The pause card shows the settings panel open; the title card has it folded. The controls list beside it always
    reflects the active layout.
  - Settings: keys (modern/classic), camera, invert mouse Y, mouse sensitivity (×0.25 to ×3 in 0.25 steps,
    default ×1: `MOUSE_PX_PER_TICK ÷ sensitivity` px is a full-rate turn), volume (0–100 % in 10 % steps, default
    100 %; separate from mute), sound, screen shake, controls-in-play and difficulty. Mid-run, difficulty applies
    to the next run and says so.
  - Every change applies at once and persists per browser. Stored values are clamped and snapped; settings saved
    before P13 load with the new defaults.
  - **Narrow screens** (P21): below 1240 px wide the card sits at the left edge and the controls list narrows to
    340 px (wrapping long labels); below 720 px tall it tightens and clips at the screen edge. The list never covers
    the card.
  - **Decision**: no separate first-run tutorial. The title card already shows the full controls list and the
    goal, and the pause card repeats it.

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

- **Portal look** (P14): the game uses the games.hochgi.com portal's look: Segoe UI/Arial, gold text (`#f0d9a8`),
  sage secondary text (`#a8c9b0`), green card borders (`#3a9d6e`) on dark green-black cards, and its own SVG favicon
  (a rock with a comet trail). The title, pause and game-over cards link back to the portal (`/`).
  - **Decision**: the portal tile goes up in a PR on `shalevhoch/shalevhoch.github.io` that isn't self-merged. Shalev
    owns the Hebrew name, text and icon, and merging it is when the game gets listed.

## 10. Waves, objectives and difficulty

- **Campaign**: `CAMPAIGN_WAVES = 10` waves, then endless waves that keep escalating until the run ends.
  - Wave *n* (index *i* = *n* − 1) has these values:
    - `5 + 2i` asteroids;
    - a spawn every `max(50, 200 − 14i)` ticks;
    - a speed of `min(6, 3 × (1 + 0.05i))`;
    - a big chance of `min(0.6, 0.2 + 0.03i)`.
  - The endless caps are `ENDLESS_MIN_INTERVAL`, `ENDLESS_MAX_SPEED` and `ENDLESS_MAX_BIG`.
- **Wave life**:
  - A wave's lead-in counts down. Wave 1 starts `SPAWN_INTERVAL` ticks into the run; later waves start
    `BREATHER_TICKS = 125` ticks after the previous clear.
  - When it ends, `waveStarted` fires and the first asteroid spawns, then the rest at the wave's interval.
  - A wave is cleared on the first tick after all its asteroids have spawned and none are alive (killed or crashed).
    `waveCleared` fires.
  - Clearing wave 10 also fires `campaignWon`.
- **Objectives**: every wave after the first has one, judged at the clear from that wave's tallies.
  - The campaign order: none, no Earth hit, 2 rocket kills, 2 big kills, no Earth hit, photons only (no rockets fired),
    3 rocket kills, no Earth hit, 4 big kills, no Earth hit. Endless waves cycle the same list.
  - Meeting one scores `OBJECTIVE_POINTS_BASE + OBJECTIVE_POINTS_PER_WAVE × n` (`50 + 10n`) and repairs Earth by
    `OBJECTIVE_REPAIR = 10`, capped at its maximum. `objectiveMet` fires.
- **Difficulty presets**, chosen on the title screen and kept per browser. **Normal** is the default.

  | Preset | Asteroid speed | Spawn interval | Earth damage | Earth regen per clear | Rocket lock cone | Turbo fuel per tick |
  |---|---|---|---|---|---|---|
  | Kid / Easy | × 0.6 | × 1.4 | × 0.5 | +20 | 60° | 0 |
  | Normal | × 1 | × 1 | × 1 | 0 | 30° | 1 |
  | Hard | × 1.25 | × 0.8 | × 1.5 | 0 | 30° | 1 |
- **Win**: after wave 10 the game pauses on a win card (score, difficulty). **Keep going** continues into the endless
  waves; **Finish** ends the run as a win ("You saved Earth!") and records the best score.
- **UI**:
  - A banner announces each wave (number, asteroid count, objective) and each clear (bonus, regen).
  - The HUD shows the wave (or ENDLESS *n*) and the objective's live progress.
  - The game-over card adds the difficulty, the waves cleared and the objectives met.

## 11. Threat awareness

P09: the player can always tell where every asteroid is and how long Earth has. Every asteroid is Earth-bound, so
every asteroid is a threat and all of them are shown.

- **Time to impact** of an asteroid: the gap between its surface and Earth's, over its speed, in ticks
  (`(|pos − EARTH_POS| − EARTH_RADIUS − r) / speed`, never below 0). Asteroids fly straight at Earth, so it is exact:
  the impact happens on tick ⌈TTI⌉.
- **HUD readout**: `IMPACT m:ss` for the most urgent asteroid (smallest TTI, ties to the lowest id), rounded up to
  the second. Calm above 30 s, warning (amber) under 30 s, critical (red, blinking) under 10 s. Hidden with no
  asteroids.
- **Off-screen arrows**: every asteroid outside the view gets a triangle on an inset screen border, pointing the way
  to turn. A point behind the camera is mirrored, so the arrow still says which way to turn; dead behind points down.
  The arrow is coloured by that asteroid's urgency.
- **Distant markers**: an on-screen asteroid smaller than 7 px gets a ring, so none is ever invisible.
- **Target brackets**: the asteroid a rocket would lock on (§5, the preset's lock cone) gets a dashed green bracket
  while rockets remain; asteroids with a rocket homing on them get a solid orange bracket.
- **Radar**: a 2D ship-relative disc (bottom left, range 4000 units). Forward is up, right is right. Blips are filled
  above the wing plane and hollow below; points beyond the range sit on the rim. Earth and the mothership are shown
  too.
- The overlay is drawn on a 2D canvas over the 3D view, outside the sim. It is hidden on the title screen.

## 12. Effects (FX)

P11: the original's sprite particles, drawn by the web layer from sim events. Nothing here feeds back into the sim.

- **One batch**: every sprite (particles and shots) is one instanced draw from one texture atlas, sorted farthest first
  each frame, with premultiplied alpha and one blend (`ONE, ONE_MINUS_SRC_ALPHA`). Additive sprites write α = 0.
- **View-plane flattening**: each quad faces the eye ray to its centre and is then slid, corner by corner along the
  eye rays, onto the plane through its centre parallel to the view plane. Its screen image is unchanged and its depth
  is constant, so sprites don't cut into asteroids or each other.
- **Particles** update on a 25 Hz FX clock (paused with the game, running behind the end cards), ported rule for rule
  from the Java sprites: Flash, Flame, Flare and Glint. Shots keep their P06 sizes (the original photon was a
  2-unit dot).
- **Cap**: at most `MAX_PARTICLES = 4000` live particles. Past it, the oldest are dropped first.
- **Event → effect** (from the original collision handlers):

  | Sim event or state | Effect |
  |---|---|
  | `asteroidDestroyed`, `earthHit` | explosion, size 3 (big) or 0.25 (small), with a shockwave facing away from Earth |
  | `projectileSpent` on Earth or the mothership | explosion, size 0.25 (photon) or 1 (rocket) |
  | `asteroidHit` (photon chip) | on the surface, on the side the photon came from: 1 small flash + 3 sparks + 5 smoke streaks |
  | `hullBurning` | 2 glints at the ship |
  | `runEnded: shipDestroyed` | explosion, size 3, at the ship |
  | each tick, per flying rocket | 8 trail flares + 1 smoke streak over the last tick of flight |
  | each tick, per asteroid in the atmosphere | a flare tail (16 big / 4 small) and, for a big one, 3 flames |
- A visual test page at `fx.html` triggers each effect next to a big asteroid and has a 2000-particle stress mode
  with an fps readout.

P12 adds the full explosion and Earth-hit feedback:

- **Explosion** (the original `Explosion`): a shockwave of size `10 × size` (only when it has a normal, i.e. asteroid
  explosions), then 10 flashes, 40 flames, 50 smoke streaks and 100 sparks. Ship, rocket and photon explosions have
  no shockwave, as in the original.
- **Shockwave**: a ring on the plane ⊥ its normal, its up axis the camera's up at spawn projected onto that plane;
  ×1.25 size and ×0.85 alpha per FX tick, gone under 0.1 alpha (15 ticks). At most 24 at once, oldest dropped. Drawn
  before every sprite, view-plane flattened like them.
- **Line sprites** (the original `LineSprite`): a quad from head to tail, `ratio × length` wide, its width ⊥ both the
  line and the eye ray to its middle, flattened onto the head's view plane. Sparks (alpha ×0.88, then ×0.5 once under
  ⅓) and smoke streaks (alpha ×0.85, tail fixed while the head runs out) are ported rule for rule.
- **Rocket smoke** (new; the original rocket shed flares only): one streak per tick from where the rocket was to
  where it is, fading ×0.9 and widening ×1.04.
- **Chip point** (deviation): the original drew chip sparks at the asteroid's centre, where its depth test hid them.
  Here they show on the surface (`1.02 × BIG_RADIUS` toward the photon's last position), with one small flash so a
  chip reads at range.
- **Earth hit**: the camera shakes (≤ 0.014 rad, 450 ms, quadratic fall-off) and the screen flashes red at the edges
  (≤ 0.35 opacity, 550 ms), both scaled by damage ÷ big-asteroid damage (capped at 1). A stronger hit restarts a
  running jolt; a weaker one doesn't cut it short.
- **Shake setting** (decision): on by default, off by default when the browser asks for reduced motion; a stored
  setting wins either way. The flash stays on with shake off. P13's settings screen exposes the toggle.

## 13. Achievements

P16: twelve achievements, read off sim events and state by a pure run tracker (`trackAchievements`). Unlocks persist
per browser with their date. A new one toasts during play, the game-over card lists the run's new unlocks, and the
title card has the full list.

| Achievement | How |
|---|---|
| First contact | Destroy an asteroid. |
| Chain reaction | A 10-kill combo chain. |
| Perfect wave | Clear a wave without an Earth hit. |
| Earth untouched | Clear wave 5 without an Earth hit all run. |
| Close call | Clear a wave with Earth at 10 % or less, before the clear's repair and regen. |
| Sharpshooter | 20 photon hits in a row: a photon that expires or hits Earth or the mothership breaks the streak. |
| Lock-on | 10 rocket kills in one run. |
| Long haul | Survive 5 minutes (7500 ticks) in one run. |
| Earth is safe | Clear all 10 waves. |
| Photons only | Win the campaign without firing a rocket. |
| Hardened | Win the campaign on Hard. |
| Beyond the campaign | Clear a wave in endless mode. |

- **Decision**: the list is the Coder Bot's pick (the issue's examples plus a spread from easy to hard). Gilad or
  Shalev can rename, swap or retune any of them; an unlock is keyed by id, so renames keep progress.
- No points or gameplay effect; achievements are cosmetic.

## 14. Performance and loading (P20)

- **Loading screen**: the page's HTML shows a title card with a progress bar before any script runs. The bar follows
  the three.js loading manager, only moves forward and reads 100 % only when every queued file is in. The HUD,
  radar and controls list stay hidden until the world is built. A load failure says so and asks for a reload.
- **Quality levels** (render only; the sim is untouched):

  | Level | Pixel ratio cap | FX particle cap |
  |---|---|---|
  | high (today's look) | 2 | 4000 |
  | medium | 1.5 | 2000 |
  | low | 1 | 1000 |

- Desktops start high and touch devices (§8) medium. During play, after a 3 s warm-up, every 2 s window that
  averages under 40 fps steps quality down one level, at once, down to low. It never steps back up in a run of the
  page, so it can't oscillate; frames over 250 ms (tab hidden, hitches) are ignored. `?quality=high|medium|low`
  pins a level and turns the auto step off.
- **Texture budget** (P24): earth.jpg is re-encoded at JPEG q85, 4:4:4, progressive (564 kB → 184 kB, PSNR 40 dB).
  The sky texture (space.jpg, 491 kB, kept as is) is no longer on the first-play path: the sky starts black and the
  stars fade in over ~0.6 s once it loads; if it fails, the sky stays black.
- **GLB models** (P25): every 3DS and LWO model (station, docks, barrack, Shuttle, the gallery extras, the four g_ships)
  ships as GLB, baked by `scripts/bake-glb.mjs` with textures embedded. Sources move to `packages/web/assets-src/`
  (kept for re-baking, not deployed). The bake keeps node transforms and records each Phong material in glTF extras,
  so the game rebuilds the same materials: craft and station renders are pixel-identical. GLTFLoader is imported on
  demand (the station and Shuttle load behind the title card), and no TDSLoader or LWOLoader ships. The gallery now
  shows 3DS textures in sRGB, matching the game (before, it showed them unconverted, a little brighter).
- **Graphics setting** (P23): the settings panel's Graphics row cycles auto → high → medium → low (default auto)
  and persists per browser. Auto shows the live level ("auto · medium") and keeps the step-down; a fixed level pins
  it. A change applies at once and restarts auto from the device's starting level. `?quality=` beats the setting and
  the row says "set by URL".
- **Budget**: the title card is ready in about 3.4 s on an emulated 4G link (9 Mbit/s, 150 ms RTT) against the
  uncompressed preview server; GitHub Pages gzips the 560 kB script to ~140 kB.
- **Decisions**: the reference device is a play-test item (Shalev's tablet); the 30 fps floor is checked there. No
  KTX2/GLB conversion for now: the first-play payload is ~2 MB of mostly JPEG, and a KTX2 transcoder plus re-encode
  would add complexity for little gain. P25 baked the LWO and 3DS models to GLB (below). The quality picker landed in
  P23.

## 15. Perks (P26)

- **Drops**: each asteroid the player destroys (photon or rocket) drops a pickup with chance `PERK_DROP_CHANCE = 4 %`,
  or `6 %` while struggling (Earth or hull below half). Smart-bomb kills never drop. The kind is weighted: shield 3,
  rapid fire 3, spread shot 2, magnet 2, smart bomb 1.
- Drops draw from a second RNG stream, `perkRng`, seeded from the run's seed (`seed ^ 0x5bd1e995`). The main `rng` is
  never touched, so a run where no pickup is collected plays exactly as before P26. Same seed + inputs → same drops.
- **Pickups** drift at 0.6 units per tick in a random direction from the kill. They last `PICKUP_LIFE = 200` ticks
  (8 s), blinking in the last 2 s and fading in the last 0.5 s. The ship collects one when its centre comes within
  `SHIP_RADIUS + 40`; collection is checked before expiry. Tick order: after projectiles (step 5), count perks down,
  move pickups, collect (in id order), expire, then roll this tick's drops.
- **Perks** (timed ones refresh on a repeat pickup, never stack):

  | Perk | Effect | Duration |
  |---|---|---|
  | Shield | Earth impacts do no damage and keep the combo (`shieldBlocked`); a bubble shows round Earth | 10 s |
  | Rapid fire | Photon cooldown 2 ticks instead of 5 | 10 s |
  | Spread shot | Each shot adds two photons turned ±0.1 rad about the ship's up axis | 10 s |
  | Magnet | Pickups within 1500 fly to the ship at 25 units per tick | 15 s |
  | Smart bomb | Instantly destroys every asteroid within 2500 of the ship: rocket points, no split, no drops | instant |

- **On screen**: pickups are glowing orbs in the perk's colour with a white core. The HUD lists active perks with
  seconds left; collecting shows a short banner. Existing tuning knobs are unchanged.


Game-design questions not yet decided. `/refine-packet` resolves them with Gilad, and `/spec-to-ship` halts on
any it meets that are still open.

