/** The P04 scene: sky sphere, Earth with an atmosphere glow, the mothership and the player's ship. */
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { ATMOSPHERE_RADIUS, EARTH_POS, MOTHERSHIP_POS, MOTHERSHIP_SCALE, type CraftId } from '@asteroid/sim';
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
  shuttle: { file: 'models/extras/shuttle-01/shuttle-01.3ds', euler: [-Math.PI / 2, 0, 0] },
};

async function loadCraft(base: string, id: CraftId): Promise<THREE.Object3D> {
  const m = CRAFT_MODELS[id];
  if (m.file.endsWith('.3ds')) {
    const dir = m.file.slice(0, m.file.lastIndexOf('/') + 1);
    const obj = await new TDSLoader().setResourcePath(assetUrl(base, dir)).loadAsync(assetUrl(base, m.file));
    obj.traverse((c) => {
      if (c instanceof THREE.Mesh) {
        const old = c.material as THREE.MeshPhongMaterial;
        if (old.map) old.map.colorSpace = THREE.SRGBColorSpace;
        c.material = new THREE.MeshStandardMaterial({ map: old.map ?? null, color: old.map ? 0xffffff : old.color, roughness: 0.85, metalness: 0.1 });
      }
    });
    return obj;
  }
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

export async function buildWorld(base: string): Promise<World> {
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0x8890a8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
  sun.position.set(-1, 0.6, 0.8);
  scene.add(sun);

  const [sky, earth, mothership, shipModel, bigRock, smallRock] = await Promise.all([
    loadObj(base, 'models/space/space.obj', 'models/space/space.jpg'),
    loadObj(base, 'models/earth/earth.obj', 'models/earth/earth.jpg'),
    loadObj(base, 'models/mothership/mothership.obj', 'models/mothership/mothership.jpg'),
    loadObj(base, 'models/ship1/ship.obj', 'models/ship1/f02_512.jpg'),
    loadObj(base, 'models/asteroids/astro02.obj'),
    loadObj(base, 'models/asteroids/astro01.obj'),
  ]);

  // Sky: the unit sphere, scaled up, drawn first and unlit, following the camera.
  sky.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      const old = c.material as THREE.MeshStandardMaterial;
      c.material = new THREE.MeshBasicMaterial({ map: old.map, side: THREE.BackSide, depthWrite: false });
      c.renderOrder = -1;
    }
  });
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
  return { scene, sky, ship, setCraft, earth, asteroidGeometry };
}
