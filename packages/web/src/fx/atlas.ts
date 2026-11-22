/** The FX texture atlas (P11): every sprite texture in one canvas, so all sprites sort and draw in a single call. */
import * as THREE from 'three';

export const ATLAS_W = 512;
export const ATLAS_H = 640;

/** Where each texture sits in the atlas, in pixels (top-left origin), and the file it comes from. */
export const ATLAS_LAYOUT = {
  flash1: { x: 0, y: 0, w: 128, h: 128, file: 'flash_burst_1_128x128.png' },
  flash2: { x: 128, y: 0, w: 128, h: 128, file: 'flash_burst_2_128x128.png' },
  flash3: { x: 256, y: 0, w: 128, h: 128, file: 'flash_burst_3_128x128.png' },
  flash4: { x: 384, y: 0, w: 128, h: 128, file: 'flash_burst_4_128x128.png' },
  flame1: { x: 0, y: 128, w: 128, h: 128, file: 'flame_smoke_1_128x128.png' },
  flame2: { x: 128, y: 128, w: 128, h: 128, file: 'flame_smoke_2_128x128.png' },
  flame3: { x: 256, y: 128, w: 128, h: 128, file: 'flame_smoke_3_128x128.png' },
  flame4: { x: 384, y: 128, w: 128, h: 128, file: 'flame_smoke_4_128x128.png' },
  roundSparks: {
    x: 0,
    y: 256,
    w: 128,
    h: 128,
    file: 'round_sparks_128x128.png',
  },
  particle: { x: 128, y: 256, w: 128, h: 128, file: 'particle_32x32.png' },
  roundParticle: {
    x: 256,
    y: 256,
    w: 128,
    h: 128,
    file: 'round_particle_16x16.png',
  },
  sparksRing: {
    x: 384,
    y: 256,
    w: 128,
    h: 128,
    file: 'sparks_ring_256x256.png',
  },
  smoke1: { x: 0, y: 384, w: 256, h: 64, file: 'smoke_trail_1_256x64.png' },
  smoke2: { x: 256, y: 384, w: 256, h: 64, file: 'smoke_trail_2_256x64.png' },
  smoke3: { x: 0, y: 448, w: 256, h: 64, file: 'smoke_trail_3_256x64.png' },
  smoke4: { x: 256, y: 448, w: 256, h: 64, file: 'smoke_trail_4_256x64.png' },
  spark: { x: 0, y: 512, w: 128, h: 16, file: 'flying_spark_128x16.png' },
  shockwave: { x: 128, y: 512, w: 128, h: 128, file: 'shockwave_128x128.png' },
} as const;

export type Cell = keyof typeof ATLAS_LAYOUT;
export const CELLS = Object.keys(ATLAS_LAYOUT) as Cell[];

/** A cell's UV rect [u0, v0, u1, v1], for a texture uploaded with flipY (v up). Half a texel inset so bilinear filtering never bleeds. */
export function cellUv(cell: Cell): [number, number, number, number] {
  const c = ATLAS_LAYOUT[cell];
  return [(c.x + 0.5) / ATLAS_W, 1 - (c.y + c.h - 0.5) / ATLAS_H, (c.x + c.w - 0.5) / ATLAS_W, 1 - (c.y + 0.5) / ATLAS_H];
}

/** Loads every texture and draws it into its cell. Colours stay as authored (no sRGB decode), as the original GL drew them. */
export async function buildAtlas(url: (file: string) => string): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_W;
  canvas.height = ATLAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  await Promise.all(
    CELLS.map(async (cell) => {
      const c = ATLAS_LAYOUT[cell];
      const img = new Image();
      img.src = url(`textures/${c.file}`);
      await img.decode();
      ctx.drawImage(img, c.x, c.y, c.w, c.h);
    }),
  );
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
