/** GLB models (P25): every 3DS / LWO model is baked to GLB by `scripts/bake-glb.mjs`; this loads them back. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Phong {
  color: number;
  specular: number;
  shininess: number;
  emissive: number;
  opacity: number;
  transparent: boolean;
  side: THREE.Side;
}

/** The bake's Phong look, rebuilt from `extras.phong` (GLTFLoader puts extras on userData). Others pass through. */
export function restorePhong(m: THREE.Material): THREE.Material {
  const p = m.userData['phong'] as Phong | undefined;
  if (!p) return m;
  const map = m instanceof THREE.MeshStandardMaterial ? m.map : null;
  if (map) map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhongMaterial({ ...p, map });
}

/** Loads a GLB, with the original Phong materials restored. */
export async function loadGlb(url: string): Promise<THREE.Object3D> {
  const gltf = await new GLTFLoader().loadAsync(url);
  gltf.scene.traverse((c) => {
    if (c instanceof THREE.Mesh) c.material = Array.isArray(c.material) ? c.material.map(restorePhong) : restorePhong(c.material as THREE.Material);
  });
  return gltf.scene;
}
