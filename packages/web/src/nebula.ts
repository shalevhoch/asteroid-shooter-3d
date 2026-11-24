/** The nebula sky (P30): a procedural, seeded canvas of soft coloured clouds on a sphere just inside the star sky. */
import * as THREE from 'three';

/** A small seeded generator, so the nebula looks the same every visit. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE: readonly (readonly [number, number, number])[] = [
  [120, 60, 200],
  [40, 120, 190],
  [190, 60, 140],
  [60, 170, 160],
];

/** Draws the clouds into an equirectangular canvas; blobs wrap at the left/right seam. */
export function paintNebula(ctx: CanvasRenderingContext2D, w: number, h: number, seed = 7): void {
  const r = rng(seed);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let cluster = 0; cluster < 3; cluster++) {
    const cx = r() * w;
    const cy = h * (0.3 + 0.4 * r());
    const c = PALETTE[Math.floor(r() * PALETTE.length)] ?? [120, 60, 200];
    for (let i = 0; i < 26; i++) {
      const x = cx + (r() - 0.5) * w * 0.35;
      const y = cy + (r() - 0.5) * h * 0.3;
      const rad = h * (0.04 + 0.12 * r());
      const a = 0.05 + 0.08 * r();
      for (const dx of [-w, 0, w]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
        g.addColorStop(0, `rgba(${String(c[0])},${String(c[1])},${String(c[2])},${String(a)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
      }
    }
  }
}

/** A sphere of `radius` with the nebula on its inside, drawn additively behind everything. */
export function buildNebula(radius: number): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) paintNebula(ctx, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  mesh.renderOrder = -1;
  return mesh;
}
