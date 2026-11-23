/** P24: first-play texture budget, and the sky texture stays off the first-play path. */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const at = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url));

describe('asset budget', () => {
  it('earth.jpg stays re-encoded (≤ 200 kB)', () => {
    expect(statSync(at('public/assets/models/earth/earth.jpg')).size).toBeLessThanOrEqual(200_000);
  });
  it('buildWorld does not await the sky texture', () => {
    const src = readFileSync(at('src/scene.ts'), 'utf8');
    expect(src).toContain("loadObj(base, 'models/space/space.obj'),");
    expect(src).toContain('void loadSkyTexture(base, skyMat)');
  });
});
