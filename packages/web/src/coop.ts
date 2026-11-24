/** Two-player split screen helpers (P40). Pure. */
export const MIN_COOP_PADS = 2;

export interface ViewRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Left and right halves of the framebuffer, covering every pixel. */
export function splitViewports(width: number, height: number): readonly [ViewRect, ViewRect] {
  const w = Math.max(1, Math.floor(Math.max(1, width) / 2));
  const h = Math.max(1, height);
  return [
    { x: 0, y: 0, w, h },
    { x: w, y: 0, w: Math.max(1, width - w), h },
  ];
}

export const canStartCoop = (padCount: number): boolean => padCount >= MIN_COOP_PADS;
