#!/usr/bin/env node
// AGENTS.md drift guard (run by `pnpm verify` and CI).
//
// 1. AGENTS.md is the single source of rules and keeps the sections agents rely on
//    (agents.md conventions: overview, setup/commands, code style, testing, PR conventions, security).
// 2. CLAUDE.md / CURSOR.md / OPENCODE.md stay thin pointers: they link AGENTS.md, carry no `##`
//    sections, and stay short — so rules can't fork into tool-specific copies.
// 3. Every command/script named in AGENTS.md's command block exists in package.json, and every
//    live pipeline file AGENTS.md points to exists.
import { existsSync, readFileSync } from 'node:fs';

const errors = [];
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : (errors.push(`${p} is missing`), ''));

const agents = read('AGENTS.md');
const requiredSections = [
  'Project overview',
  'Repository layout',
  'Setup and commands',
  'Code style and architecture',
  'Testing instructions',
  'Delivery workflow',
  'PR and commit conventions',
  'Security considerations',
  'Agent tooling',
  'Vocabulary',
];
const h2 = new Set([...agents.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()));
for (const s of requiredSections) if (!h2.has(s)) errors.push(`AGENTS.md lost its "## ${s}" section`);
if (!/SPEC\.md.{0,10}is the truth/i.test(agents)) errors.push('AGENTS.md must state that SPEC.md is the truth');

const MAX_POINTER_LINES = 8;
for (const p of ['CLAUDE.md', 'CURSOR.md', 'OPENCODE.md']) {
  const text = read(p);
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  if (!text.includes('AGENTS.md')) errors.push(`${p} must point to AGENTS.md`);
  if (/^##\s/m.test(text)) errors.push(`${p} must stay pointer-only (no "##" sections) — move rules to AGENTS.md`);
  if (lines.length > MAX_POINTER_LINES) errors.push(`${p} has ${lines.length} non-blank lines (max ${MAX_POINTER_LINES}) — pointer files add nothing`);
}

const pkg = JSON.parse(read('package.json') || '{}');
for (const m of agents.matchAll(/\bpnpm ([a-z][\w:-]*)/g)) {
  const script = m[1];
  if (['install', 'add', 'exec', 'dlx'].includes(script)) continue;
  if (!pkg.scripts?.[script]) errors.push(`AGENTS.md mentions "pnpm ${script}" but package.json has no such script`);
}
for (const p of [
  '.opencode/command/spec-to-ship.md',
  '.opencode/command/refine-packet.md',
  'opencode.json',
  'PLAN.md',
  'SPEC.md',
  '.claude/rules/adapter-leaf-dependencies.md',
]) {
  if (!existsSync(p)) errors.push(`${p} is referenced by the harness but missing`);
}

if (errors.length) {
  console.error('Harness drift check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  console.error('\nFix AGENTS.md (the single source of rules) rather than the pointer files.');
  process.exit(1);
}
console.log('Harness drift check OK');
