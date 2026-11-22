/**
 * The game (P07): title → play → game over → restart, around the pure sim's fixed 25 Hz tick.
 * requestAnimationFrame drives `step`; rendering interpolates between the last two ticks.
 */
import * as THREE from 'three';
import { TICK_MS, initialState, step, ticksFor, type GameState, type SimEvent } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';
import { AsteroidView } from './asteroidView.js';
import { AudioBank, cuesFor } from './audio.js';
import { Controls } from './controls.js';
import { FxLayer, burstsFor } from './fx.js';
import { BEST_KEY, EMPTY_STATS, accuracy, addStats, formatTime, nextPhase, parseBest, updateBest, type FlowAction, type Phase, type RunStats } from './game.js';
import { Hud, hudModel } from './hud.js';
import { ACTION_LABELS, LAYOUTS, bindings, keyLabel } from './keymap.js';
import { ProjectileView } from './projectileView.js';
import { buildWorld } from './scene.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, cycle, parseSettings } from './settings.js';
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
const settings = (() => {
  try {
    return parseSettings(storage.get(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
})();
const saveSettings = () => {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
};
let best = parseBest(storage.get(BEST_KEY));

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
host.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(FOV_BASE, window.innerWidth / window.innerHeight, 1, 30000);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const controls = new Controls(renderer.domElement, settings);
const audio = new AudioBank(base);
audio.muted = settings.muted;
const hud = new Hud(el('hud'));

function renderHelp(): void {
  const rows = bindings(settings.layout)
    .map(([action, codes]) => `<tr><td>${[...new Set(codes.map(keyLabel))].join(' / ')}</td><td>${ACTION_LABELS[action]}</td></tr>`)
    .join('');
  const mouse =
    settings.layout === 'modern'
      ? `<tr><td>mouse</td><td>aim (pitch / yaw)${settings.invertY ? ', Y inverted' : ''}</td></tr><tr><td>wheel</td><td>throttle ±</td></tr>`
      : '';
  help.innerHTML = `<h2>Controls: ${settings.layout}${settings.muted ? ' · muted' : ''}</h2><table>${mouse}${rows}</table><p>Esc pauses</p>`;
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
  }
}

const world = await buildWorld(base);
const textures = new THREE.TextureLoader();
const asteroids = new AsteroidView(world.scene, world.asteroidGeometry);
const shots = new ProjectileView(world.scene, await textures.loadAsync(assetUrl(base, 'textures/particle_32x32.png')));
const fx = new FxLayer(world.scene, await textures.loadAsync(assetUrl(base, 'textures/flash_burst_1_128x128.png')));

let phase: Phase = 'title';
let prev: GameState = initialState(Date.now() >>> 0);
let curr: GameState = prev;
let stats: RunStats = EMPTY_STATS;
let newBest = false;
let accMs = 0;
let lastMs = performance.now();
let fov = FOV_BASE;

const END_TEXT = { earthDestroyed: 'Earth has fallen.', shipDestroyed: 'Your ship was destroyed.' } as const;

/** A function, so TypeScript doesn't narrow `phase` across calls that change it. */
const isPlaying = (): boolean => phase === 'playing';

function renderOverlay() {
  overlay.dataset['phase'] = phase;
  if (phase === 'playing') {
    overlay.innerHTML = '';
    return;
  }
  if (phase === 'title') {
    overlay.innerHTML = `<div class="card"><h1>☄️ Asteroid Shooter 3D</h1>
      <p>Asteroids are falling toward Earth. Shoot them down. Photons chip, rockets home in. Reload at the mothership's hangar.</p>
      <p class="dim">Best score: ${String(best)}</p>
      <button id="go">Click to start</button><p class="dim">Enter also starts · H shows the controls · M mutes</p></div>`;
  } else if (phase === 'paused') {
    overlay.innerHTML = `<div class="card"><h1>Paused</h1><button id="go">Click to resume</button><p class="dim">Score ${String(curr.score)}</p></div>`;
  } else {
    overlay.innerHTML = `<div class="card"><h1>${curr.ended ? END_TEXT[curr.ended] : 'Game over'}</h1>
      <div class="final">${String(curr.score)}</div>${newBest ? '<div class="newbest">NEW BEST!</div>' : `<p class="dim">Best ${String(best)}</p>`}
      <table class="stats"><tr><td>Time</td><td>${formatTime(curr.tick)}</td></tr><tr><td>Asteroids destroyed</td><td>${String(stats.kills)} (${String(stats.bigKills)} big)</td></tr>
      <tr><td>Photon accuracy</td><td>${String(accuracy(stats))}%</td></tr><tr><td>Rockets fired</td><td>${String(stats.rocketsFired)}</td></tr><tr><td>Earth hits taken</td><td>${String(stats.earthHits)}</td></tr></table>
      <button id="go">Play again</button><p><a href="/">← all games</a></p></div>`;
  }
  document.getElementById('go')?.addEventListener('click', (e) => {
    e.stopPropagation();
    advance();
  });
}

function dispatch(action: FlowAction) {
  const before = phase;
  phase = nextPhase(phase, action);
  if (phase === before) return;
  if (phase === 'playing') {
    controls.reset();
    lastMs = performance.now();
    accMs = 0;
    if (settings.layout === 'modern') Promise.resolve(renderer.domElement.requestPointerLock()).catch(() => undefined);
  }
  if (phase !== 'playing' && document.pointerLockElement) document.exitPointerLock();
  renderOverlay();
  renderHelp();
}

function newRun() {
  prev = curr = initialState(Date.now() >>> 0);
  stats = EMPTY_STATS;
  newBest = false;
  asteroids.clear();
  shots.clear();
  fx.clear();
}

/** The overlay's main button / Enter: start, resume or play again. */
function advance() {
  if (phase === 'title') {
    newRun();
    dispatch('start');
  } else if (phase === 'paused') dispatch('resume');
  else if (phase === 'over') {
    newRun();
    dispatch('restart');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && phase !== 'playing') advance();
  if (e.code === 'KeyP') dispatch(phase === 'paused' ? 'resume' : 'pause');
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
    asteroidStart: () => {
      advance();
    },
  });
}
renderOverlay();
renderHelp();

const v = new THREE.Vector3();
renderer.setAnimationLoop((nowMs: number) => {
  const frameMs = Math.min(Math.max(nowMs - lastMs, 0), 250);
  lastMs = nowMs;
  applyToggles();
  if (phase === 'playing') {
    const { ticks, remainderMs } = ticksFor(accMs + frameMs);
    for (let i = 0; i < ticks && isPlaying(); i++) {
      prev = curr;
      const r = step(curr, controls.nextInput());
      curr = r.state;
      onEvents(r.events, nowMs);
    }
    accMs = remainderMs;
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
  fov = nextFov(fov, curr.ship, frameMs / 1000);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  world.earth.rotation.y = nowMs / 1000 / 120;
  asteroids.update(prev.asteroids, curr.asteroids, alpha, curr.tick);
  shots.update(prev.projectiles, curr.projectiles, alpha);
  fx.update(nowMs);

  hud.show(phase !== 'title');
  hud.render(hudModel(curr, best));
  v.set(...aimPoint(pose, AIM_DISTANCE)).project(camera);
  hud.aim(v.z < 1 ? { x: v.x, y: v.y } : null);
  status.textContent = `camera ${settings.camera} [C] · layout ${settings.layout} [${settings.layout === 'classic' ? 'T' : 'L'}] · help [H] · sound ${settings.muted ? 'off' : 'on'} [M]`;
  renderer.render(world.scene, camera);
});

function onEvents(events: readonly SimEvent[], nowMs: number) {
  stats = addStats(stats, events);
  audio.play(cuesFor(events));
  fx.spawn(burstsFor(events), nowMs);
  if (events.some((e) => e.type === 'runEnded')) {
    if (curr.ended === 'shipDestroyed') fx.spawn([{ pos: curr.ship.pos, size: 300, durationMs: 1400, color: 0xffb060 }], nowMs);
    const r = updateBest(best, curr.score);
    best = r.best;
    newBest = r.isNew;
    if (r.isNew) storage.set(BEST_KEY, String(best));
    dispatch('end');
  }
}
