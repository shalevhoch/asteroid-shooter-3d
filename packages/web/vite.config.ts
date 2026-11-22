import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * GitHub Pages serves this app at `/asteroid-shooter-3d/` under games.hochgi.com (same pattern
 * as `/conquarrow/` and `/ninja_grip/`). `--mode pages` sets that base; dev and plain builds keep `/`.
 * Vite output goes to `static/` so `assets/` stays the runtime asset tree (models, textures, sounds).
 */
export const PAGES_BASE = '/asteroid-shooter-3d/';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? PAGES_BASE : '/',
  server: { port: 5175 },
  build: {
    target: 'es2022', sourcemap: true, assetsDir: 'static', chunkSizeWarningLimit: 800,
    rollupOptions: { input: { main: resolve(import.meta.dirname, 'index.html'), gallery: resolve(import.meta.dirname, 'gallery.html') } },
  },
}));
