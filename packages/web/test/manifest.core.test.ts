/**
 * P02 asset manifest: everything the manifest, OBJ `mtllib` lines, MTL `map_*` lines and 3DS texture lists
 * reference exists under the exact (case-sensitive) name, as GitHub Pages requires.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOTHERSHIP_BOXES } from '@asteroid/sim';
import type { AssetManifest } from '../src/manifest.js';

const ROOT = join(import.meta.dirname, '../public/assets');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8')) as AssetManifest;
const CORE_BUDGET_BYTES = 4_000_000;

/** Exists with exactly this case: every path segment must appear verbatim in its parent's listing. */
function existsExact(rel: string): boolean {
  let dir = ROOT;
  for (const part of rel.split('/')) {
    if (!existsSync(dir) || !readdirSync(dir).includes(part)) return false;
    dir = join(dir, part);
  }
  return true;
}
const text = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const siblings = (rel: string, ref: string) => posix.join(posix.dirname(rel), ref);
const mtllib = (rel: string) => /^mtllib (.+)$/m.exec(text(rel))?.[1];
const maps = (mtlRel: string) => [...text(mtlRel).matchAll(/^\s*map_\w+\s+(.+?)\s*$/gm)].map((m) => m[1] ?? '');

/** Every file a model pulls in, itself included. */
function modelFiles(m: AssetManifest['models'][number]): string[] {
  const files = [m.file, ...(m.textures ?? [])];
  const lib = m.format === 'obj' ? mtllib(m.file) : undefined;
  if (lib) {
    const mtl = siblings(m.file, lib);
    files.push(mtl, ...maps(mtl).map((t) => siblings(mtl, t)));
  }
  return files;
}

describe('asset manifest', () => {
  it('lists unique model ids', () => {
    const ids = manifest.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references only files that exist with exact case', () => {
    const all = [
      ...manifest.models.flatMap(modelFiles),
      ...manifest.textures.map((t) => t.file),
      ...manifest.sounds.map((s) => s.file),
      manifest.mothershipBoxes,
    ];
    expect(all.filter((f) => !existsExact(f))).toEqual([]);
  });

  it('gives every OBJ the game uses a texture, except the shaded asteroids', () => {
    const untextured = manifest.models
      .filter((m) => m.core && m.format === 'obj' && !modelFiles(m).some((f) => f.endsWith('.jpg')))
      .map((m) => m.id);
    expect(untextured).toEqual(['asteroid-small', 'asteroid-big']);
  });

  it('keeps every asset file name lowercase', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    expect(walk(ROOT).filter((f) => f !== f.toLowerCase())).toEqual([]);
  });

  it('keeps the core payload under the budget', () => {
    const files = new Set([
      ...manifest.models.filter((m) => m.core).flatMap(modelFiles),
      ...manifest.textures.filter((t) => t.core).map((t) => t.file),
      ...manifest.sounds.filter((s) => s.core).map((s) => s.file),
    ]);
    const bytes = [...files].reduce((n, f) => n + statSync(join(ROOT, f)).size, 0);
    expect(bytes).toBeLessThan(CORE_BUDGET_BYTES);
  });

  it('ships the same mothership boxes to the sim and the gallery', () => {
    const json = JSON.parse(text(manifest.mothershipBoxes)) as unknown;
    expect(json).toEqual(MOTHERSHIP_BOXES);
    expect(MOTHERSHIP_BOXES).toHaveLength(6);
    for (const b of MOTHERSHIP_BOXES) for (let a = 0; a < 3; a++) expect(b.min[a]).toBeLessThan(b.max[a] ?? -Infinity);
  });

  it('keeps every 3DS texture next to its model', () => {
    for (const m of manifest.models.filter((x) => x.format === '3ds')) {
      expect(m.textures?.length).toBeGreaterThan(0);
      for (const t of m.textures ?? []) expect(dirname(t)).toBe(dirname(m.file));
    }
  });
});
