/**
 * The FX visual test page (P11, P12): every effect on demand next to a big asteroid (to check sprites never cut into it),
 * and a stress mode that holds 2000 particles with an fps readout. Public at `fx.html`, not linked from the game.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { BIG_RADIUS, ROCKET_SPEED, TICK_MS, initialState, makeAsteroid, type GameState, type ProjectileState, type Vec3 } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';
import { buildAtlas } from './fx/atlas.js';
import { BillboardBatch } from './fx/batch.js';
import type { Recipe } from './fx/bus.js';
import { EXPLOSION_SIZE } from './fx/bus.js';
import { FxEngine, MAX_PARTICLES } from './fx/engine.js';
import { ShockwaveLayer } from './fx/shockwave.js';

const base = import.meta.env.BASE_URL;
const url = (p: string) => assetUrl(base, p);
const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
el('app').appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0x8890a8, 0.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(-1, 0.6, 0.8);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 30000);
camera.position.set(0, 120, 700);
const controls = new OrbitControls(camera, renderer.domElement);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// A big asteroid at the origin, explosions on its surface, so seams would show.
const rock = await new OBJLoader().loadAsync(url('models/asteroids/astro02.obj'));
rock.traverse((c) => {
  if (c instanceof THREE.Mesh)
    c.material = new THREE.MeshStandardMaterial({
      color: 0x8a8070,
      roughness: 0.9,
    });
});
const box = new THREE.Box3().setFromObject(rock);
rock.scale.setScalar((2 * BIG_RADIUS) / Math.max(...box.getSize(new THREE.Vector3()).toArray()));
scene.add(rock);

const atlas = await buildAtlas(url);
const batch = new BillboardBatch(atlas, MAX_PARTICLES + 64);
const shockwaves = new ShockwaveLayer(scene, atlas);
scene.add(batch.mesh);
const fx = new FxEngine();

// A fake state for the per-tick emitters: a rocket flying across, an asteroid inside the atmosphere.
let state: GameState = initialState(1);
let prevShots: readonly ProjectileState[] = [];
let rocketTicks = 0;
let atmosphereTicks = 0;
let stress = false;
/** Headless checks freeze the clock and step it by hand. */
let frozen = false;

const surface: Vec3 = [0, 0, BIG_RADIUS * 1.1];
const RECIPES: Record<string, () => Recipe[]> = {
  big: () => [
    {
      kind: 'explosion',
      pos: [0, 0, 0],
      size: EXPLOSION_SIZE.big,
      normal: [0, 0, 1],
    },
  ],
  small: () => [
    {
      kind: 'explosion',
      pos: surface,
      size: EXPLOSION_SIZE.small,
      normal: [0, 0, 1],
    },
  ],
  impact: () => [{ kind: 'impact', pos: surface }],
  embers: () => [{ kind: 'embers', pos: [150, 0, 150] }],
};

function trigger(name: string): void {
  const r = RECIPES[name];
  const e = camera.matrixWorld.elements;
  if (r) fx.apply(r(), [e[4], e[5], e[6]]);
  // The big explosion destroys the test asteroid, as in the game; it comes back after a few seconds.
  if (name === 'big') {
    rock.visible = false;
    setTimeout(() => {
      rock.visible = true;
    }, 3000);
  }
  else if (name === 'rocket') rocketTicks = 60;
  else if (name === 'atmosphere') atmosphereTicks = 50;
  else if (name === 'stress') {
    stress = !stress;
    el('stress').classList.toggle('on', stress);
  } else if (name === 'clear') fx.clear();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-fx]')) {
  b.addEventListener('click', () => {
    trigger(b.dataset['fx'] ?? '');
  });
}

function simTick(): void {
  prevShots = state.projectiles;
  const projectiles: ProjectileState[] = [];
  if (rocketTicks > 0) {
    const t = 60 - rocketTicks--;
    projectiles.push({
      id: 1,
      kind: 'rocket',
      pos: [-450 + t * ROCKET_SPEED, 160, 200],
      dir: [1, 0, 0],
      age: t,
      target: null,
    });
  }
  state = { ...state, projectiles };
  fx.ambient(state);
  if (atmosphereTicks > 0) {
    // The test scene has no Earth: burn a big asteroid moving +X by hand.
    atmosphereTicks--;
    fx.atmosphereTail({
      ...makeAsteroid(1, 'big', [-300 + (50 - atmosphereTicks) * 3, -150, 0]),
      dir: [1, 0, 0],
    });
  }
  if (stress) {
    while (fx.particles.length < 2000)
      fx.apply([
        {
          kind: 'explosion',
          pos: [(Math.random() - 0.5) * 900, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 900],
          size: EXPLOSION_SIZE.big,
          normal: null,
        },
      ]);
  }
  fx.tick();
}

let acc = 0;
let last = performance.now();
let frames = 0;
let fpsT = last;
let fps = 0;
renderer.setAnimationLoop((now: number) => {
  acc += Math.min(250, now - last);
  last = now;
  if (frozen) acc = 0;
  while (acc >= TICK_MS) {
    simTick();
    acc -= TICK_MS;
  }
  controls.update();
  camera.updateMatrixWorld();
  batch.begin();
  fx.draw(batch, acc / TICK_MS, prevShots, state.projectiles);
  const drawn = batch.end(camera);
  shockwaves.sync(fx.shockwaves);
  renderer.render(scene, camera);
  frames++;
  if (now - fpsT >= 500) {
    fps = (frames * 1000) / (now - fpsT);
    frames = 0;
    fpsT = now;
  }
  el('info').textContent = `${fps.toFixed(0)} fps · ${String(fx.particles.length)} particles · ${String(drawn)} drawn`;
});

// For headless checks.
Object.assign(window, {
  fxTest: {
    trigger,
    engine: fx,
    camera,
    count: () => fx.particles.length,
    fps: () => fps,
    freeze: (on: boolean) => {
      frozen = on;
    },
    advance: (ticks: number) => {
      for (let i = 0; i < ticks; i++) simTick();
    },
  },
});
