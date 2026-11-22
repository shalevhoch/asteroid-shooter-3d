#!/usr/bin/env node
// Packet-PR guard (the `packet-pr` CI job). A PR is a packet PR when its title matches
// `PNN:` (optionally prefixed by `🤖: `), its branch starts with `packet/`, or it carries the
// `packet` label. A packet PR must (a) touch PLAN.md — ticking its index row — and (b) say
// `Closes #N` so merging closes the packet issue. Non-packet PRs pass untouched.
//
// Inputs (env): PR_TITLE, PR_BODY, PR_HEAD_REF, PR_LABELS (comma-separated), CHANGED_FILES (newline-separated).
const env = (k) => process.env[k] ?? '';
const title = env('PR_TITLE');
const labels = env('PR_LABELS').split(',').map((s) => s.trim()).filter(Boolean);
const head = env('PR_HEAD_REF');
const changed = env('CHANGED_FILES').split('\n').map((s) => s.trim()).filter(Boolean);

const packetId = /^(?:🤖:\s*)?(P\d{2})\b/u.exec(title)?.[1];
const isPacket = Boolean(packetId) || head.startsWith('packet/') || labels.includes('packet');
if (!isPacket) {
  console.log('Not a packet PR — nothing to check.');
  process.exit(0);
}

const errors = [];
if (!changed.includes('PLAN.md')) errors.push('a packet PR must update its row in the PLAN.md packet index (status ✅, delivered-by, PR)');
if (!/\b(close[sd]?|fix(e[sd])?|resolve[sd]?) #\d+/i.test(env('PR_BODY'))) errors.push('the PR body must contain "Closes #<packet issue>"');
if (!packetId) errors.push('the PR title must start with "🤖: PNN: <name>"');

if (errors.length) {
  console.error(`Packet PR check failed${packetId ? ` (${packetId})` : ''}:\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`Packet PR check OK (${packetId})`);
