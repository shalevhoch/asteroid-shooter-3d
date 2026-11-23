/**
 * Model gallery (P02): every imported model, the ones the original game never loaded included. It's public at
 * `gallery.html` so the assets can be checked on the live site, and it isn't linked from the game.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { loadGlb } from './glb.js';
import { assetUrl } from './assetUrl.js';
import type { AssetManifest, ModelEntry } from './manifest.js';

const base = import.meta.env.BASE_URL;
const url = (path: string) => assetUrl(base, path);
const el = (id: string): HTMLElement => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} missing`);
  return e;
};
const host = el('app');
const list = el('list');
const info = el('info');
const wire = el('wire') as HTMLInputElement;
const showBoxes = el('boxes') as HTMLInputElement;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x302820, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
scene.add(sun);
scene.add(camera);
camera.add(sun);
sun.position.set(1, 1, 2);

function resize() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const dir = (file: string) => url(file.slice(0, file.lastIndexOf('/') + 1));

async function load(m: ModelEntry): Promise<THREE.Object3D> {
  if (m.format === 'glb') return loadGlb(url(m.file));
  const text = await (await fetch(url(m.file))).text();
  const mtl = /^mtllib (.+)$/m.exec(text)?.[1];
  const loader = new OBJLoader();
  if (mtl) {
    const materials = await new MTLLoader().setPath(dir(m.file)).loadAsync(mtl);
    materials.preload();
    loader.setMaterials(materials);
  }
  const obj = loader.parse(text);
  // The original lit everything with a fixed-function white light. Show the textures as authored, rather than
  // through each MTL's dim Kd and hot Ks: a map means white albedo, no map means the asteroid rock look.
  const rock = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 0.95, flatShading: true });
  obj.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    const old = c.material as THREE.MeshPhongMaterial;
    c.material = old.map ? new THREE.MeshStandardMaterial({ map: old.map, roughness: 0.85, metalness: 0.1 }) : rock;
  });
  return obj;
}

async function boxesFor(manifest: AssetManifest): Promise<THREE.Object3D> {
  const boxes = (await (await fetch(url(manifest.mothershipBoxes))).json()) as { min: number[]; max: number[] }[];
  const group = new THREE.Group();
  for (const b of boxes) {
    const [x0 = 0, y0 = 0, z0 = 0] = b.min;
    const [x1 = 0, y1 = 0, z1 = 0] = b.max;
    const box = new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
    group.add(new THREE.Box3Helper(box, 0xff5050));
  }
  return group;
}

let current: THREE.Object3D | null = null;
let boxes: THREE.Object3D | null = null;

function applyWire() {
  current?.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      const mats = (Array.isArray(c.material) ? c.material : [c.material]) as THREE.Material[];
      for (const mat of mats) {
        if ('wireframe' in mat) mat.wireframe = wire.checked;
        mat.side = THREE.DoubleSide;
      }
    }
  });
}

async function show(m: ModelEntry, manifest: AssetManifest, button: HTMLButtonElement) {
  for (const b of list.querySelectorAll('button')) b.classList.toggle('on', b === button);
  info.textContent = `loading ${m.file}…`;
  const obj = await load(m);
  if (current) scene.remove(current);
  if (boxes) scene.remove(boxes);
  current = obj;
  scene.add(obj);
  applyWire();
  if (m.id === 'mothership') {
    boxes = await boxesFor(manifest);
    boxes.visible = showBoxes.checked;
    scene.add(boxes);
  } else boxes = null;
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 0.001);
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(0.6, 0.4, 1).normalize().multiplyScalar(radius * 2.6));
  camera.near = radius / 100;
  camera.far = radius * 100;
  camera.updateProjectionMatrix();
  let triangles = 0;
  obj.traverse((c) => {
    if (c instanceof THREE.Mesh) {
      const g = c.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    }
  });
  info.textContent = `${m.id} · ${m.format.toUpperCase()} · ${String(Math.round(triangles))} triangles · size ${size.toArray().map((v) => v.toFixed(1)).join(' × ')}${m.core ? ' · used by the game' : ''}`;
}

wire.addEventListener('change', applyWire);
showBoxes.addEventListener('change', () => {
  if (boxes) boxes.visible = showBoxes.checked;
});

const manifest = (await (await fetch(url('manifest.json'))).json()) as AssetManifest;
const groups: [string, (m: ModelEntry) => boolean][] = [
  ['Used by the game', (m) => m.core],
  ['Other OBJ models', (m) => !m.core && m.format === 'obj'],
  ['3DS models (baked to GLB)', (m) => m.format === 'glb' && !m.source?.endsWith('.lwo')],
  ['LWO models (baked to GLB)', (m) => m.format === 'glb' && m.source?.endsWith('.lwo') === true],
];
let first: (() => void) | null = null;
for (const [title, pick] of groups) {
  const h = document.createElement('h2');
  h.textContent = title;
  list.appendChild(h);
  for (const m of manifest.models.filter(pick)) {
    const b = document.createElement('button');
    b.textContent = m.id;
    const go = () => {
      show(m, manifest, b).catch((e: unknown) => {
        info.textContent = `failed to load ${m.file}: ${String(e)}`;
      });
    };
    b.addEventListener('click', go);
    list.appendChild(b);
    first ??= go;
  }
}
const wanted = new URLSearchParams(location.search).get('model');
const buttons = [...list.querySelectorAll('button')];
const match = buttons.find((b) => b.textContent === wanted);
if (match) match.click();
else first?.();

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
