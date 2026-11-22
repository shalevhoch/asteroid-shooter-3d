/**
 * Loading screen progress (P20). three.js's loading manager reports loaded / total, and the total grows as loaders
 * queue more files, so the raw fraction can fall back. The bar only moves forward and holds below 100 until done.
 */
export class LoadProgress {
  private best = 0;

  /** Percent for the bar: 0–99 while loading (100 only once every queued file is in), never decreasing. */
  update(loaded: number, total: number): number {
    if (!(total > 0) || !Number.isFinite(loaded)) return this.best;
    const raw = Math.max(0, Math.min(1, loaded / total));
    const pct = raw >= 1 ? 100 : Math.min(99, Math.floor(raw * 100));
    this.best = Math.max(this.best, pct);
    return this.best;
  }
}
