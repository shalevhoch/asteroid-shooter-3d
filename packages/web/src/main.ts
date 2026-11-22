/**
 * P04 flight test: the sim's fixed 25 Hz tick driven by requestAnimationFrame, rendered with interpolation.
 * Fly around Earth and the mothership; asteroids and weapons arrive in P05–P06.
 */
import * as THREE from 'three';
import { EARTH_MAX_HEALTH, FUEL_MAX, HULL_MAX, TICK_MS, initialState, step, ticksFor, type GameState } from '@asteroid/sim';
import { AsteroidView } from './asteroidView.js';
import { Controls } from './controls.js';
import { ACTION_LABELS, LAYOUTS, bindings, keyLabel } from './keymap.js';
import { buildWorld } from './scene.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY, cycle, parseSettings } from './settings.js';
import { CAMERA_MODES, FOV_BASE, cameraPose, interpolate, nextFov } from './view.js';

const base = import.meta.env.BASE_URL;
const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};
const host = el('app');
const hud = el('hud');
const help = el('help');
const intro = el('intro');

const settings = (() => {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
})();
const save = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode: settings just don't persist.
  }
};

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

function renderHelp() {
  const rows = bindings(settings.layout)
    .map(([action, codes]) => `<tr><td>${[...new Set(codes.map(keyLabel))].join(' / ')}</td><td>${ACTION_LABELS[action]}</td></tr>`)
    .join('');
  const mouse = settings.layout === 'modern' ? `<tr><td>mouse</td><td>aim (pitch / yaw)${settings.invertY ? ', Y inverted' : ''}</td></tr><tr><td>wheel</td><td>throttle ±</td></tr>` : '';
  help.innerHTML = `<h2>Controls: ${settings.layout}</h2><table>${mouse}${rows}</table><p>Click to capture the mouse · Esc releases it</p>`;
  help.style.display = settings.help ? 'block' : 'none';
}
renderHelp();

function applyToggles() {
  for (const t of controls.takeToggles()) {
    if (t === 'toggleCamera') settings.camera = cycle(CAMERA_MODES, settings.camera);
    else if (t === 'toggleLayout') settings.layout = cycle(LAYOUTS, settings.layout);
    else if (t === 'toggleInvertY') settings.invertY = !settings.invertY;
    else if (t === 'toggleHelp') settings.help = !settings.help;
    else continue;
    save();
    renderHelp();
  }
}

const world = await buildWorld(base);
const asteroids = new AsteroidView(world.scene, world.asteroidGeometry);
intro.classList.add('ready');

let prev: GameState = initialState(Date.now() >>> 0);
let curr: GameState = prev;
// `?debug` exposes the live state to the console and to browser-driven checks.
if (new URLSearchParams(location.search).has('debug')) Object.assign(window, {
    asteroidGame: () => curr,
    asteroidSetState: (s: GameState) => {
      prev = curr = s;
    },
  });
// Until the P07 game-over screen: Enter restarts a finished run.
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && curr.ended) {
    prev = curr = initialState(Date.now() >>> 0);
    asteroids.clear();
  }
});
let accMs = 0;
let lastMs = performance.now();
let fov = FOV_BASE;
const MAX_FRAME_MS = 250;
const v = new THREE.Vector3();

renderer.setAnimationLoop((nowMs: number) => {
  const frameMs = Math.min(Math.max(nowMs - lastMs, 0), MAX_FRAME_MS);
  lastMs = nowMs;
  applyToggles();
  const { ticks, remainderMs } = ticksFor(accMs + frameMs);
  for (let i = 0; i < ticks; i++) {
    prev = curr;
    curr = step(curr, controls.nextInput()).state;
  }
  accMs = remainderMs;

  const pose = interpolate(prev.ship, curr.ship, accMs / TICK_MS);
  world.ship.position.set(...pose.pos);
  world.ship.quaternion.set(...pose.rot);
  const cam = cameraPose(pose, settings.camera);
  camera.position.set(...cam.eye);
  camera.up.set(...cam.up);
  camera.lookAt(v.set(...cam.look));
  fov = nextFov(fov, curr.ship, frameMs / 1000);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  world.sky.position.copy(camera.position);
  asteroids.update(prev.asteroids, curr.asteroids, accMs / TICK_MS, curr.tick);
  world.earth.rotation.y = (curr.tick * TICK_MS) / 1000 / 120;

  const s = curr.ship;
  const pct = (v: number, max: number) => `${String(Math.round((100 * v) / max))}%`;
  const end = curr.ended ? `${curr.ended === 'earthDestroyed' ? 'EARTH DESTROYED' : 'SHIP DESTROYED'}: press Enter to restart · ` : '';
  hud.textContent = `${end}Earth ${pct(curr.earthHealth, EARTH_MAX_HEALTH)} · hull ${pct(s.hull, HULL_MAX)} · asteroids ${String(curr.asteroids.length)} · throttle ${String(s.throttle)}${s.turbo ? ' · TURBO' : ''} · fuel ${String(Math.round((100 * s.fuel) / FUEL_MAX))}% · camera ${settings.camera} [C] · layout ${settings.layout} [${settings.layout === 'classic' ? 'T' : 'L'}] · help [H]${controls.locked ? '' : ' · click to fly'}`;
  renderer.render(world.scene, camera);
});
