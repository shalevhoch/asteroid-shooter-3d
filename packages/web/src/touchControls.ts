/**
 * Touch controls (P15), the DOM part: a floating virtual stick on the left, a throttle slider on the right edge, fire,
 * rocket and turbo buttons, and a pause button. Pointer events, so several fingers work at once.
 */
import { THROTTLE_MAX } from '@asteroid/sim';
import { NO_TOUCH, STICK_RADIUS, sliderLevel, stickAxes, type TouchFrame } from './touch.js';

const div = (cls: string, parent: HTMLElement, text = ''): HTMLDivElement => {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  parent.appendChild(d);
  return d;
};

/** Pointer capture keeps a finger on its control when it slides off; synthetic events (tests) can't be captured. */
const capture = (el: HTMLElement, id: number): void => {
  try {
    el.setPointerCapture(id);
  } catch {
    // Not a live pointer.
  }
};

export class TouchControls {
  readonly root: HTMLDivElement;
  private stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  private throttleTarget: number | null = null;
  private sliding = -1;
  private fire = false;
  private turbo = false;
  private rocketTaps = 0;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly thumb: HTMLDivElement;

  constructor(parent: HTMLElement, onPause: () => void) {
    this.root = div('touch', parent);
    const zone = div('t-stick-zone', this.root);
    this.base = div('t-stick-base', this.root);
    this.knob = div('t-stick-knob', this.base);
    zone.addEventListener('pointerdown', (e) => {
      if (this.stick.id !== -1) return;
      capture(zone, e.pointerId);
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
      this.base.style.left = `${String(e.clientX)}px`;
      this.base.style.top = `${String(e.clientY)}px`;
      this.base.classList.add('on');
      this.drawKnob();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick.x = e.clientX;
      this.stick.y = e.clientY;
      this.drawKnob();
    });
    const endStick = (e: PointerEvent) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
      this.base.classList.remove('on');
    };
    zone.addEventListener('pointerup', endStick);
    zone.addEventListener('pointercancel', endStick);

    const slider = div('t-slider', this.root);
    for (let i = THROTTLE_MAX; i >= 0; i--) div('t-mark', slider, String(i));
    this.thumb = div('t-thumb', slider);
    const setLevel = (e: PointerEvent) => {
      const r = slider.getBoundingClientRect();
      this.throttleTarget = sliderLevel(1 - (e.clientY - r.top) / r.height);
      this.drawThumb();
    };
    slider.addEventListener('pointerdown', (e) => {
      capture(slider, e.pointerId);
      this.sliding = e.pointerId;
      setLevel(e);
    });
    slider.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.sliding) setLevel(e);
    });
    const endSlide = (e: PointerEvent) => {
      if (e.pointerId === this.sliding) this.sliding = -1;
    };
    slider.addEventListener('pointerup', endSlide);
    slider.addEventListener('pointercancel', endSlide);

    this.hold(div('t-btn t-fire', this.root, 'FIRE'), (on) => (this.fire = on));
    this.hold(div('t-btn t-turbo', this.root, 'TURBO'), (on) => (this.turbo = on));
    const rocket = div('t-btn t-rocket', this.root, 'ROCKET');
    rocket.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.rocketTaps = Math.min(this.rocketTaps + 1, 3);
      rocket.classList.add('on');
    });
    rocket.addEventListener('pointerup', () => { rocket.classList.remove('on'); });
    const pause = div('t-pause', this.root, 'Ⅱ');
    pause.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onPause();
    });
    this.root.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    this.drawThumb();
  }

  private hold(el: HTMLElement, set: (on: boolean) => void): void {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      capture(el, e.pointerId);
      set(true);
      el.classList.add('on');
    });
    const off = () => {
      set(false);
      el.classList.remove('on');
    };
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
  }

  private drawKnob(): void {
    const a = stickAxes(this.stick.x - this.stick.ox, this.stick.y - this.stick.oy);
    const d = Math.hypot(this.stick.x - this.stick.ox, this.stick.y - this.stick.oy);
    const k = d > STICK_RADIUS ? STICK_RADIUS / d : 1;
    this.knob.style.transform = `translate(${String((this.stick.x - this.stick.ox) * k)}px, ${String((this.stick.y - this.stick.oy) * k)}px)`;
    this.knob.classList.toggle('live', a.x !== 0 || a.y !== 0);
  }

  private drawThumb(): void {
    this.thumb.style.bottom = `${String(((this.throttleTarget ?? 0) / THROTTLE_MAX) * 100)}%`;
    this.thumb.classList.toggle('unset', this.throttleTarget === null);
  }

  show(on: boolean): void {
    this.root.style.display = on ? 'block' : 'none';
  }

  /** Mirrors the ship's throttle on the slider until the player first touches it (keyboard or wheel changes). */
  syncThrottle(level: number): void {
    if (this.throttleTarget !== null) return;
    this.thumb.style.bottom = `${String((level / THROTTLE_MAX) * 100)}%`;
  }

  /** This tick's touch state; spends one rocket tap. */
  next(): TouchFrame {
    if (this.root.style.display === 'none') return NO_TOUCH;
    const a = this.stick.id === -1 ? { x: 0, y: 0 } : stickAxes(this.stick.x - this.stick.ox, this.stick.y - this.stick.oy);
    const f: TouchFrame = { stickX: a.x, stickY: a.y, throttleTarget: this.throttleTarget, fire: this.fire, turbo: this.turbo, rocketTaps: this.rocketTaps };
    if (this.rocketTaps > 0) this.rocketTaps--;
    return f;
  }

  /** A new run or a resume: release everything and let the slider follow the ship again. */
  reset(): void {
    this.stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
    this.base.classList.remove('on');
    this.throttleTarget = null;
    this.fire = this.turbo = false;
    this.rocketTaps = 0;
    for (const b of this.root.querySelectorAll('.on')) b.classList.remove('on');
    this.drawThumb();
  }
}
