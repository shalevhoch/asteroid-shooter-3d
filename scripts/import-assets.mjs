#!/usr/bin/env node
// P02 asset import: turns a local clone of the original Java game (ASSET_SRC) into the committed runtime
// asset tree `packages/web/public/assets/` plus `manifest.json`, and writes the mothership's collision boxes
// for the sim. Re-runnable: it wipes and regenerates its outputs.
//
//   ASSET_SRC=/path/to/astroid-shooter-3D node scripts/import-assets.mjs
//
// Needs `unzip` (3DS packs ship zipped) and `ffmpeg` (re-encodes the 4096² sky texture).
// Then run `node scripts/bake-glb.mjs` (P25): it bakes the 3DS / LWO models to GLB and moves their sources to
// packages/web/assets-src/.
// Every output file name is lowercase, so references resolve the same on case-sensitive Pages.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';

const SRC = process.env.ASSET_SRC;
if (!SRC || !existsSync(join(SRC, 'models'))) {
  console.error('Set ASSET_SRC to a local clone of github.com/hochgi/astroid-shooter-3D');
  process.exit(1);
}
const OUT = 'packages/web/public/assets';
const SIM_BOXES = 'packages/sim/src/data/mothershipBoxes.ts';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const src = (...p) => join(SRC, ...p);
const out = (...p) => join(OUT, ...p);
const put = (rel, data) => {
  mkdirSync(dirname(out(rel)), { recursive: true });
  writeFileSync(out(rel), data);
};
const copy = (from, rel) => {
  mkdirSync(dirname(out(rel)), { recursive: true });
  copyFileSync(from, out(rel));
};

/** OBJ (`.wng` in the original): copy, pointing `mtllib` at our cleaned MTL or dropping it. */
function obj(from, rel, mtl) {
  const lines = readFileSync(from, 'utf8').split(/\r?\n/).filter((l) => !/^mtllib\b/.test(l));
  if (mtl) lines.unshift(`mtllib ${mtl}`);
  put(rel, lines.join('\n'));
}
/** MTL: keep the material blocks, rewrite every `map_*` to the given lowercase texture (or drop maps). */
function mtl(from, rel, texture) {
  const lines = readFileSync(from, 'utf8')
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .map((l) => (/^\s*map_/.test(l) ? (texture ? l.replace(/^(\s*map_\w+)\s.*$/, `$1 ${texture}`) : null) : l))
    .filter((l) => l !== null);
  put(rel, lines.join('\n'));
}

const models = [];
const add = (m) => models.push(m);

// ── Core set: the models the Java game loads. ──────────────────────────────────────────────────
for (const ship of ['ship1', 'ship2']) {
  const tex = ship === 'ship1' ? 'f02_512.jpg' : 'f03_512.jpg';
  obj(src('models', ship, 'ship.wng'), `models/${ship}/ship.obj`, 'ship.mtl');
  mtl(src('models', ship, 'ship.mtl'), `models/${ship}/ship.mtl`, tex);
  copy(src('models', ship, tex.toUpperCase().replace('.JPG', '.jpg')), `models/${ship}/${tex}`);
  add({ id: ship, format: 'obj', file: `models/${ship}/ship.obj`, core: ship === 'ship1' });
}
obj(src('models/mothership/mothership.wng'), 'models/mothership/mothership.obj', 'mothership.mtl');
mtl(src('models/mothership/mothership.mtl'), 'models/mothership/mothership.mtl', 'mothership.jpg');
copy(src('models/mothership/mothership.jpg'), 'models/mothership/mothership.jpg');
add({ id: 'mothership', format: 'obj', file: 'models/mothership/mothership.obj', core: true });

obj(src('models/earth/earth.wng'), 'models/earth/earth.obj', 'earth.mtl');
mtl(src('models/earth/earth.mtl'), 'models/earth/earth.mtl', 'earth.jpg');
copy(src('models/earth/earth.jpg'), 'models/earth/earth.jpg');
add({ id: 'earth', format: 'obj', file: 'models/earth/earth.obj', core: true });

obj(src('models/space/space.wng'), 'models/space/space.obj', 'space.mtl');
mtl(src('models/space/space.mtl'), 'models/space/space.mtl', 'space.jpg');
mkdirSync(out('models/space'), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src('models/space/space.jpg'), '-vf', 'scale=2048:2048', '-q:v', '4', out('models/space/space.jpg')]);
add({ id: 'space', format: 'obj', file: 'models/space/space.obj', core: true });

// astro01.mtl in the original is a stray copy of geometry, so the small asteroid gets no MTL (the game shades it).
obj(src('models/asteroids/astro01.wng'), 'models/asteroids/astro01.obj');
add({ id: 'asteroid-small', format: 'obj', file: 'models/asteroids/astro01.obj', core: true });
obj(src('models/asteroids/astro02.wng'), 'models/asteroids/astro02.obj', 'astro02.mtl');
mtl(src('models/asteroids/astro02.mtl'), 'models/asteroids/astro02.mtl');
add({ id: 'asteroid-big', format: 'obj', file: 'models/asteroids/astro02.obj', core: true });
for (const f of readdirSync(src('models/asteroids')).filter((f) => /^asteroid_\d+\.wng$/.test(f)).sort()) {
  const id = f.replace('.wng', '');
  obj(src('models/asteroids', f), `models/asteroids/${id}.obj`);
  add({ id: id.replace('_', '-'), format: 'obj', file: `models/asteroids/${id}.obj`, core: false });
}

// ── Mothership collision boxes (model space, before MOTHERSHIP_SCALE). ─────────────────────────
const boxes = [1, 2, 3, 4, 5, 6].map((i) => {
  const v = readFileSync(src(`models/mothership/BoundingBoxs/b${i}.wng`), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('v '))
    .map((l) => l.split(/\s+/).slice(1, 4).map(Number));
  const r = (x) => Math.round(x * 1000) / 1000;
  return {
    min: [0, 1, 2].map((a) => r(Math.min(...v.map((p) => p[a])))),
    max: [0, 1, 2].map((a) => r(Math.max(...v.map((p) => p[a])))),
  };
});
put('models/mothership/boxes.json', JSON.stringify(boxes, null, 2) + '\n');
mkdirSync(dirname(SIM_BOXES), { recursive: true });
writeFileSync(
  SIM_BOXES,
  `// Generated by scripts/import-assets.mjs from the original's models/mothership/BoundingBoxs/b1..b6. Do not edit.\n` +
    `// Model-space axis-aligned boxes; the world box is MOTHERSHIP_POS + corner × MOTHERSHIP_SCALE (SPEC §2).\n` +
    `export const MOTHERSHIP_BOXES: readonly { readonly min: readonly [number, number, number]; readonly max: readonly [number, number, number] }[] = [\n` +
    boxes.map((b) => `  { min: [${b.min.join(', ')}], max: [${b.max.join(', ')}] },`).join('\n') +
    `\n];\n`,
);

// ── Extras: models the Java game never loaded. ─────────────────────────────────────────────────
/** 3DS stores 8.3 upper-case texture names. Lower-case them in place (same length) and copy each texture under that name. */
function tds(from, rel, textures) {
  const buf = Buffer.from(readFileSync(from));
  const refs = [];
  for (const [ref, file] of Object.entries(textures)) {
    const needle = Buffer.from(ref, 'latin1');
    let at = buf.indexOf(needle);
    if (at < 0) throw new Error(`${from}: no texture ref ${ref}`);
    while (at >= 0) {
      buf.write(ref.toLowerCase(), at, 'latin1');
      at = buf.indexOf(needle, at + 1);
    }
    copy(file, join(dirname(rel), ref.toLowerCase()));
    refs.push(join(dirname(rel), ref.toLowerCase()));
  }
  put(rel, buf);
  return refs;
}
const unzipTo = (zip) => {
  const dir = mkdtempSync(join(tmpdir(), 'astro-'));
  execFileSync('unzip', ['-qo', zip, '-d', dir]);
  return dir;
};

const b = (f) => src('models/buildings', f);
const buildings = {
  barrack: { 'METAL03_.JPG': b('metal03_3_128x128.jpg'), 'METAL07_.JPG': b('metal07_door_128.jpg'), 'METAL_DO.JPG': b('metal_door_windws01.jpg'), 'METAL_WI.JPG': b('metal_window_02.jpg') },
  'graving-dock': { 'METAL07_.JPG': b('metal07_nucl_128.jpg') },
  'landing-dock': {
    'METAL07_.JPG': b('metal07_door_128.jpg'),
    'METAL_DO.JPG': b('metal_door_windws01.jpg'),
    'METAL_LA.JPG': b('metal_Landing_sign.jpg'),
    'METAL_WI.JPG': b('metal_windws01.jpg'),
    'WARN_STR.JPG': b('warn_stripe_128.jpg'),
  },
};
for (const [name, tex] of Object.entries(buildings)) {
  const rel = `models/extras/${name}/${name}.3ds`;
  add({ id: name, format: '3ds', file: rel, textures: tds(b(`${name}.3DS`), rel, tex), core: false });
}
{
  const rel = 'models/extras/space-station/space-station.3ds';
  const textures = tds(src('models/spacestation/space-station.3DS'), rel, { 'SP_ST_25.JPG': src('models/spacestation/sp_st_256-2.jpg') });
  add({ id: 'space-station', format: '3ds', file: rel, textures, core: false });
}
const zips = [
  ['models/spaceships/SpaceFighter01.zip', 'space-fighter-01'],
  ['models/spaceships/SpaceFighter02.zip', 'space-fighter-02'],
  ['models/spaceships/SpaceFighter03.zip', 'space-fighter-03'],
  ['models/spaceships/Shuttle01.zip', 'shuttle-01'],
  ['models/spaceships/Shuttle02.zip', 'shuttle-02'],
  ['models/hovercar/Hover-Car.zip', 'hover-car'],
];
for (const [zip, id] of zips) {
  const dir = unzipTo(src(zip));
  const files = readdirSync(dir);
  const model = files.find((f) => /\.3ds$/i.test(f));
  const jpg = files.find((f) => /\.jpg$/i.test(f));
  const ref = jpg.toUpperCase();
  const rel = `models/extras/${id}/${id}.3ds`;
  add({ id, format: '3ds', file: rel, textures: tds(join(dir, model), rel, { [ref]: join(dir, jpg) }), core: false });
  rmSync(dir, { recursive: true, force: true });
}
for (const f of readdirSync(src('models/g_ship')).filter((f) => f.endsWith('.lwo')).sort()) {
  const id = f.replace('.lwo', '').replace(/_/g, '-');
  copy(src('models/g_ship', f), `models/extras/g-ship/${id}.lwo`);
  add({ id, format: 'lwo', file: `models/extras/g-ship/${id}.lwo`, core: false });
}

// ── Textures and sounds. ────────────────────────────────────────────────────────────────────────
const textures = [];
const CORE_TEXTURES = /^(round_particle|particle_32|shockwave|atmosphere|round_sparks|flash_burst|smoke_trail|flame_smoke|sparks_ring|flying_spark)/;
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
for (const f of walk(src('textures')).sort()) {
  const name = relative(src('textures'), f);
  if (/ - Copy/.test(name)) continue;
  const rel = `textures/${name.toLowerCase()}`;
  copy(f, rel);
  textures.push({ file: rel, core: CORE_TEXTURES.test(basename(name)) });
}
const sounds = readdirSync(src('sounds'))
  .filter((f) => f.endsWith('.wav'))
  .sort()
  .map((f) => {
    copy(src('sounds', f), `sounds/${f.toLowerCase()}`);
    return { file: `sounds/${f.toLowerCase()}`, core: true };
  });

put(
  'manifest.json',
  JSON.stringify({ generatedBy: 'scripts/import-assets.mjs', models, textures, sounds, mothershipBoxes: 'models/mothership/boxes.json' }, null, 2) + '\n',
);
const files = walk(OUT);
const bytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`Imported ${models.length} models, ${textures.length} textures, ${sounds.length} sounds — ${files.length} files, ${(bytes / 1e6).toFixed(2)} MB.`);
