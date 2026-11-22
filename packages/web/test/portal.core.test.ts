/** P14: the game page matches the games.hochgi.com portal and links back to it. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../index.html');
const main = read('../src/main.ts');

describe('portal look (P14)', () => {
  it('uses the portal font and palette: gold text, sage secondary text, green borders', () => {
    expect(html).toContain("font-family: 'Segoe UI', Arial, sans-serif");
    for (const c of ['#f0d9a8', '#a8c9b0', '#3a9d6e']) expect(html).toContain(c);
    for (const old of ['#2a3148', '#8b94a8', '#4a5470']) expect(html).not.toContain(old);
  });

  it('has its own favicon, served from the public folder', () => {
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/icon.svg" />');
    expect(read('../public/icon.svg')).toMatch(/^<svg [^>]*viewBox="0 0 64 64"/);
  });

  it('links back to the portal from the title, pause and game-over cards', () => {
    expect(main).toContain('<a href="/">← all games · games.hochgi.com</a>');
    expect(main.match(/\$\{PORTAL_LINK\}/g)).toHaveLength(3);
  });
});
