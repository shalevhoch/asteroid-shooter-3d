/**
 * The game (P07): title → play → game over → restart, around the pure sim's fixed 25 Hz tick.
 * requestAnimationFrame drives `step`; rendering interpolates between the last two ticks.
 */
import * as THREE from 'three';
import { ACHIEVEMENTS, ACHIEVEMENT_IDS, NEW_RUN, trackAchievements, type AchievementId, type AchievementRun, CAMPAIGN_WAVES, CRAFTS, CRAFT_IDS, DIFFICULTIES, LOCAL_FORWARD, PRESETS, crosshairTarget, rotate, TICK_MS, THROTTLE_MAX, EARTH_POS, EARTH_RADIUS, initialState, step, ticksFor, buyUpgrade, shopOpen, upgradedCraft, UPGRADE_IDS, type UpgradeId, type GameState, type SimEvent, NO_INPUT, type Input } from '@asteroid/sim';
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
import { SKY_RADIUS, addStation, applyPaint, buildWorld } from './scene.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, changeSetting, cycle, parseSettings, settingRows, type SettingId } from './settings.js';
import { ThreatView } from './threatView.js';
import { actionPrompt, inputKind, withStart } from './prompts.js';
import { LANGS, LANG_NAMES, bannerTitle, isRtl, t } from './i18n.js';
import { TUTORIAL_KEY, TUTORIAL_STEPS, advanceTutorial, tutorialHint } from './tutorial.js';
import { REPLAY_KEY, REPLAY_STORE_LIMIT, Recorder, applyBuys, parseReplay, replayInputs, replayStart, type Replay } from './replay.js';
import { DAILY_CRAFT, DAILY_DIFFICULTY, DAILY_KEY, DAILY_OPTIONS, dailyBest, dailySeed, recordDaily, utcDate } from './daily.js';
import { WALLET_KEY, parseWallet, runOptions, shopPanel, upgradeForKey, withRun } from './shop.js';
import { comboBadge, damageSmoke, flashAt, hitMarker, hitStopMs, killFlash } from './lookfeel.js';
import { buildNebula } from './nebula.js';
import { PostFx } from './postfx.js';
import { nozzleLook, nozzleWorld, rampThrust } from './thrusters.js';
import { PERK_LOOK, perkBanner, pickupLook } from './perksUi.js';
import { LoadProgress } from './loading.js';
import { QualityGovernor, initialQuality, urlQuality, type QualityLevel } from './quality.js';
import { GamepadInput, mergePad, type PadPress } from './gamepad.js';
import { mergeTouch, wantsTouch } from './touch.js';
import { TouchControls } from './touchControls.js';
import { DIFFICULTY_LABELS, bannerFor, type Banner } from './waveUi.js';
import { AIM_DISTANCE, CAMERA_MODES, FOV_BASE, aimPoint, cameraPose, interpolate, nextFov } from './view.js';
import { FILTER_LABELS, FOCUS_LABELS, applyPhotoInput, cycleFilter, cycleFocus, enterPhoto, filterCss, focusOn, photoPose, screenshotName, snapshotCanvas, type PhotoCam, type PhotoFilter } from './photo.js';
import { PAINT_IDS, PAINTS, PAINT_KEY, buyPaint, chosenPaint, paintUnlocked, parsePaint, selectPaint } from './paint.js';

const base = import.meta.env.BASE_URL;
const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};
const host = el('app');
const help = el('help');
const overlay = el('overlay');
const photoBar = el('photo');
const status = el('status');
const bannerEl = el('banner');
let bannerTimer: ReturnType<typeof setTimeout> | undefined;
function showBanner(b: Banner) {
  const [h, p] = [bannerEl.querySelector('h2'), bannerEl.querySelector('p')];
  if (h) h.textContent = bannerTitle(settings.lang, b.title);
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
/** UI text in the chosen language (P36). */
const T = (en: string, vars?: Readonly<Record<string, string | number>>): string => t(settings.lang, en, vars);
const langButtons = (): string => LANGS.map((l) => `<button data-lang="${l}" class="${l === settings.lang ? 'on' : ''}">${LANG_NAMES[l]}</button>`).join('');
/** The tutorial (P36): shown on the first normal run until finished or skipped. */
let tutorialDone = storage.get(TUTORIAL_KEY) === 'done';
let tutorialStep: number | null = null;
const tutorialEl = document.createElement('div');
tutorialEl.id = 'tutorial';
document.body.appendChild(tutorialEl);

let top: ScoreEntry[] = parseTop(storage.get(TOP_KEY));
/** The best score: the stored best, or the top-10's first run if that is higher. */
let best = Math.max(parseBest(storage.get(BEST_KEY)), top[0]?.score ?? 0);
/** The daily challenge (P33): this run is today's seeded run. */
let dailyMode = false;
const today = () => utcDate(new Date());
const todaysBest = () => dailyBest(storage.get(DAILY_KEY), today());
let wallet = parseWallet(storage.get(WALLET_KEY));
let paints = parsePaint(storage.get(PAINT_KEY));
const savePaints = () => {
  storage.set(PAINT_KEY, JSON.stringify(paints));
};
/** Credits at the start of this run, for the game-over summary. */
let runStartCredits = wallet.credits;
const saveWallet = () => {
  if (watching) return;
  wallet = withRun(wallet, curr);
  storage.set(WALLET_KEY, JSON.stringify(wallet));
};
/** Replays (P37): the run being recorded, the last finished one, and the one being watched. */
let recorder: Recorder | null = null;
let lastReplay = parseReplay(storage.get(REPLAY_KEY));
let watching: { replay: Replay; inputs: Input[]; at: number } | null = null;
const REPLAY_FILE = 'asteroid-shooter-3d-replay.json';
/** Keeps the finished run as the last replay (stored when it fits). */
function keepReplay() {
  if (!recorder || watching || recorder.length === 0) return;
  lastReplay = recorder.replay(curr.score, localDate(new Date()));
  recorder = null;
  const json = JSON.stringify(lastReplay);
  if (json.length <= REPLAY_STORE_LIMIT) storage.set(REPLAY_KEY, json);
}
function exportReplay() {
  if (!lastReplay) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(lastReplay)], { type: 'application/json' }));
  a.download = REPLAY_FILE;
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);
}
function importReplay() {
  const f = document.createElement('input');
  f.type = 'file';
  f.accept = 'application/json,.json';
  f.addEventListener('change', () => {
    void f.files?.[0]?.text().then((text) => {
      const r = parseReplay(text);
      if (r) {
        lastReplay = r;
        watchReplay(r);
      } else showBanner({ title: T('Not a replay file'), subtitle: '', durationMs: 2500 });
    });
  });
  f.click();
}
const replayButtons = (): string =>
  lastReplay ? `<div class="row"><button id="watch">${T('🎬 Watch replay ({score})', { score: lastReplay.score })}</button><button id="export">${T('⬇ Export replay')}</button><button id="import">${T('⬆ Import')}</button></div>` : `<div class="row"><button id="import">${T('⬆ Import replay')}</button></div>`;
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
const quality = new QualityGovernor(initialQuality(location.search, touchMode, settings.quality));
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
/** Applies the language: the page's lang and direction, and the HUD's labels. */
function applyLang() {
  document.documentElement.lang = settings.lang;
  document.documentElement.dir = isRtl(settings.lang) ? 'rtl' : 'ltr';
  hud.setLang(settings.lang);
}
applyLang();
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

const cardInput = () => inputKind(gamepad.connected, touchMode);

function renderHelp(): void {
  if (photo) {
    help.style.display = 'none';
    return;
  }
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
const paintShip = (craft = settings.craft) => {
  applyPaint(world.ship, PAINTS[chosenPaint(paints, craft)].tint);
};
const showCraft = (id: typeof settings.craft) => {
  void world.setCraft(id).then(() => {
    paintShip(id);
  });
};
showCraft(settings.craft);
const asteroids = new AsteroidView(world.scene, world.asteroidGeometry);
const atlas = await buildAtlas((p) => assetUrl(base, p));
const batch = new BillboardBatch(atlas, MAX_PARTICLES + 64);
const shockwaves = new ShockwaveLayer(world.scene, atlas);
const earthShield = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.12, 48, 24), new THREE.MeshBasicMaterial({ color: 0x66c8ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
earthShield.position.set(...EARTH_POS);
earthShield.visible = false;
world.scene.add(earthShield);
const hitFlash = el('hitflash');
const killFlashEl = el('killflash');
// P30: the nebula sky just inside the stars, and bloom (off on low quality).
const nebula = buildNebula(SKY_RADIUS * 0.97);
world.scene.add(nebula);
const postFx = new PostFx(renderer, world.scene, camera);
postFx.enabled = quality.current.bloom;
window.addEventListener('resize', () => {
  postFx.resize();
});
/** Hit-stop (P30): the sim holds until this time after a big hit. */
let hitStopUntil = 0;
let flashPeak = 0;
let flashAtMs = -Infinity;
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
/** Photo mode (P38): a free camera while the run stays paused. */
let photo: PhotoCam | null = null;
let photoFilter: PhotoFilter = 'none';
const photoHeld = new Set<string>();
const photoLook = { x: 0, y: 0, zoom: 0 };
let photoDragging = false;
let pendingShot = false;

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
  return `<div class="diff">${DIFFICULTIES.map((d) => `<button data-diff="${d}" class="${d === settings.difficulty ? 'on' : ''}">${T(DIFFICULTY_LABELS[d].name)}</button>`).join('')}</div><p class="dim">${T(DIFFICULTY_LABELS[settings.difficulty].blurb)}</p>`;
}

/** The settings panel (P13): every row changes and persists at once. Folded on the title card, open on the pause card. */
function settingsPanel(open: boolean): string {
  const rows = settingRows(settings, DIFFICULTY_NAMES, phase === 'paused', quality.current.name, urlQuality(location.search) !== null)
    .map((r) => {
      const ctl =
        r.kind === 'range'
          ? `<button data-set="${r.id}" data-dir="-1" aria-label="less">−</button><span class="val">${r.value}</span><button data-set="${r.id}" data-dir="1" aria-label="more">+</button>`
          : `<button data-set="${r.id}" class="val">${T(r.value)}</button>`;
      return `<tr><td>${T(r.label)}${r.note ? ` <span class="dim">(${T(r.note)})</span>` : ''}</td><td class="ctl">${ctl}</td></tr>`;
    })
    .join('');
  return `<details class="settings"${open ? ' open' : ''}><summary>${T('Settings')}</summary><table>${rows}</table></details>`;
}

const DIFFICULTY_NAMES = Object.fromEntries(DIFFICULTIES.map((d) => [d, DIFFICULTY_LABELS[d].name])) as Record<(typeof DIFFICULTIES)[number], string>;

/** Every achievement, unlocked ones first marked with their date (P16). */
function achievementsPanel(): string {
  const rows = ACHIEVEMENT_IDS.map((id) => {
    const d = unlocks[id];
    return `<tr class="${d ? 'got' : 'locked'}"><td>${d ? '🏆' : '·'}</td><td><b>${ACHIEVEMENTS[id].name}</b><br><span class="dim">${ACHIEVEMENTS[id].how}</span></td><td class="dim">${d ?? ''}</td></tr>`;
  }).join('');
  return `<details class="settings ach"><summary>${T('Achievements {n}/{total}', { n: unlockedCount(unlocks), total: ACHIEVEMENT_IDS.length })}</summary><table>${rows}</table></details>`;
}

const CRAFT_LABELS = {
  fighter: { name: 'Fighter', blurb: 'The original ship. Balanced.' },
  interceptor: { name: 'Interceptor', blurb: 'Turns faster; less fuel, hull and one rocket fewer.' },
  shuttle: { name: 'Shuttle', blurb: 'Turns slower; more fuel, a tougher hull and five rockets.' },
  gship: { name: 'G-Ship', blurb: 'All-rounder: turns a bit faster, more fuel and an extra rocket; thinner hull.' },
} as const;

/** The craft picker (P17): name, a blurb and the stats against the Fighter. */
function craftPicker(): string {
  const c = CRAFTS[settings.craft];
  const f = CRAFTS.fighter;
  const pct = (v: number, base: number) => `${String(Math.round((v / base) * 100))}%`;
  return `<div class="diff craft">${CRAFT_IDS.map((id) => `<button data-craft="${id}" class="${id === settings.craft ? 'on' : ''}">${CRAFT_LABELS[id].name}</button>`).join('')}</div>
    <p class="dim">${T(CRAFT_LABELS[settings.craft].blurb)}<br>${T('turn {turn} · fuel {fuel} · hull {hull} · rockets {rockets}', { turn: pct(c.turnRate, f.turnRate), fuel: c.fuelMax, hull: c.hullMax, rockets: c.rocketMax })}</p>`;
}

function paintPicker(): string {
  const current = chosenPaint(paints, settings.craft);
  const swatches = PAINT_IDS.map((id) => {
    const p = PAINTS[id];
    const open = paintUnlocked(id, unlocks, paints.bought);
    const how = p.achievement ? ACHIEVEMENTS[p.achievement].name : '';
    const label = open ? T(p.name) : p.cost !== undefined ? T('{name} · ◆ {cost}', { name: T(p.name), cost: p.cost }) : T('{name} · {how}', { name: T(p.name), how });
    const hex = `#${p.tint.toString(16).padStart(6, '0')}`;
    return `<button type="button" data-paint="${id}" class="swatch${id === current ? ' on' : ''}${open ? '' : ' locked'}" style="--swatch:${hex}" title="${label}" aria-label="${label}">${open ? '' : p.cost !== undefined ? '◆' : '🔒'}</button>`;
  }).join('');
  return `<div class="paints">${swatches}</div><p class="dim">${T('Paint: {name} · saved for this ship', { name: T(PAINTS[current].name) })}</p>`;
}

/** A function, so TypeScript doesn't narrow `phase` across calls that change it. */
const isPlaying = (): boolean => phase === 'playing';
/** Whether the title card's settings panel is unfolded (kept across re-renders). */
let settingsOpen = false;

function renderOverlay() {
  if (photo) {
    overlay.innerHTML = '';
    overlay.dataset['phase'] = 'photo';
    return;
  }
  overlay.dataset['phase'] = phase;
  if (phase === 'playing') {
    overlay.innerHTML = '';
    return;
  }
  if (phase === 'title') {
    overlay.innerHTML = `<div class="card"><h1>☄️ Asteroid Shooter 3D</h1>
      <p>${T("Asteroids are falling toward Earth. Shoot them down. Photons chip, rockets home in. Reload at the mothership's hangar.")}</p>
      <p class="dim">${T('Best score: {best} · ◆ {credits} credits', { best, credits: wallet.credits })}</p><div class="row lang">${langButtons()}</div>${difficultyPicker()}${craftPicker()}${paintPicker()}
      <button id="go">${T(actionPrompt(cardInput(), 'start'))}</button><br><button id="daily" class="daily">${T('📅 Daily challenge · {date}', { date: today() })}${todaysBest() > 0 ? T(' · best {best}', { best: todaysBest() }) : ''}</button><p class="dim">${T('Same asteroids for everyone today · Normal · Fighter · no upgrades')}</p><p class="dim">${T(touchMode ? 'Ⅱ pauses · landscape works best' : 'Enter also starts · Esc or P pauses · H shows the controls · M mutes')}</p>${replayButtons()}${tutorialDone ? `<button id="tutorial" class="daily">${T('🎓 Replay the tutorial')}</button>` : ''}${settingsPanel(false)}${achievementsPanel()}${PORTAL_LINK}</div>`;
  } else if (phase === 'paused') {
    overlay.innerHTML = `<div class="card"><h1>${T('Paused')}</h1><button id="go">${T(actionPrompt(cardInput(), 'resume'))}</button><br><button id="photo-open" class="daily">${T('📷 Photo mode (F)')}</button><p class="dim">${T('Score {score} · Enter or P also resumes', { score: curr.score })}</p>${shopOpen(curr) && curr.earnsCredits ? shopPanel(curr, settings.lang) : ''}${settingsPanel(true)}${PORTAL_LINK}</div>`;
  } else if (phase === 'won') {
    overlay.innerHTML = `<div class="card"><h1>${T('🌍 Earth is safe!')}</h1><p>${T('You cleared all {waves} waves on {difficulty}.', { waves: CAMPAIGN_WAVES, difficulty: T(DIFFICULTY_LABELS[curr.difficulty].name) })}</p>
      <div class="final">${String(curr.score)}</div>
      <div class="row"><button id="go">${withStart(T('Keep going: endless mode'), cardInput())}</button><button id="finish">${T('Finish the run')}</button></div></div>`;
  } else {
    overlay.innerHTML = `<div class="card wide"><h1>${T(wonRun ? 'You saved Earth!' : curr.ended ? END_TEXT[curr.ended] : 'Game over')}</h1>
      ${watching ? `<p class="dim">${T('🎬 Replay finished')}</p>` : dailyMode ? `<p class="dim">${T('📅 Daily challenge · {date}', { date: today() })}</p>` : ''}<div class="final">${String(curr.score)}</div>${newBest ? `<div class="newbest">${T(dailyMode ? 'NEW DAILY BEST!' : 'NEW BEST!')}</div>` : `<p class="dim">${dailyMode ? T("Today's best {best}", { best: todaysBest() }) : T('Best {best}', { best })}</p>`}
      ${runUnlocks.length ? `<p class="unlocked">${T('🏆 Unlocked: {list}', { list: runUnlocks.map((id) => ACHIEVEMENTS[id].name).join(' · ') })}</p>` : ''}
      <div class="summary">${summaryTable()}${topTable()}</div>
      <button id="go">${withStart(T('Play again'), cardInput())}</button>${replayButtons()}${PORTAL_LINK}</div>`;
  }
  document.getElementById('go')?.addEventListener('click', (e) => {
    e.stopPropagation();
    advance();
  });
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const l = LANGS.find((x) => x === b.dataset['lang']);
      if (l) settings.lang = l;
      saveSettings();
      applyLang();
      renderOverlay();
      renderHelp();
    });
  }
  const on = (id: string, f: () => void) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.stopPropagation();
      f();
    });
  };
  on('photo-open', enterPhotoMode);
  on('watch', () => {
    if (lastReplay) watchReplay(lastReplay);
  });
  on('export', exportReplay);
  on('import', importReplay);
  document.getElementById('tutorial')?.addEventListener('click', (e) => {
    e.stopPropagation();
    tutorialDone = false;
    storage.set(TUTORIAL_KEY, '');
    advance();
  });
  document.getElementById('daily')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dailyMode = true;
    newRun();
    dispatch('start');
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
      const id = b.dataset['set'] as SettingId;
      changeSetting(settings, id, b.dataset['dir'] === '-1' ? -1 : 1);
      if (id === 'lang') applyLang();
      if (id === 'quality') applyQuality(quality.reset(initialQuality(location.search, touchMode, settings.quality)));
      audio.muted = settings.muted;
      audio.volume = settings.volume;
      saveSettings();
      renderOverlay();
      renderHelp();
    });
  }
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-buy]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = UPGRADE_IDS.find((x) => x === b.dataset['buy']);
      if (id) buy(id);
    });
  }
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-craft]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = CRAFT_IDS.find((x) => x === b.dataset['craft']);
      if (c) settings.craft = c;
      saveSettings();
      showCraft(settings.craft);
      renderOverlay();
    });
  }
  for (const b of overlay.querySelectorAll<HTMLButtonElement>('[data-paint]')) {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = PAINT_IDS.find((x) => x === b.dataset['paint']);
      if (!id) return;
      if (!paintUnlocked(id, unlocks, paints.bought)) {
        const r = buyPaint(paints, id, wallet.credits);
        if (!r) {
          const cost = PAINTS[id].cost;
          showBanner({ title: T(cost !== undefined ? 'Need {cost} credits' : "Couldn't buy that paint", cost !== undefined ? { cost } : {}), subtitle: T(PAINTS[id].name), durationMs: 1800 });
          return;
        }
        paints = r.store;
        wallet = { ...wallet, credits: r.credits };
        savePaints();
        storage.set(WALLET_KEY, JSON.stringify(wallet));
      }
      paints = selectPaint(paints, settings.craft, id, unlocks);
      savePaints();
      paintShip();
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
  return `<table class="stats"><tr><th colspan="2">${T('This run')}</th></tr>${[
    row(T('Kills ({kills}, {big} big)', { kills: stats.kills, big: stats.bigKills }), pts(stats.killPoints)),
    row(T('Combo bonus (best chain {n})', { n: stats.bestCombo }), pts(stats.comboPoints)),
    row(T('Objectives ({n})', { n: stats.objectivesMet }), pts(stats.objectivePoints)),
    row(T('Wave clears ({n})', { n: stats.wavesCleared }), pts(stats.clearPoints)),
    row(T('Earth bonus'), pts(stats.earthPoints)),
    `<tr class="total"><td>${T('Total')}</td><td>${String(curr.score)}</td></tr>`,
    ...(curr.earnsCredits ? [row(T('Credits earned'), T('◆ {earned} (wallet {wallet})', { earned: Math.max(0, curr.credits - runStartCredits), wallet: curr.credits }))] : []),
    row(T('Difficulty'), T(DIFFICULTY_LABELS[curr.difficulty].name)),
    row(T('Time'), formatTime(curr.tick)),
    row(T('Photon accuracy'), `${String(accuracy(stats))}%`),
    row(T('Rockets fired'), String(stats.rocketsFired)),
    row(T('Earth hits taken'), String(stats.earthHits)),
  ].join('')}</table>`;
}

/** The local top-10, this run highlighted. */
function topTable(): string {
  if (top.length === 0) return '';
  const rows = top.map((e, i) => `<tr class="${i + 1 === rank ? 'me' : ''}"><td>${String(i + 1)}.</td><td>${String(e.score)}</td><td>${DIFFICULTY_LABELS[e.difficulty].name}</td><td>${e.won ? '🌍' : `W${String(e.waves)}`}</td><td class="dim">${e.date}</td></tr>`).join('');
  return `<table class="stats top"><tr><th colspan="5">Top 10${rank ? ` · you placed #${String(rank)}` : ''}</th></tr>${rows}</table>`;
}

function closePhoto(render = true) {
  if (!photo) return;
  photo = null;
  photoHeld.clear();
  photoLook.x = photoLook.y = photoLook.zoom = 0;
  photoDragging = false;
  pendingShot = false;
  host.classList.remove('photo');
  renderer.domElement.style.filter = '';
  renderer.domElement.classList.remove('drag');
  photoBar.classList.remove('on');
  photoBar.style.visibility = '';
  photoBar.innerHTML = '';
  if (render) {
    renderOverlay();
    renderHelp();
  }
}

function enterPhotoMode() {
  if (phase !== 'paused' || photo) return;
  const pose = interpolate(prev.ship, curr.ship, 1);
  const cam = cameraPose(pose, settings.camera);
  photo = enterPhoto(cam.eye, curr.ship.pos);
  photoFilter = 'none';
  host.classList.add('photo');
  renderOverlay();
  renderHelp();
  renderPhoto();
}

function snapPhotoFocus() {
  if (!photo) return;
  photo = focusOn(photo, cycleFocus(photo.focus), curr.ship.pos, EARTH_POS);
  renderPhoto();
}

function savePhoto() {
  if (!photo || pendingShot) return;
  photoBar.style.visibility = 'hidden';
  pendingShot = true;
}

function renderPhoto() {
  if (!photo) {
    photoBar.classList.remove('on');
    photoBar.innerHTML = '';
    renderer.domElement.style.filter = '';
    return;
  }
  const css = filterCss(photoFilter);
  renderer.domElement.style.filter = css === 'none' ? '' : css;
  const padHint = gamepad.connected ? T('Left stick orbits · bumpers zoom · right stick flies · A saves · Start exits · Y filter · X focus') : '';
  const hint = T(touchMode ? 'Drag to orbit · buttons save and exit · F focuses · filters on the bar' : 'Drag to orbit · wheel zooms · WASD flies · F focuses · [ ] filters · Enter saves · Esc exits');
  photoBar.innerHTML = `<div class="bar"><p class="hint">${hint}${padHint ? ` · ${padHint}` : ''}</p>
    <button type="button" id="photo-save">${T('Save photo (Enter)')}</button>
    <button type="button" id="photo-filter">${T('Filter: {name}', { name: T(FILTER_LABELS[photoFilter]) })}</button>
    <button type="button" id="photo-focus">${T('Focus: {name}', { name: T(FOCUS_LABELS[photo.focus]) })}</button>
    <button type="button" id="photo-exit">${T('Exit (Esc)')}</button></div>`;
  photoBar.classList.add('on');
  document.getElementById('photo-save')?.addEventListener('click', (e) => {
    e.stopPropagation();
    savePhoto();
  });
  document.getElementById('photo-filter')?.addEventListener('click', (e) => {
    e.stopPropagation();
    photoFilter = cycleFilter(photoFilter);
    renderPhoto();
  });
  document.getElementById('photo-focus')?.addEventListener('click', (e) => {
    e.stopPropagation();
    snapPhotoFocus();
  });
  document.getElementById('photo-exit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closePhoto();
  });
}

function dispatch(action: FlowAction) {
  const before = phase;
  phase = nextPhase(phase, action);
  if (phase === before) return;
  if (photo && phase !== 'paused') closePhoto(false);
  if (phase === 'playing') {
    controls.reset();
    lastMs = performance.now();
    accMs = 0;
    touchUi?.reset();
    if (settings.layout === 'modern' && !touchMode) Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => undefined);
  }
  if (phase !== 'playing' && document.pointerLockElement) document.exitPointerLock();
  if (phase === 'paused') saveWallet();
  if (phase !== 'playing') bannerEl.classList.remove('on');
  renderOverlay();
  renderHelp();
}

function newRun() {
  const seed = dailyMode ? dailySeed(today()) : Date.now() >>> 0;
  const [difficulty, craft, options] = dailyMode ? [DAILY_DIFFICULTY, DAILY_CRAFT, DAILY_OPTIONS] : [settings.difficulty, settings.craft, runOptions(wallet, settings.craft)];
  watching = null;
  recorder = new Recorder(seed, difficulty, craft, options);
  prev = curr = initialState(seed, difficulty, craft, options);
  resetRunView();
}

/** Starts watching a replay from its first tick. */
function watchReplay(r: Replay) {
  const inputs = replayInputs(r);
  if (!inputs) return;
  watching = { replay: r, inputs, at: 0 };
  recorder = null;
  prev = curr = replayStart(r);
  resetRunView();
  if (phase === 'title') dispatch('start');
  else dispatch('restart');
}

function resetRunView() {
  runStartCredits = wallet.credits;
  tutorialStep = !tutorialDone && !dailyMode && !watching ? 0 : null;
  showCraft(curr.craft);
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
    dailyMode = false;
    newRun();
    dispatch('start');
  } else if (phase === 'paused') dispatch('resume');
  else if (phase === 'won') dispatch('continue');
  else if (phase === 'over') {
    newRun();
    dispatch('restart');
  }
}

/** Ends the tutorial (finished or skipped) and remembers it. */
function endTutorial() {
  tutorialStep = null;
  tutorialDone = true;
  storage.set(TUTORIAL_KEY, 'done');
}

/** The tutorial box: this step's hint and a skip button; hidden outside play. */
function renderTutorial() {
  if (tutorialStep !== null && tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
    showBanner({ title: T('Tutorial done. Good luck, pilot!'), subtitle: '', durationMs: 2500 });
  }
  const step = tutorialStep === null ? undefined : TUTORIAL_STEPS[tutorialStep];
  const show = phase === 'playing' && (step !== undefined || watching !== null);
  tutorialEl.style.display = show ? '' : 'none';
  if (show && watching) {
    const html = `<b>${T('🎬 REPLAY')}</b> ${formatTime(watching.at)} / ${formatTime(watching.inputs.length)} · ${T('P or Esc pauses')}`;
    if (tutorialEl.dataset['html'] !== html) {
      tutorialEl.innerHTML = html;
      tutorialEl.dataset['html'] = html;
    }
    return;
  }
  if (!show || tutorialStep === null || step === undefined) return;
  const html = `<b>${T('Tutorial {n}/{total}', { n: tutorialStep + 1, total: TUTORIAL_STEPS.length })}</b> ${T(tutorialHint(step, touchMode))} <button id="skiptut">${T('Skip (K)')}</button>`;
  if (tutorialEl.dataset['html'] !== html) {
    tutorialEl.innerHTML = html;
    tutorialEl.dataset['html'] = html;
    tutorialEl.querySelector('#skiptut')?.addEventListener('click', (e) => {
      e.stopPropagation();
      endTutorial();
    });
  }
}

/** Buys an upgrade at the station shop (P29): only while paused in a wave's lead-in. */
function buy(id: UpgradeId) {
  if (phase !== 'paused' || watching) return;
  const next = buyUpgrade(curr, id);
  if (next === curr) return;
  prev = curr = next;
  recorder?.buy(id);
  saveWallet();
  audio.play([{ sound: 'chime', volume: 0.5 }]);
  renderOverlay();
}

window.addEventListener('keydown', (e) => {
  if (photo) {
    if (e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) savePhoto();
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      if (!e.repeat) closePhoto();
      return;
    }
    if (e.code === 'KeyF') {
      e.preventDefault();
      if (!e.repeat) snapPhotoFocus();
      return;
    }
    if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
      e.preventDefault();
      if (!e.repeat) {
        photoFilter = cycleFilter(photoFilter, e.code === 'BracketRight' ? 1 : -1);
        renderPhoto();
      }
      return;
    }
    photoHeld.add(e.code);
    return;
  }
  if (e.code === 'KeyF' && phase === 'paused') {
    enterPhotoMode();
    return;
  }
  if (e.code === 'Enter' && phase !== 'playing') advance();
  if (e.code === 'KeyB' && curr.earnsCredits && shopOpen(curr)) dispatch(phase === 'paused' ? 'resume' : 'pause');
  const up = phase === 'paused' ? upgradeForKey(e.code) : null;
  if (up) buy(up);
  if (e.code === 'KeyK' && phase === 'playing' && tutorialStep !== null) endTutorial();
  if (e.code === 'KeyP') dispatch(phase === 'paused' ? 'resume' : 'pause');
  // Esc pauses in the classic layout too, where there is no pointer lock to leave.
  if (e.code === 'Escape' && phase === 'playing') dispatch('pause');
});
window.addEventListener('keyup', (e) => {
  photoHeld.delete(e.code);
});
{
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    if (!photo) return;
    photoDragging = true;
    canvas.classList.add('drag');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!photo || !photoDragging) return;
    photoLook.x += e.movementX;
    photoLook.y -= e.movementY;
  });
  const endDrag = (e: PointerEvent) => {
    if (!photoDragging) return;
    photoDragging = false;
    canvas.classList.remove('drag');
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!photo) return;
      e.preventDefault();
      photoLook.zoom += e.deltaY > 0 ? -1 : 1;
    },
    { passive: false },
  );
}
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
    asteroidWallet: () => wallet,
    asteroidReplay: () => ({ last: lastReplay ? { score: lastReplay.score, ticks: replayInputs(lastReplay)?.length } : null, watching: watching ? { at: watching.at, of: watching.inputs.length } : null }),
    asteroidWatch: () => {
      if (lastReplay) watchReplay(lastReplay);
    },
    asteroidTutorial: () => ({ step: tutorialStep, done: tutorialDone }),
    asteroidDaily: () => ({ mode: dailyMode, today: today(), seed: dailySeed(today()), best: todaysBest() }),
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
/** Hyperdrive thrusters (P28): nozzle glow always, a hot plume while the turbo burns. */
let thrust = 0;
function drawThrusters(pose: { pos: GameState['ship']['pos']; rot: GameState['ship']['rot'] }, frameMs: number) {
  thrust = rampThrust(thrust, curr.ship.turbo && phase === 'playing', frameMs / TICK_MS);
  if (!world.ship.visible || settings.camera === 'classic') return;
  const L = world.shipLength;
  const look = nozzleLook(thrust, curr.ship.throttle, THROTTLE_MAX);
  const { points, back } = nozzleWorld(curr.craft, pose.pos, pose.rot, L);
  for (const p of points) {
    batch.push(p[0], p[1], p[2], look.glow * L, 0, 0.55, 0.8, 1, look.glowAlpha, true, 'roundParticle');
    if (look.flame > 0) {
      const f = look.flame * L * (0.92 + 0.08 * Math.sin(performance.now() / 23));
      batch.pushLine(p[0], p[1], p[2], p[0] + back[0] * f, p[1] + back[1] * f, p[2] + back[2] * f, 0.35, 1, 0.62, 0.25, look.flameAlpha, true, 'roundParticle');
      batch.push(p[0], p[1], p[2], look.glow * L * 0.8, 0, 1, 0.9, 0.7, look.flameAlpha * 0.6, true, 'roundParticle');
    }
  }
}

/** Perk pickups (P26): a coloured glow with a white core, interpolated between ticks. */
function drawPickups(alpha: number) {
  for (const p of curr.pickups) {
    const from = prev.pickups.find((q) => q.id === p.id)?.pos ?? p.pos;
    const look = pickupLook(p, p.age - 1 + alpha);
    if (look.alpha <= 0) continue;
    const x = from[0] + (p.pos[0] - from[0]) * alpha;
    const y = from[1] + (p.pos[1] - from[1]) * alpha;
    const z = from[2] + (p.pos[2] - from[2]) * alpha;
    batch.push(x, y, z, look.size, 0, look.rgb[0], look.rgb[1], look.rgb[2], look.alpha, true, 'roundParticle');
    batch.push(x, y, z, look.size * 0.4, 0, 1, 1, 1, look.alpha, true, 'roundParticle');
  }
  // The shield perk: a pulsing bubble round Earth that flickers in its last 2 s.
  const left = curr.perks.shield;
  earthShield.visible = left > 0 && (left > 50 || Math.floor(curr.tick / 3) % 2 === 0);
  earthShield.material.opacity = 0.16 + 0.06 * Math.sin(performance.now() / 180);
}

/** Applies a quality step (P20): a lower pixel ratio and particle cap, at once. */
function applyQuality(q: QualityLevel) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  fx.particleCap = q.particleCap;
  postFx.enabled = q.bloom;
  postFx.resize();
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
    if (photo) renderPhoto();
    else if (phase !== 'playing') renderOverlay();
  }
  applyToggles();
  if (phase === 'playing') {
    const { ticks, remainderMs } = ticksFor(accMs + (nowMs < hitStopUntil ? 0 : frameMs));
    for (let i = 0; i < ticks && isPlaying(); i++) {
      prev = curr;
      const base = touchUi ? mergeTouch(controls.nextInput(), touchUi.next(), curr.ship.throttle, settings) : controls.nextInput();
      const live = mergePad(base, gamepad.nextHeld(), settings.sensitivity);
      const input = watching ? (watching.inputs[watching.at] ?? NO_INPUT) : live;
      if (watching) {
        curr = applyBuys(curr, watching.replay, watching.at);
        prev = curr;
        if (++watching.at > watching.inputs.length) {
          recordBest();
          dispatch('end');
          break;
        }
      } else recorder?.input(input);
      const r = step(curr, input);
      if (tutorialStep !== null) tutorialStep = advanceTutorial(tutorialStep, curr, r.state, r.events);
      curr = r.state;
      onEvents(r.events, nowMs);
      fx.ambient(curr);
      const smokeRate = damageSmoke(curr.ship.hull, upgradedCraft(curr).hullMax);
      if (smokeRate > 0 && world.ship.visible) {
        const n = nozzleWorld(curr.craft, curr.ship.pos, curr.ship.rot, world.shipLength);
        fx.damageSmoke(n.points[0] ?? curr.ship.pos, n.back, world.shipLength * 0.35, smokeRate);
      }
      if (curr.ship.turbo && thrust > 0.35 && quality.current.name !== 'low') {
        const n = nozzleWorld(curr.craft, curr.ship.pos, curr.ship.rot, world.shipLength);
        fx.thrusterTrail(n.points, n.back, world.shipLength * 0.12);
      }
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
  let camEye = pose.pos;
  if (photo) {
    const held = gamepad.nextHeld();
    const moveX = (photoHeld.has('KeyD') ? 1 : 0) - (photoHeld.has('KeyA') ? 1 : 0) + held.strafeX;
    const moveY = (photoHeld.has('KeyE') ? 1 : 0) - (photoHeld.has('KeyQ') ? 1 : 0) + held.strafeY;
    const moveZ = (photoHeld.has('KeyW') ? 1 : 0) - (photoHeld.has('KeyS') ? 1 : 0);
    photo = applyPhotoInput(photo, {
      lookX: photoLook.x + held.yaw * 400 * (frameMs / 16.67),
      lookY: photoLook.y + held.pitch * 400 * (frameMs / 16.67),
      zoom: photoLook.zoom + held.roll * 0.15,
      moveX: Math.max(-1, Math.min(1, moveX)),
      moveY: Math.max(-1, Math.min(1, moveY)),
      moveZ: Math.max(-1, Math.min(1, moveZ)),
      boost: photoHeld.has('ShiftLeft') || photoHeld.has('ShiftRight') || held.turbo,
      dt: frameMs / 1000,
      invertY: settings.invertY,
      sensitivity: settings.sensitivity,
    });
    photoLook.x = photoLook.y = photoLook.zoom = 0;
    const cam = photoPose(photo);
    camEye = cam.eye;
    camera.position.set(...cam.eye);
    camera.up.set(...cam.up);
    camera.lookAt(v.set(...cam.look));
    hitFlash.style.opacity = '0';
    killFlashEl.style.opacity = '0';
    camera.fov = FOV_BASE;
  } else {
    const cam = cameraPose(pose, settings.camera);
    camEye = cam.eye;
    camera.position.set(...cam.eye);
    camera.up.set(...cam.up);
    camera.lookAt(v.set(...cam.look));
    const j = joltAt(jolt, nowMs, settings.shake);
    camera.rotateY(j.yaw);
    camera.rotateX(j.pitch);
    hitFlash.style.opacity = j.flash.toFixed(3);
    killFlashEl.style.opacity = (settings.shake ? flashAt(flashPeak, nowMs - flashAtMs) : 0).toFixed(3);
    fov = nextFov(fov, curr.ship, frameMs / 1000);
    camera.fov = fov;
  }
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  nebula.position.copy(camera.position);
  world.earth.rotation.y = nowMs / 1000 / 120;
  if (stationRing) stationRing.material.opacity = 0.35 + 0.3 * Math.sin(nowMs / 400);
  asteroids.update(prev.asteroids, curr.asteroids, alpha, curr.tick);

  camera.updateMatrixWorld();
  if (phase === 'title' || photo) threat.clear();
  else {
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const rocketTargets = new Set<number>();
    for (const p of curr.projectiles) if (p.kind === 'rocket' && p.target !== null) rocketTargets.add(p.target);
    const aimTarget = curr.ship.rockets > 0 ? crosshairTarget(curr.ship.pos, rotate(curr.ship.rot, LOCAL_FORWARD), curr.asteroids, PRESETS[curr.difficulty].rocketLockCone) : null;
    threat.draw({ viewProj: viewProj.elements, fovDeg: camera.fov, cameraPos: camEye, shipPos: pose.pos, shipRot: pose.rot, asteroids: curr.asteroids, aimTarget, rocketTargets, missileLocks: curr.missileLock?.ids ?? [], pickups: curr.pickups.map((p) => ({ pos: p.pos, rgb: PERK_LOOK[p.kind].rgb })) });
  }
  hud.show(phase !== 'title' && !photo);
  touchUi?.show(phase === 'playing');
  touchUi?.syncThrottle(curr.ship.throttle);
  hud.render(hudModel(curr, dailyMode ? todaysBest() : best));
  renderTutorial();
  hud.badge(phase === 'playing' && !photo ? comboBadge(curr) : { text: '', scale: 1 });
  v.set(...aimPoint(pose, AIM_DISTANCE)).project(camera);
  hud.aim(!photo && v.z < 1 ? { x: v.x, y: v.y } : null);
  status.style.display = photo ? 'none' : '';
  status.textContent = photo ? '' : `camera ${settings.camera} [C] · layout ${settings.layout} [${settings.layout === 'classic' ? 'T' : 'L'}] · help [H] · sound ${settings.muted ? 'off' : 'on'} [M]`;
  batch.begin();
  fx.draw(batch, fxAccMs / TICK_MS, prev.projectiles, curr.projectiles, alpha);
  drawPickups(alpha);
  drawThrusters(pose, frameMs);
  batch.end(camera);
  shockwaves.sync(fx.shockwaves);
  postFx.render(world.scene, camera);
  if (pendingShot) {
    pendingShot = false;
    const finish = (ok: boolean, name = '') => {
      photoBar.style.visibility = '';
      showBanner({ title: T(ok ? '📷 Photo saved' : "Couldn't save the photo"), subtitle: name, durationMs: 1800 });
    };
    try {
      const baked = snapshotCanvas(renderer.domElement, filterCss(photoFilter));
      baked.toBlob((blob) => {
        if (!blob) {
          finish(false);
          return;
        }
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = screenshotName(new Date());
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        finish(true, a.download);
      }, 'image/png');
    } catch {
      finish(false);
    }
  }
});

/** Gamepad presses (P19): Start starts, pauses and resumes; the rest go through the keyboard's edge actions. */
function onPadPress(p: PadPress) {
  if (photo) {
    if (p === 'start') closePhoto();
    else if (p === 'rocket') savePhoto();
    else if (p === 'throttleUp') {
      photoFilter = cycleFilter(photoFilter);
      renderPhoto();
    } else snapPhotoFocus();
    return;
  }
  if (p === 'start') {
    if (phase === 'playing') dispatch('pause');
    else advance();
  } else controls.press(PAD_ACTIONS[p]);
}

function recordBest() {
  keepReplay();
  if (watching) {
    newBest = false;
    rank = null;
    return;
  }
  if (dailyMode) {
    const d = recordDaily(storage.get(DAILY_KEY), today(), curr.score);
    newBest = d.isNew;
    rank = null;
    if (d.isNew) storage.set(DAILY_KEY, JSON.stringify(d.store));
    return;
  }
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
  const banner = bannerFor(events) ?? perkBanner(events);
  const shopHint = curr.earnsCredits && events.some((e) => e.type === 'waveCleared') && !curr.ended;
  if (banner) showBanner(shopHint ? { ...banner, subtitle: `${banner.subtitle} · B opens the station shop` } : banner);
  if (events.some((e) => e.type === 'waveCleared' || e.type === 'runEnded')) saveWallet();
  if (events.some((e) => e.type === 'campaignWon') && !watching) dispatch('win');
  audio.play(cuesFor(events));
  const e = camera.matrixWorld.elements;
  fx.apply(recipesFor(events, curr), [e[4], e[5], e[6]]);
  jolt = addJolt(jolt, hitStrength(events), nowMs);
  const stop = hitStopMs(events);
  if (stop > 0) hitStopUntil = Math.max(hitStopUntil, nowMs + stop);
  const peak = killFlash(events);
  if (peak > 0) {
    flashPeak = peak;
    flashAtMs = nowMs;
  }
  const mark = hitMarker(events);
  if (mark) hud.marker(mark);
  const a = trackAchievements(achRun, events, curr);
  achRun = a.run;
  if (a.unlocked.length && !watching) {
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
