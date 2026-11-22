/** The P04 scene: sky sphere, Earth with an atmosphere glow, the mothership and the player's ship. */
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { ATMOSPHERE_RADIUS, EARTH_POS, MOTHERSHIP_POS, MOTHERSHIP_SCALE } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';

export const SKY_RADIUS = 9000;

export interface World {
  readonly scene: THREE.Scene;
  readonly sky: THREE.Object3D;
  readonly ship: THREE.Group;
  readonly earth: THREE.Object3D;
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

  const [sky, earth, mothership, shipModel] = await Promise.all([
    loadObj(base, 'models/space/space.obj', 'models/space/space.jpg'),
    loadObj(base, 'models/earth/earth.obj', 'models/earth/earth.jpg'),
    loadObj(base, 'models/mothership/mothership.obj', 'models/mothership/mothership.jpg'),
    loadObj(base, 'models/ship1/ship.obj', 'models/ship1/f02_512.jpg'),
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
  const centre = new THREE.Box3().setFromObject(shipModel).getCenter(new THREE.Vector3());
  shipModel.position.sub(centre);
  const ship = new THREE.Group();
  const turned = new THREE.Group();
  turned.rotation.y = Math.PI;
  turned.add(shipModel);
  ship.add(turned);
  scene.add(ship);

  return { scene, sky, ship, earth };
}
