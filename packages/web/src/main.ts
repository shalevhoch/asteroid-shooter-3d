/**
 * The game (P07): title → play → game over → restart, around the pure sim's fixed 25 Hz tick.
 * requestAnimationFrame drives `step`; rendering interpolates between the last two ticks.
 */
import * as THREE from 'three';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, NEW_RUN, trackAchievements, type AchievementId, type AchievementRun, CAMPAIGN_WAVES, CRAFTS, CRAFT_IDS, DIFFICULTIES, LOCAL_FORWARD, PRESETS, crosshairTarget, rotate, TICK_MS, initialState, step, ticksFor, type GameState, type SimEvent } from '@asteroid/sim';
import { ACHIEVEMENTS_KEY, parseUnlocks, recordUnlocks, unlockedCount } from './achievementStore.js';
import { assetUrl } from './assetUrl.js';
import { AsteroidView } from './asteroidView.js';
import { AudioBank, cuesFor } from './audio.js';
import { Controls } from './controls.js';
import { buildAtlas } from './fx/atlas.js';
import { BillboardBatch } from './fx/batch.js';
import { recipesFor } from './fx/bus.js';
import { FxEngine, MAX_PARTICLES } from './fx/engine.js';
import { ShockwaveLayer } from './fx/shockwave.js';
import { addJolt, hitStrength, joltAt, type Jolt } from './shake.js';
import { TOP_KEY, insertScore, localDate, parseTop, type ScoreEntry } from './leaderboard.js';
import { BEST_KEY, EMPTY_STATS, accuracy, addStats, formatTime, nextPhase, parseBest, updateBest, type FlowAction, type Phase, type RunStats } from './game.js';
import { Hud, hudModel } from './hud.js';
import { ACTION_LABELS, LAYOUTS, bindings, keyLabel } from './keymap.js';
import { addStation, buildWorld } from './scene.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, changeSetting, cycle, parseSettings, settingRows, type SettingId } from './settings.js';
import { ThreatView } from './threatView.js';
import { LoadProgress } from './loading.js';
import { QualityGovernor, initialQuality, type QualityLevel } from './quality.js';
import { GamepadInput, mergePad, type PadPress } from './gamepad.js';
import { mergeTouch, wantsTouch } from './touch.js';
import { TouchControls } from './touchControls.js';
import { DIFFICULTY_LABELS, bannerFor, type Banner } from './waveUi.js';
import { AIM_DISTANCE, CAMERA_MODES, FOV_BASE, aimPoint, cameraPose, interpolate, nextFov } from './view.js';

const base = import.meta.env.BASE_URL;
const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};
const host = el('app');
const help = el('help');
const overlay = el('overlay');
const status = el('status');
const bannerEl = el('banner');
let bannerTimer: ReturnType<typeof setTimeout> | undefined;
function showBanner(b: Banner) {
  const [h, p] = [bannerEl.querySelector('h2'), bannerEl.querySelector('p')];
  if (h) h.textContent = b.title;
  if (p) p.textContent = b.subtitle;
  bannerEl.classList.add('on');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    bannerEl.classList.remove('on');
  }, b.durationMs);
}

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode: nothing persists.
    }
  },
};
/** Touch controls (P15): on a touch-first device, or with `?touch`. */
const touchMode = wantsTouch({ coarse: window.matchMedia('(pointer: coarse)').matches, maxTouchPoints: navigator.maxTouchPoints, search: location.search });
if (touchMode) document.body.classList.add('touch-mode');
const settings = (() => {
  try {
    return parseSettings(storage.get(SETTINGS_KEY), window.matchMedia('(prefers-reduced-motion: reduce)').matches, touchMode);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
})();
const saveSettings = () => {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
};
let top: ScoreEntry[] = parseTop(storage.get(TOP_KEY));
/** The best score: the stored best, or the top-10's first run if that is higher. */
let best = Math.max(parseBest(storage.get(BEST_KEY)), top[0]?.score ?? 0);
let unlocks = parseUnlocks(storage.get(ACHIEVEMENTS_KEY));
let achRun: AchievementRun = NEW_RUN;
/** Achievements first unlocked during this run, for the game-over card. */
let runUnlocks: AchievementId[] = [];
const toastEl = el('toast');
const toastQueue: AchievementId[] = [];
let toastBusy = false;
function nextToast() {
  const id = toastQueue.shift();
  if (!id) {
    toastBusy = false;
    return;
  }
  toastBusy = true;
  toastEl.innerHTML = `<b>🏆 ${ACHIEVEMENTS[id].name}</b><span>${ACHIEVEMENTS[id].how}</span>`;
  toastEl.classList.add('on');
  setTimeout(() => {
    toastEl.classList.remove('on');
    setTimeout(nextToast, 450);
  }, 2600);
}
/** The finished run's top-10 rank, or null. */
let rank: number | null = null;

const renderer = new THREE.WebGLRenderer({ antialias: true });
const quality = new QualityGovernor(initialQuality(location.search, touchMode));
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.current.dprCap));
renderer.setSize(window.innerWidth, window.innerHeight);
host.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(FOV_BASE, window.innerWidth / window.innerHeight, 1, 30000);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const controls = new Controls(renderer.domElement, settings);
const gamepad = new GamepadInput();
const PAD_ACTIONS = { rocket: 'fireRocket', throttleUp: 'throttleUp', throttleDown: 'throttleDown', camera: 'toggleCamera' } as const;
const PAD_HELP = [
  ['left stick', 'aim (pitch / yaw)'],
  ['right stick', 'strafe'],
  ['LB / RB', 'roll'],
  ['RT', 'photons (hold)'],
  ['A', 'homing rocket'],
  ['LT', 'turbo (hold)'],
  ['B', 'reverse (hold)'],
  ['Y / X, d-pad', 'throttle + / −'],
  ['Back', 'camera'],
  ['Start', 'start · pause · resume'],
];
let padShown = false;
const audio = new AudioBank(base);
audio.muted = settings.muted;
audio.volume = settings.volume;
const hud = new Hud(el('hud'));
const threat = new ThreatView(el('threat') as HTMLCanvasElement);
const viewProj = new THREE.Matrix4();

const TOUCH_HELP = [
  ['left side', 'drag to aim (a stick appears under your finger)'],
  ['right slider', 'throttle 0–4'],
  ['FIRE', 'photons (hold)'],
  ['ROCKET', 'homing rocket (tap)'],
  ['TURBO', 'turbo (hold)'],
  ['Ⅱ', 'pause'],
];

const padRows = (): string => (gamepad.connected ? `<tr><th colspan="2">Gamepad</th></tr>${PAD_HELP.map(([k, v]) => `<tr><td>${k ?? ''}</td><td>${v ?? ''}</td></tr>`).join('')}` : '');

function renderHelp(): void {
  if (touchMode) {
    help.innerHTML = `<h2>Touch controls</h2><table>${TOUCH_HELP.map(([k, v]) => `<tr><td>${k ?? ''}</td><td>${v ?? ''}</td></tr>`).join('')}${padRows()}</table><p>Landscape works best</p>`;
    help.style.display = phase === 'title' || phase === 'paused' ? 'block' : 'none';
    return;
  }
  const rows = bindings(settings.layout)
    .map(([action, codes]) => `<tr><td>${[...new Set(codes.map(keyLabel))].join(' / ')}</td><td>${ACTION_LABELS[action]}</td></tr>`)
    .join('');
  const mouse =
    settings.layout === 'modern'
      ? `<tr><td>mouse</td><td>aim (pitch / yaw)${settings.invertY ? ', Y inverted' : ''}</td></tr><tr><td>wheel</td><td>throttle ±</td></tr>`
      : '';
  help.innerHTML = `<h2>Controls: ${settings.layout}${settings.muted ? ' · muted' : ''}</h2><table>${mouse}${rows}${padRows()}</table><p>Esc or P pauses</p>`;
  // Always on the title and pause screens; in play only when toggled on.
  help.style.display = settings.help || phase === 'title' || phase === 'paused' ? 'block' : 'none';
}

function applyToggles() {
  for (const t of controls.takeToggles()) {
    if (t === 'toggleCamera') settings.camera = cycle(CAMERA_MODES, settings.camera);
    else if (t === 'toggleLayout') settings.layout = cycle(LAYOUTS, settings.layout);
    else if (t === 'toggleInvertY') settings.invertY = !settings.invertY;
    else if (t === 'toggleHelp') settings.help = !settings.help;
    else if (t === 'toggleMute') audio.muted = settings.muted = !settings.muted;
    else continue;
    saveSettings();
    renderHelp();
    if (phase === 'paused' || phase === 'title') renderOverlay();
  }
}

// Loading screen (P20): index.html shows it before any script runs; asset progress fills the bar.
const loadProgress = new LoadProgress();
THREE.DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  const pct = `${String(loadProgress.update(loaded, total))}%`;
  const bar = document.querySelector<HTMLElement>('#loading i');
  if (bar) bar.style.width = pct;
  const label = document.getElementById('loadpct');
  if (label) label.textContent = pct;
};
const world = await buildWorld(base).catch((e: unknown) => {
  overlay.innerHTML = `<div class="card"><h1>☄️ Asteroid Shooter 3D</h1><p>Couldn't load the game's assets. Check the connection and reload.</p></div>`;
  throw e;
});
let stationRing: Awaited<ReturnType<typeof addStation>> | null = null;
// The station is dressing plus a reload point: load it behind the title card, not before it.
void addStation(world.scene, base).then((r) => {
  stationRing = r;
}).catch(() => undefined);
void world.setCraft(settings.craft);
const asteroids = new AsteroidView(world.scene, world.asteroidGeometry);
const atlas = await buildAtlas((p) => assetUrl(base, p));
const batch = new BillboardBatch(atlas, MAX_PARTICLES + 64);
const shockwaves = new ShockwaveLayer(world.scene, atlas);
const hitFlash = el('hitflash');
const touchUi = touchMode
  ? new TouchControls(document.body, () => {
      dispatch('pause');
    })
  : null;
let jolt: Jolt | null = null;
world.scene.add(batch.mesh);
const fx = new FxEngine();
fx.particleCap = quality.current.particleCap;
/** FX run on their own 25 Hz clock, so explosions finish behind the game-over card. */
let fxAccMs = 0;

let phase: Phase = 'title';
let prev: GameState = initialState(Date.now() >>> 0);
let curr: GameState = prev;
let stats: RunStats = EMPTY_STATS;
let newBest = false;
let wonRun = false;
let accMs = 0;
let lastMs = performance.now();
let fov = FOV_BASE;

/** Back to games.hochgi.com (P14), on the title, pause and game-over cards. */
const PORTAL_LINK = '<p class="portal"><a href="/">← all games · games.hochgi.com</a></p>';

const END_TEXT = { earthDestroyed: 'Earth has fallen.', shipDestroyed: 'Your ship was destroyed.' } as const;

function difficultyPicker(): string {
  return `<div class="diff">${DIFFICULTIES.map((d) => `<button data-diff="${d}" class="${d === settings.difficulty ? 'on' : ''}">${DIFFICULTY_LABELS[d].name}</button>`).join('')}</div><p class="dim">${DIFFICULTY_LABELS[settings.difficulty].blurb}</p>`;
}

/** The settings panel (P13): every row changes and persists at once. Folded on the title card, open on the pause card. */
function settingsPanel(open: boolean): string {
  const rows = settingRows(settings, DIFFICULTY_NAMES, phase === 'paused')
    .map((r) => {
      const ctl =
        r.kind === 'range'
          ? `<button data-set="${r.id}" data-dir="-1" aria-label="less">−</button><span class="val">${r.value}</span><button data-set="${r.id}" data-dir="1" aria-label="more">+</button>`
          : `<button data-set="${r.id}" class="val">${r.value}</button>`;
      return `<tr><td>${r.label}${r.note ? ` <span class="dim">(${r.note})</span>` : ''}</td><td class="ctl">${ctl}</td></tr>`;
    })
    .join('');
  return `<details class="settings"${open ? ' open' : ''}><summary>Settings</summary><table>${rows}</table></details>`;
}

const DIFFICULTY_NAMES = Object.fromEntries(DIFFICULTIES.map((d) => [d, DIFFICULTY_LABELS[d].name])) as Record<(typeof DIFFICULTIES)[number], string>;

/** Every achievement, unlocked ones first marked with their date (P16). */
function achievementsPanel(): string {
  const rows = ACHIEVEMENT_IDS.map((id) => {
    const d = unlocks[id];
    return `<tr class="${d ? 'got' : 'locked'}"><td>${d ? '🏆' : '·'}</td><td><b>${ACHIEVEMENTS[id].name}</b><br><span class="dim">${ACHIEVEMENTS[id].how}</span></td><td class="dim">${d ?? ''}</td></tr>`;
  }).join('');
  return `<details class="settings ach"><summary>Achievements ${String(unlockedCount(unlocks))}/${String(ACHIEVEMENT_IDS.length)}</summary><table>${rows}</table></details>`;
}

const CRAFT_LABELS = {
  fighter: { name: 'Fighter', blurb: 'The original ship. Balanced.' },
  interceptor: { name: 'Interceptor', blurb: 'Turns faster; less fuel, hull and one rocket fewer.' },
  shuttle: { name: 'Shuttle', blurb: 'Turns slower; more fuel, a tougher hull and five rockets.' },
} as const;

/** The craft picker (P17): name, a blurb and the stats against the Fighter. */
function craftPicker(): string {
  const c = CRAFTS[settings.craft];
  const f = CRAFTS.fighter;
  const pct = (v: number, base: number) => `${String(Math.round((v / base) * 100))}%`;
  return `<div class="diff craft">${CRAFT_IDS.map((id) => `<button data-craft="${id}" class="${id === settings.craft ? 'on' : ''}">${CRAFT_LABELS[id].name}</button>`).join('')}</div>
    <p class="dim">${CRAFT_LABELS[settings.craft].blurb}<br>turn ${pct(c.turnRate, f.turnRate)} · fuel ${String(c.fuelMax)} · hull ${String(c.hullMax)} · rockets ${String(c.rocketMax)}</p>`;
}

/** A function, so TypeScript doesn't narrow `phase` across calls that change it. */
const isPlaying = (): boolean => phase === 'playing';
/** Whether the title card's settings panel is unfolded (kept across re-renders). */
let settingsOpen = false;

function renderOverlay() {
  overlay.dataset['phase'] = phase;
  if (phase === 'playing') {
    overlay.innerHTML = '';
    return;
  }
  if (phase === 'title') {
    overlay.innerHTML = `<div class="card"><h1>☄️ Asteroid Shooter 3D</h1>
      <p>Asteroids are falling toward Earth. Shoot them down. Photons chip, rockets home in. Reload at the mothership's hangar.</p>
      <p class="dim">Best score: ${String(best)}</p>${difficultyPicker()}${craftPicker()}
      <button id="go">${touchMode ? "Tap" : "Click"} to start</button><p class="dim">${touchMode ? "Ⅱ pauses · landscape works best" : "Enter also starts · Esc or P pauses · H shows the controls · M mutes"}</p>${settingsPanel(false)}${achievementsPanel()}${PORTAL_LINK}</div>`;
  } else if (phase === 'paused') {
    overlay.innerHTML = `<div class="card"><h1>Paused</h1><button id="go">${touchMode ? "Tap" : "Click"} to resume</button><p class="dim">Score ${String(curr.score)} · Enter or P also resumes</p>${settingsPanel(true)}${PORTAL_LINK}</div>`;
  } else if (phase === 'won') {
    overlay.innerHTML = `<div class="card"><h1>🌍 Earth is safe!</h1><p>You cleared all ${String(CAMPAIGN_WAVES)} waves on ${DIFFICULTY_LABELS[curr.difficulty].name}.</p>
      <div class="final">${String(curr.score)}</div>
      <div class="row"><button id="go">Keep going: endless mode</button><button id="finish">Finish the run</button></div></div>`;
  } else {
    overlay.innerHTML = `<div class="card wide"><h1>${wonRun ? 'You saved Earth!' : curr.ended ? END_TEXT[curr.ended] : 'Game over'}</h1>
      <div class="final">${String(curr.score)}</div>${newBest ? '<div class="newbest">NEW BEST!</div>' : `<p class="dim">Best ${String(best)}</p>`}
      ${runUnlocks.length ? `<p class="unlocked">🏆 Unlocked: ${runUnlocks.map((id) => ACHIEVEMENTS[id].name).join(' · ')}</p>` : ''}
      <div class="summary">${summaryTable()}${topTable()}</div>
      <button id="go">Play again</button>${PORTAL_LINK}</div>`;
  }
  document.getElementById('go')?.addEventListener('click', (e) => {
    e.stopPropagation();
    advance();
  });
  document.getElementById('finish')?.addEventListener('click', (e) => {
    e.stopPropagation();
    finishWon();
  });
  const details = overlay.querySelector<HTMLDetailsElement>('details:not(.ach)');
  details?.addEventListener('toggle', () => {
    settingsOpen = details.open;
  });
  if (details && phase === 'title') details.open = settingsOpen;
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-set]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      changeSetting(settings, b.dataset['set'] as SettingId, b.dataset['dir'] === '-1' ? -1 : 1);
      audio.muted = settings.muted;
      audio.volume = settings.volume;
      saveSettings();
      renderOverlay();
      renderHelp();
    });
  }
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-craft]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = CRAFT_IDS.find((x) => x === b.dataset['craft']);
      if (c) settings.craft = c;
      saveSettings();
      void world.setCraft(settings.craft);
      renderOverlay();
    });
  }
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-diff]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const d = DIFFICULTIES.find((x) => x === b.dataset['diff']);
      if (d) settings.difficulty = d;
      saveSettings();
      renderOverlay();
    });
  }
}

const row = (label: string, value: string): string => `<tr><td>${label}</td><td>${value}</td></tr>`;

/** The run breakdown (P10): how the score was made, then the run's stats. */
function summaryTable(): string {
  const pts = (n: number) => String(n);
  return `<table class="stats"><tr><th colspan="2">This run</th></tr>${[
    row(`Kills (${String(stats.kills)}, ${String(stats.bigKills)} big)`, pts(stats.killPoints)),
    row(`Combo bonus (best chain ${String(stats.bestCombo)})`, pts(stats.comboPoints)),
    row(`Objectives (${String(stats.objectivesMet)})`, pts(stats.objectivePoints)),
    row(`Wave clears (${String(stats.wavesCleared)})`, pts(stats.clearPoints)),
    row('Earth bonus', pts(stats.earthPoints)),
    `<tr class="total"><td>Total</td><td>${String(curr.score)}</td></tr>`,
    row('Difficulty', DIFFICULTY_LABELS[curr.difficulty].name),
    row('Time', formatTime(curr.tick)),
    row('Photon accuracy', `${String(accuracy(stats))}%`),
    row('Rockets fired', String(stats.rocketsFired)),
    row('Earth hits taken', String(stats.earthHits)),
  ].join('')}</table>`;
}

/** The local top-10, this run highlighted. */
function topTable(): string {
  if (top.length === 0) return '';
  const rows = top.map((e, i) => `<tr class="${i + 1 === rank ? 'me' : ''}"><td>${String(i + 1)}.</td><td>${String(e.score)}</td><td>${DIFFICULTY_LABELS[e.difficulty].name}</td><td>${e.won ? '🌍' : `W${String(e.waves)}`}</td><td class="dim">${e.date}</td></tr>`).join('');
  return `<table class="stats top"><tr><th colspan="5">Top 10${rank ? ` · you placed #${String(rank)}` : ''}</th></tr>${rows}</table>`;
}

function dispatch(action: FlowAction) {
  const before = phase;
  phase = nextPhase(phase, action);
  if (phase === before) return;
  if (phase === 'playing') {
    controls.reset();
    lastMs = performance.now();
    accMs = 0;
    touchUi?.reset();
    if (settings.layout === 'modern' && !touchMode) Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => undefined);
  }
  if (phase !== 'playing' && document.pointerLockElement) document.exitPointerLock();
  if (phase !== 'playing') bannerEl.classList.remove('on');
  renderOverlay();
  renderHelp();
}

function newRun() {
  prev = curr = initialState(Date.now() >>> 0, settings.difficulty, settings.craft);
  void world.setCraft(settings.craft);
  stats = EMPTY_STATS;
  newBest = false;
  rank = null;
  wonRun = false;
  asteroids.clear();
  fx.clear();
  jolt = null;
  achRun = NEW_RUN;
  runUnlocks = [];
}

/** The overlay's main button / Enter: start, resume or play again. */
function advance() {
  if (phase === 'title') {
    newRun();
    dispatch('start');
  } else if (phase === 'paused') dispatch('resume');
  else if (phase === 'won') dispatch('continue');
  else if (phase === 'over') {
    newRun();
    dispatch('restart');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && phase !== 'playing') advance();
  if (e.code === 'KeyP') dispatch(phase === 'paused' ? 'resume' : 'pause');
  // Esc pauses in the classic layout too, where there is no pointer lock to leave.
  if (e.code === 'Escape' && phase === 'playing') dispatch('pause');
});
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && phase === 'playing') dispatch('pause');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) dispatch('pause');
});
window.addEventListener('blur', () => {
  dispatch('pause');
});
// `?debug` exposes the live state to the console and to browser-driven checks.
if (new URLSearchParams(location.search).has('debug')) {
  Object.assign(window, {
    asteroidGame: () => curr,
    asteroidSetState: (s: GameState) => {
      prev = curr = s;
    },
    asteroidPhase: () => phase,
    asteroidQuality: () => ({ ...quality.current, pixelRatio: renderer.getPixelRatio(), particles: fx.particles.length }),
    asteroidStart: () => {
      advance();
    },
  });
}
renderOverlay();
renderHelp();
document.body.classList.remove('loading');

const v = new THREE.Vector3();
/** Applies a quality step (P20): a lower pixel ratio and particle cap, at once. */
function applyQuality(q: QualityLevel) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  fx.particleCap = q.particleCap;
}

renderer.setAnimationLoop((nowMs: number) => {
  if (phase === 'playing') {
    const q = quality.frame(nowMs - lastMs);
    if (q) applyQuality(q);
  }
  const frameMs = Math.min(Math.max(nowMs - lastMs, 0), 250);
  lastMs = nowMs;
  for (const p of gamepad.poll(settings.invertY)) onPadPress(p);
  if (gamepad.connected !== padShown) {
    padShown = gamepad.connected;
    renderHelp();
  }
  applyToggles();
  if (phase === 'playing') {
    const { ticks, remainderMs } = ticksFor(accMs + frameMs);
    for (let i = 0; i < ticks && isPlaying(); i++) {
      prev = curr;
      const base = touchUi ? mergeTouch(controls.nextInput(), touchUi.next(), curr.ship.throttle, settings) : controls.nextInput();
      const input = mergePad(base, gamepad.nextHeld(), settings.sensitivity);
      const r = step(curr, input);
      curr = r.state;
      onEvents(r.events, nowMs);
      fx.ambient(curr);
    }
    accMs = remainderMs;
  }
  if (phase !== 'paused' && phase !== 'title') {
    fxAccMs += frameMs;
    while (fxAccMs >= TICK_MS) {
      fx.tick();
      fxAccMs -= TICK_MS;
    }
  }
  const alpha = phase === 'playing' ? accMs / TICK_MS : 1;

  const pose = interpolate(prev.ship, curr.ship, alpha);
  world.ship.position.set(...pose.pos);
  world.ship.quaternion.set(...pose.rot);
  world.ship.visible = curr.ended !== 'shipDestroyed';
  const cam = cameraPose(pose, settings.camera);
  camera.position.set(...cam.eye);
  camera.up.set(...cam.up);
  camera.lookAt(v.set(...cam.look));
  const j = joltAt(jolt, nowMs, settings.shake);
  camera.rotateY(j.yaw);
  camera.rotateX(j.pitch);
  hitFlash.style.opacity = j.flash.toFixed(3);
  fov = nextFov(fov, curr.ship, frameMs / 1000);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  world.earth.rotation.y = nowMs / 1000 / 120;
  if (stationRing) stationRing.material.opacity = 0.35 + 0.3 * Math.sin(nowMs / 400);
  asteroids.update(prev.asteroids, curr.asteroids, alpha, curr.tick);

  camera.updateMatrixWorld();
  if (phase === 'title') threat.clear();
  else {
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const rocketTargets = new Set<number>();
    for (const p of curr.projectiles) if (p.kind === 'rocket' && p.target !== null) rocketTargets.add(p.target);
    const aimTarget = curr.ship.rockets > 0 ? crosshairTarget(curr.ship.pos, rotate(curr.ship.rot, LOCAL_FORWARD), curr.asteroids, PRESETS[curr.difficulty].rocketLockCone) : null;
    threat.draw({ viewProj: viewProj.elements, fovDeg: camera.fov, cameraPos: cam.eye, shipPos: pose.pos, shipRot: pose.rot, asteroids: curr.asteroids, aimTarget, rocketTargets });
  }
  hud.show(phase !== 'title');
  touchUi?.show(phase === 'playing');
  touchUi?.syncThrottle(curr.ship.throttle);
  hud.render(hudModel(curr, best));
  v.set(...aimPoint(pose, AIM_DISTANCE)).project(camera);
  hud.aim(v.z < 1 ? { x: v.x, y: v.y } : null);
  status.textContent = `camera ${settings.camera} [C] · layout ${settings.layout} [${settings.layout === 'classic' ? 'T' : 'L'}] · help [H] · sound ${settings.muted ? 'off' : 'on'} [M]`;
  batch.begin();
  fx.draw(batch, fxAccMs / TICK_MS, prev.projectiles, curr.projectiles, alpha);
  batch.end(camera);
  shockwaves.sync(fx.shockwaves);
  renderer.render(world.scene, camera);
});

/** Gamepad presses (P19): Start starts, pauses and resumes; the rest go through the keyboard's edge actions. */
function onPadPress(p: PadPress) {
  if (p === 'start') {
    if (phase === 'playing') dispatch('pause');
    else advance();
  } else controls.press(PAD_ACTIONS[p]);
}

function recordBest() {
  const r = updateBest(best, curr.score);
  best = r.best;
  newBest = r.isNew;
  if (r.isNew) storage.set(BEST_KEY, String(best));
  const t = insertScore(top, { score: curr.score, difficulty: curr.difficulty, waves: stats.wavesCleared, won: wonRun, date: localDate(new Date()) });
  top = t.list;
  rank = t.rank;
  if (t.rank) storage.set(TOP_KEY, JSON.stringify(top));
}

/** Ending a won campaign from the win screen: a game over without a loss. */
function finishWon() {
  wonRun = true;
  recordBest();
  dispatch('finish');
}

function onEvents(events: readonly SimEvent[], nowMs: number) {
  stats = addStats(stats, events);
  const banner = bannerFor(events);
  if (banner) showBanner(banner);
  if (events.some((e) => e.type === 'campaignWon')) dispatch('win');
  audio.play(cuesFor(events));
  const e = camera.matrixWorld.elements;
  fx.apply(recipesFor(events, curr), [e[4], e[5], e[6]]);
  jolt = addJolt(jolt, hitStrength(events), nowMs);
  const a = trackAchievements(achRun, events, curr);
  achRun = a.run;
  if (a.unlocked.length) {
    const r = recordUnlocks(unlocks, a.unlocked, localDate(new Date()));
    if (r.fresh.length) {
      unlocks = r.store;
      storage.set(ACHIEVEMENTS_KEY, JSON.stringify(unlocks));
      runUnlocks.push(...r.fresh);
      toastQueue.push(...r.fresh);
      if (!toastBusy) nextToast();
    }
  }
  if (events.some((e) => e.type === 'runEnded')) {
    recordBest();
    dispatch('end');
  }
}
