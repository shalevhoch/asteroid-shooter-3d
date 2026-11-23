#!/usr/bin/env node
// P25 GLB bake: turns every legacy 3DS / LWO model in the asset manifest into GLB (textures embedded as JPEG), moves
// the sources (model + textures) to packages/web/assets-src/ (kept for re-baking, not deployed) and points the
// manifest at the .glb. Re-runnable. Run after scripts/import-assets.mjs. Needs google-chrome.
//
//   node scripts/bake-glb.mjs
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const WEB = 'packages/web';
const PUB = join(WEB, 'public/assets');
const SRC = join(WEB, 'assets-src');
const MANIFEST = join(PUB, 'manifest.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const legacy = (m) => m.format === '3ds' || m.format === 'lwo' || (m.format === 'glb' && m.source);
const jobs = manifest.models.filter(legacy).map((m) => ({ id: m.id, format: m.source ? (m.source.endsWith('.lwo') ? 'lwo' : '3ds') : m.format, source: m.source ?? m.file, textures: m.textures ?? [] }));

// 1. Sources out of the deployed tree.
for (const j of jobs) {
  for (const f of [j.source, ...j.textures]) {
    if (!existsSync(join(PUB, f))) continue;
    mkdirSync(dirname(join(SRC, f)), { recursive: true });
    renameSync(join(PUB, f), join(SRC, f));
  }
}

// 2. Bake in headless Chrome against the Vite dev server (bake.html → src/bake.ts).
const vite = spawn('npx', ['vite', '--port', '5199', '--strictPort'], { cwd: WEB, stdio: 'ignore' });
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=9337', '--user-data-dir=/tmp/bake-profile', 'about:blank'], { stdio: 'ignore' });
try {
  await sleep(4000);
  const page = (await (await fetch('http://127.0.0.1:9337/json')).json()).find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) pending.get(m.id)(m);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5199/bake.html' });
  await sleep(4000);
  const arg = JSON.stringify(jobs.map(({ id, format, source }) => ({ id, format, source })));
  const r = await send('Runtime.evaluate', { expression: `window.bake(${arg})`, awaitPromise: true, returnByValue: true });
  const out = r.result.result?.value;
  if (!out) throw new Error(`bake failed: ${JSON.stringify(r.result.exceptionDetails ?? r.result)}`);
  ws.close();

  // 3. GLBs into the deployed tree; manifest entries point at them.
  for (const j of jobs) {
    const file = j.source.replace(/\.(3ds|lwo)$/i, '.glb');
    writeFileSync(join(PUB, file), Buffer.from(out[j.id], 'base64'));
    const i = manifest.models.findIndex((m) => m.id === j.id);
    manifest.models[i] = { id: j.id, format: 'glb', file, source: j.source, core: manifest.models[i].core };
    console.log(`${j.id}: ${file} ${String(Buffer.from(out[j.id], 'base64').length)} B`);
  }
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  chrome.kill();
  vite.kill();
}
