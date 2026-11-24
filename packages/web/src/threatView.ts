/**
 * Threat awareness overlay (P09): one 2D canvas over the game.
 * - Edge arrows for off-screen asteroids, coloured by time to impact, bigger for big ones.
 * - Rings around on-screen asteroids too small to see.
 * - Lock brackets: dashed on what a rocket fired now would lock, solid on what in-flight rockets are chasing.
 * - A ship-relative radar disc (forward is up; filled = above the wings, hollow = below).
 */
import { EARTH_POS, EARTH_RADIUS, MOTHERSHIP_POS, radiusOf, STATION_POS, timeToImpact, type AsteroidState, type Quat, type Vec3 } from '@asteroid/sim';
import { URGENCY_COLORS, edgeArrow, onScreen, project, radarBlip, urgency } from './threat.js';

export const RADAR_RANGE = 4000;
export const RADAR_SIZE_PX = 150;
/** On-screen asteroids smaller than this (screen radius, px) get a ring so they're never invisible. */
export const MIN_VISIBLE_PX = 7;

export interface ThreatFrame {
  /** View-projection matrix, column-major. */
  readonly viewProj: readonly number[];
  /** Vertical FOV (degrees) and viewport height, for screen-size estimates. */
  readonly fovDeg: number;
  readonly cameraPos: Vec3;
  readonly shipPos: Vec3;
  readonly shipRot: Quat;
  readonly asteroids: readonly AsteroidState[];
  /** What a rocket fired now would lock. */
  readonly aimTarget: number | null;
  /** What in-flight rockets are chasing. */
  readonly rocketTargets: ReadonlySet<number>;
  /** Missile locks being gathered (P32), in lock order. */
  readonly missileLocks?: readonly number[];
  /** Perk pickups for the radar (P27 follow-up). */
  readonly pickups?: readonly { readonly pos: Vec3; readonly rgb: readonly [number, number, number] }[];
}

export class ThreatView {
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
    });
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
  }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(f: ThreatFrame): void {
    this.clear();
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const toPx = (x: number, y: number): [number, number] => [((x + 1) / 2) * w, ((1 - y) / 2) * h];
    const pxPerUnitAt = (dist: number) => h / 2 / (Math.tan(((f.fovDeg / 2) * Math.PI) / 180) * Math.max(dist, 1));

    for (const a of f.asteroids) {
      const color = URGENCY_COLORS[urgency(timeToImpact(a))];
      const r = radiusOf(a.size);
      const p = project(f.viewProj, a.pos);
      if (onScreen(p)) {
        const [px, py] = toPx(p.x, p.y);
        const dist = Math.hypot(a.pos[0] - f.cameraPos[0], a.pos[1] - f.cameraPos[1], a.pos[2] - f.cameraPos[2]);
        const screenR = r * pxPerUnitAt(dist);
        if (screenR < MIN_VISIBLE_PX) ring(ctx, px, py, MIN_VISIBLE_PX + (a.size === 'small' ? 0 : 3), color);
        const lockAt = f.missileLocks?.indexOf(a.id) ?? -1;
        if (lockAt >= 0) {
          brackets(ctx, px, py, Math.max(screenR, 12) + 10, '#ff4d6d', false);
          ctx.fillStyle = '#ff4d6d';
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(String(lockAt + 1), px + Math.max(screenR, 12) + 14, py - Math.max(screenR, 12) - 6);
        } else if (f.rocketTargets.has(a.id)) brackets(ctx, px, py, Math.max(screenR, 12) + 6, '#ff9a3c', false);
        else if (f.aimTarget === a.id) brackets(ctx, px, py, Math.max(screenR, 12) + 6, '#9fffc8', true);
      } else {
        const arrow = edgeArrow(p);
        const [px, py] = toPx(arrow.x, arrow.y);
        triangle(ctx, px, py, -arrow.angle, a.size === 'boss' ? 18 : a.size === 'big' ? 13 : 8, color);
      }
    }
    this.drawRadar(f, h);
  }

  private drawRadar(f: ThreatFrame, h: number): void {
    const { ctx } = this;
    const R = RADAR_SIZE_PX / 2;
    const cx = 16 + R;
    const cy = h - 40 - R;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(6, 10, 20, 0.55)';
    ctx.strokeStyle = 'rgba(160, 200, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R / 2, 0, Math.PI * 2);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.stroke();
    const at = (p: Vec3) => {
      const b = radarBlip(f.shipPos, f.shipRot, p, RADAR_RANGE);
      return { x: cx + b.x * R, y: cy - b.y * R, above: b.elevation >= 0, clamped: b.clamped };
    };
    const earth = at(EARTH_POS);
    ctx.fillStyle = '#5fa8ff';
    ctx.beginPath();
    ctx.arc(earth.x, earth.y, earth.clamped ? 4 : Math.max(4, (EARTH_RADIUS / RADAR_RANGE) * R), 0, Math.PI * 2);
    ctx.fill();
    const ms = at(MOTHERSHIP_POS);
    ctx.fillStyle = '#c8d0dc';
    ctx.fillRect(ms.x - 3, ms.y - 3, 6, 6);
    // The space station (P18): a green diamond.
    const st = at(STATION_POS);
    ctx.fillStyle = '#5dff9a';
    ctx.beginPath();
    ctx.moveTo(st.x, st.y - 4);
    ctx.lineTo(st.x + 4, st.y);
    ctx.lineTo(st.x, st.y + 4);
    ctx.lineTo(st.x - 4, st.y);
    ctx.closePath();
    ctx.fill();
    // Perk pickups (P27 follow-up): small squares in the perk's colour.
    for (const p of f.pickups ?? []) {
      const b = at(p.pos);
      ctx.fillStyle = `rgb(${p.rgb.map((c) => String(Math.round(c * 255))).join(',')})`;
      ctx.fillRect(b.x - 2.5, b.y - 2.5, 5, 5);
    }
    for (const a of f.asteroids) {
      const b = at(a.pos);
      const size = a.size === 'boss' ? 5.5 : a.size === 'big' ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, size, 0, Math.PI * 2);
      const color = URGENCY_COLORS[urgency(timeToImpact(a))];
      if (b.above) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    }
    // The ship: a small chevron at the centre, nose up.
    ctx.fillStyle = '#9fffc8';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.65);
  ctx.lineTo(-size * 0.7, -size * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function brackets(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, dashed: boolean): void {
  const l = r * 0.45;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.globalAlpha = 0.65;
  ctx.beginPath();
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const) {
    const cx = x + sx * r;
    const cy = y + sy * r;
    ctx.moveTo(cx, cy - sy * l);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - sx * l, cy);
  }
  ctx.stroke();
  ctx.restore();
}
