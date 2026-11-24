/** The P04 scene: sky sphere, Earth with an atmosphere glow, the mothership and the player's ship. */
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ATMOSPHERE_RADIUS, EARTH_POS, MOTHERSHIP_POS, MOTHERSHIP_SCALE, STATION_DOCK_RADIUS, STATION_POS, type CraftId } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';

export const SKY_RADIUS = 9000;

export interface World {
  readonly scene: THREE.Scene;
  readonly sky: THREE.Object3D;
  readonly ship: THREE.Group;
  /** Swaps the ship's model (P17); other crafts load on first use. */
  setCraft(id: CraftId): Promise<void>;
  readonly earth: THREE.Object3D;
  /** Asteroid geometry by size, from astro02 (big) and astro01 (small). */
  readonly asteroidGeometry: { readonly big: THREE.BufferGeometry; readonly small: THREE.BufferGeometry };
  /** Every craft is fitted to this length (the Fighter's), in world units (P28 places the nozzles with it). */
  readonly shipLength: number;
}

function firstGeometry(obj: THREE.Object3D): THREE.BufferGeometry {
  const geometries: unknown[] = [];
  obj.traverse((c) => {
    if (c instanceof THREE.Mesh) geometries.push(c.geometry);
  });
  const g = geometries[0];
  if (!(g instanceof THREE.BufferGeometry)) throw new Error('model has no mesh');
  return g as THREE.BufferGeometry;
}

/**
 * Where each craft's model lives and how to turn it nose-along-+Z, wings level (the Fighter's own frame). Every model
 * is scaled to the Fighter's length, so the 20-unit collision sphere fits them all.
 */
export const CRAFT_MODELS: Readonly<Record<CraftId, { readonly file: string; readonly texture?: string; readonly euler: readonly [number, number, number] }>> = {
  fighter: { file: 'models/ship1/ship.obj', texture: 'models/ship1/f02_512.jpg', euler: [0, 0, 0] },
  interceptor: { file: 'models/ship2/ship.obj', texture: 'models/ship2/f03_512.jpg', euler: [0, 0, 0] },
  shuttle: { file: 'models/extras/shuttle-01/shuttle-01.glb', euler: [-Math.PI / 2, 0, 0] },
};

/** A model baked from 3DS to GLB (P25), with its original Phong materials, textures in sRGB. */
// GLTFLoader is imported on demand: these models (station, Shuttle) load behind the title card, so it stays off the
// first-play path.
async function loadBaked(base: string, file: string): Promise<THREE.Object3D> {
  const { loadGlb } = await import('./glb.js');
  return loadGlb(assetUrl(base, file));
}

/** Centres a 3DS model (Z up) on the origin, turned Y-up, scaled so its longest side is `size`. */
function fitted(obj: THREE.Object3D, size: number, euler: readonly [number, number, number] = [-Math.PI / 2, 0, 0]): THREE.Group {
  const holder = new THREE.Group();
  obj.rotation.set(...euler);
  holder.add(obj);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const dims = box.getSize(new THREE.Vector3());
  obj.position.sub(box.getCenter(new THREE.Vector3()));
  holder.scale.setScalar(size / Math.max(dims.x, dims.y, dims.z));
  return holder;
}

/**
 * The space station landmark (P18): the station above its landing dock, which is the reload point at `STATION_POS`,
 * with the graving dock and barrack as dressing, and a slowly pulsing green ring marking where to fly in. Loaded after
 * the game starts; returns the ring so the loop can pulse it.
 */
export async function addStation(scene: THREE.Scene, base: string): Promise<THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>> {
  const x = (f: string) => loadBaked(base, `models/extras/${f}`);
  const [station, dock, graving, barrack] = await Promise.all([x('space-station/space-station.glb'), x('landing-dock/landing-dock.glb'), x('graving-dock/graving-dock.glb'), x('barrack/barrack.glb')]);
  const group = new THREE.Group();
  group.position.set(...STATION_POS);
  const place = (o: THREE.Object3D, size: number, at: readonly [number, number, number], euler?: readonly [number, number, number]) => {
    const f = fitted(o, size, euler);
    f.position.set(...at);
    group.add(f);
  };
  place(station, 700, [0, 520, 0]);
  place(dock, 2.4 * STATION_DOCK_RADIUS, [0, 0, 0], [-Math.PI / 2, 0, Math.PI / 2]);
  place(graving, 320, [0, 200, -360]);
  place(barrack, 260, [0, 200, 360]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(STATION_DOCK_RADIUS, 4, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5dff9a, transparent: true, opacity: 0.6, depthWrite: false }));
  ring.rotation.y = Math.PI / 2;
  group.add(ring);
  scene.add(group);
  return ring;
}

async function loadCraft(base: string, id: CraftId): Promise<THREE.Object3D> {
  const m = CRAFT_MODELS[id];
  if (m.file.endsWith('.glb')) return loadBaked(base, m.file);
  return loadObj(base, m.file, m.texture);
}

/** Centres `model`, turns it into the Fighter's frame and scales it to `length` along its longest side. */
function fitCraft(model: THREE.Object3D, id: CraftId, length: number): THREE.Object3D {
  const holder = new THREE.Group();
  model.rotation.set(...CRAFT_MODELS[id].euler);
  holder.add(model);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  const k = length / Math.max(size.x, size.y, size.z);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  holder.scale.setScalar(k);
  return holder;
}

async function loadObj(base: string, path: string, texture?: string): Promise<THREE.Group> {
  const obj = await new OBJLoader().loadAsync(assetUrl(base, path));
  if (texture) {
    const map = await new THREE.TextureLoader().loadAsync(assetUrl(base, texture));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0.1 });
    obj.traverse((c) => {
      if (c instanceof THREE.Mesh) c.material = mat;
    });
  }
  return obj;
}

/** Loads the sky texture after the world is up (P24) and fades it in over ~0.6 s. A failure leaves the sky black. */
async function loadSkyTexture(base: string, mat: THREE.MeshBasicMaterial): Promise<void> {
  try {
    const map = await new THREE.TextureLoader().loadAsync(assetUrl(base, 'models/space/space.jpg'));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    mat.map = map;
    mat.needsUpdate = true;
    const t0 = performance.now();
    const fade = () => {
      const k = Math.min(1, (performance.now() - t0) / 600);
      mat.color.setScalar(k);
      if (k < 1) requestAnimationFrame(fade);
    };
    fade();
  } catch {
    // Dressing only: the game plays fine on a black sky.
  }
}

export async function buildWorld(base: string): Promise<World> {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x8890a8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(-1, 0.6, 0.8);
  scene.add(sun);

  const [sky, earth, mothership, shipModel, bigRock, smallRock] = await Promise.all([
    loadObj(base, 'models/space/space.obj'),
    loadObj(base, 'models/earth/earth.obj', 'models/earth/earth.jpg'),
    loadObj(base, 'models/mothership/mothership.obj', 'models/mothership/mothership.jpg'),
    loadObj(base, 'models/ship1/ship.obj', 'models/ship1/f02_512.jpg'),
    loadObj(base, 'models/asteroids/astro02.obj'),
    loadObj(base, 'models/asteroids/astro01.obj'),
  ]);

  // Sky: the unit sphere, scaled up, drawn first and unlit, following the camera.
  // P24: its 0.5 MB texture isn't on the first-play path. The sky starts black and the stars fade in once loaded.
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, depthWrite: false });
  sky.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      c.material = skyMat;
      c.renderOrder = -1;
    }
  });
  void loadSkyTexture(base, skyMat);
  sky.scale.setScalar(SKY_RADIUS);
  scene.add(sky);

  earth.position.set(...EARTH_POS);
  scene.add(earth);
  const glowMap = await new THREE.TextureLoader().loadAsync(assetUrl(base, 'textures/atmosphere_256x256.png'));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x7fb4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(ATMOSPHERE_RADIUS * 2);
  glow.position.set(...EARTH_POS);
  scene.add(glow);

  mothership.position.set(...MOTHERSHIP_POS);
  mothership.scale.setScalar(MOTHERSHIP_SCALE);
  scene.add(mothership);

  // Ship: centre the mesh on the sim position, nose along local −Z (the model's nose points +Z).
  const fighterSize = new THREE.Box3().setFromObject(shipModel).getSize(new THREE.Vector3());
  const length = Math.max(fighterSize.x, fighterSize.y, fighterSize.z);
  const ship = new THREE.Group();
  const turned = new THREE.Group();
  turned.rotation.y = Math.PI;
  ship.add(turned);
  scene.add(ship);
  const crafts = new Map<CraftId, Promise<THREE.Object3D>>([['fighter', Promise.resolve(fitCraft(shipModel, 'fighter', length))]]);
  let wanted: CraftId = 'fighter';
  const setCraft = async (id: CraftId): Promise<void> => {
    wanted = id;
    let p = crafts.get(id);
    if (!p) {
      p = loadCraft(base, id).then((m) => fitCraft(m, id, length));
      crafts.set(id, p);
    }
    const model = await p;
    // A later pick that finished loading first wins.
    if (wanted !== id) return;
    turned.clear();
    turned.add(model);
  };
  await setCraft('fighter');

  const asteroidGeometry = { big: firstGeometry(bigRock).center(), small: firstGeometry(smallRock).center() };
  return { scene, sky, ship, setCraft, earth, asteroidGeometry, shipLength: length };
}
