/**
 * P00 placeholder scene: one asteroid from the original game's models, tumbling in a starfield.
 * It proves the toolchain, the Pages base path and asset loading end to end. The real game loop lands in P04.
 */
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { TICK_MS } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';

const base = import.meta.env.BASE_URL;
const host = document.getElementById('app');
if (!host) throw new Error('#app missing');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 5000);
camera.position.set(0, 0, 85);

scene.add(new THREE.AmbientLight(0x404050, 1.2));
const sun = new THREE.DirectionalLight(0xfff2dd, 2.2);
sun.position.set(80, 40, 60);
scene.add(sun);

const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const v = new THREE.Vector3().randomDirection().multiplyScalar(800 + Math.random() * 1200);
  starPositions.set([v.x, v.y, v.z], i * 3);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starTexture = new THREE.TextureLoader().load(assetUrl(base, 'textures/round_particle_16x16.png'));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ size: 6, map: starTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
);
scene.add(stars);

const spin = new THREE.Group();
scene.add(spin);
new OBJLoader().load(assetUrl(base, 'models/asteroids/astro01.obj'), (obj) => {
  const rock = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 0.95, metalness: 0.05, flatShading: true });
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) child.material = rock;
  });
  spin.add(obj);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Rotation is expressed per sim tick so the placeholder already moves at the game's 25 Hz cadence.
const radiansPerTick = 0.01;
renderer.setAnimationLoop((timeMs: number) => {
  const ticks = timeMs / TICK_MS;
  spin.rotation.set(ticks * radiansPerTick * 0.7, ticks * radiansPerTick, 0);
  stars.rotation.y = ticks * 0.0002;
  renderer.render(scene, camera);
});
