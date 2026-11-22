/**
 * Resolve a runtime asset path against the deploy base (`/` in dev, `/asteroid-shooter-3d/` on Pages).
 * Pure, so it is testable without Vite: callers pass `import.meta.env.BASE_URL`.
 */
export function assetUrl(base: string, path: string): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  const p = path.replace(/^\/+/, '');
  return `${b}assets/${p}`;
}
