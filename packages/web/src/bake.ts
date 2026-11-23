/**
 * GLB bake (P25), dev only: loads each legacy 3DS / LWO model from `assets-src/` with the old loaders and exports it
 * as GLB, textures embedded as JPEG. Node transforms stay as authored, so the game's fitting code is unchanged.
 * Phong materials (TDSLoader / LWOLoader) export as glTF PBR; their Phong parameters ride along in `extras.phong`, so
 * `loadGlb` rebuilds the same look. Driven by `scripts/bake-glb.mjs` through `window.bake`.
 */
import * as THREE from 'three';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { LWOLoader } from 'three/examples/jsm/loaders/LWOLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export interface BakeJob {
  readonly id: string;
  readonly format: '3ds' | 'lwo';
  /** Under `/assets-src/`. */
  readonly source: string;
}

const src = (p: string) => `/assets-src/${p}`;

async function load(job: BakeJob): Promise<THREE.Object3D> {
  if (job.format === '3ds') return new TDSLoader().setResourcePath(src(job.source.slice(0, job.source.lastIndexOf('/') + 1))).loadAsync(src(job.source));
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const lwo = await new LWOLoader().loadAsync(src(job.source));
  const group = new THREE.Group();
  for (const mesh of lwo.meshes) group.add(mesh);
  return group;
}

/** Records Phong parameters in userData (exported as glTF extras) and marks textures for JPEG embedding. */
function prepare(obj: THREE.Object3D): void {
  obj.traverse((c) => {
    if (!(c instanceof THREE.Mesh)) return;
    for (const m of (Array.isArray(c.material) ? c.material : [c.material]) as THREE.Material[]) {
      if (m instanceof THREE.MeshPhongMaterial) {
        m.userData['phong'] = { color: m.color.getHex(), specular: m.specular.getHex(), shininess: m.shininess, emissive: m.emissive.getHex(), opacity: m.opacity, transparent: m.transparent, side: m.side };
      }
      const map = 'map' in m && m.map instanceof THREE.Texture ? m.map : null;
      if (map) map.userData['mimeType'] = 'image/jpeg';
    }
  });
}

/** TDSLoader returns before its textures arrive: wait for every map's image (up to 10 s), dropping any that never load. */
async function waitForMaps(obj: THREE.Object3D): Promise<void> {
  const mats: THREE.MeshPhongMaterial[] = [];
  obj.traverse((c) => {
    if (c instanceof THREE.Mesh) mats.push(...((Array.isArray(c.material) ? c.material : [c.material]) as THREE.MeshPhongMaterial[]));
  });
  const ready = (t: THREE.Texture) => {
    const img = t.image as HTMLImageElement | undefined;
    return img !== undefined && img.width > 0;
  };
  for (let i = 0; i < 100 && mats.some((m) => m.map && !ready(m.map)); i++) await new Promise((r) => setTimeout(r, 100));
  for (const m of mats) if (m.map && !ready(m.map)) m.map = null;
}

async function bakeOne(job: BakeJob): Promise<string> {
  const obj = await load(job);
  await waitForMaps(obj);
  prepare(obj);
  const glb = (await new GLTFExporter().parseAsync(obj, { binary: true })) as ArrayBuffer;
  let s = '';
  const bytes = new Uint8Array(glb);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

Object.assign(window, {
  bake: async (jobs: BakeJob[]) => Object.fromEntries(await Promise.all(jobs.map(async (j) => [j.id, await bakeOne(j)] as const))),
});
