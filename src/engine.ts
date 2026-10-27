import { AsciiRenderer } from "./renderer";
import { World, type SharkSpec } from "./world";

const STEP = 1 / 60;
const MAX_STEPS = 4;

export interface OceanOptions {
  sharks?: SharkSpec[];
  /** Frame-rate cap. 0 = uncapped (follows rAF). */
  fps?: number;
  /** Let the pointer push fish around. */
  pointer?: boolean;
  /** Splash where the pointer clicks. */
  splash?: boolean;
  /** Paint no background: let the page show the water through. */
  transparent?: boolean;
  /** Fish population; omit for the area-based default. */
  fishCount?: number;
  /** Fish glyph size multiplier, independent of the sharks. */
  fishScale?: number;
  /** Detect idle and drop to 12fps (default on). */
  idleThrottle?: boolean;
}

/**
 * Wires World + AsciiRenderer to a canvas: fixed-timestep loop, resize,
 * pointer input, pausing off-screen / tab-hidden, and prefers-reduced-motion.
 *
 * Changes from upstream: frame-rate cap, tab-visibility pause, optional
 * pointer input, and a guard so a missing canvas never throws.
 */
export class OceanEngine {
  private world: World;
  private renderer: AsciiRenderer;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private visible = true;
  private hidden = false;
  private lastFrame = 0;
  private lastInput = 0;
  private idleThrottle = true;
  private fps: number;
  private pointerEnabled: boolean;
  private splashEnabled: boolean;
  private sharkScale = 1;
  private stoke = 0;
  private stokeTarget = 0;
  private reducedMotion: MediaQueryList;
  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, options: OceanOptions = {}) {
    this.world = new World(options.sharks, options.fishCount);
    this.renderer = new AsciiRenderer(canvas, { transparent: options.transparent === true });
    this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
    this.renderer.setFishScale(options.fishScale === undefined ? 1 : options.fishScale);
    this.fps = options.fps === undefined ? 30 : options.fps;
    this.sharkScale =
      options.sharkScale !== undefined && Number.isFinite(options.sharkScale) && options.sharkScale > 0
        ? options.sharkScale
        : 1;
    this.pointerEnabled = options.pointer !== false;
    this.splashEnabled = options.splash !== false;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.lastInput = performance.now();
    this.idleThrottle = options.idleThrottle !== false;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.schedule();
    });
    this.intersectionObserver.observe(canvas);

    this.reducedMotion.addEventListener("change", this.onMotionPreference);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onWindowBlur);
    window.addEventListener("focus", this.onWindowFocus);
    if (this.pointerEnabled) {
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
      window.addEventListener("blur", this.onPointerLeave);
    }

    this.resize();
    if (this.sharkScale !== 1) this.world.scaleSharks(this.sharkScale);
    // Canvas text can't trigger a webfont load; once the mono face is in, redraw.
    document.fonts?.load(`600 16px ${getComputedStyle(canvas).fontFamily}`).then(() => {
      if (!this.disposed && this.reducedMotion.matches) this.drawStill();
    });
    this.schedule();
  }

  /** Live-tunable knobs (no remount needed). */
  setFps(fps: number) {
    this.fps = Math.max(0, fps);
  }

  setFishScale(scale: number) {
    this.renderer.setFishScale(scale);
  }

  /** Turn the idle down-clock on or off at runtime. */
  setIdleThrottle(on: boolean) {
    this.idleThrottle = on === true;
    if (!this.idleThrottle) this.schedule();
  }

  /** 0..1 arousal target; smoothed inside the frame loop. */
  setStoke(value: number) {
    this.stokeTarget = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  }

  /** Live shark size; stretches around each snout without a rebuild. */
  setSharkScale(scale: number) {
    const next = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const ratio = next / this.sharkScale;
    this.sharkScale = next;
    this.world.scaleSharks(ratio);
  }

  setPointerEnabled(enabled: boolean) {
    if (enabled === this.pointerEnabled) return;
    this.pointerEnabled = enabled;
    if (enabled) {
      window.addEventListener("pointermove", this.onPointerMove, { passive: true });
      window.addEventListener("pointerdown", this.onPointerDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", this.onPointerLeave);
      window.addEventListener("blur", this.onPointerLeave);
    } else {
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerdown", this.onPointerDown);
      document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
      window.removeEventListener("blur", this.onPointerLeave);
      this.world.pointer.active = false;
    }
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    this.reducedMotion.removeEventListener("change", this.onMotionPreference);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onWindowBlur);
    window.removeEventListener("focus", this.onWindowFocus);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerDown);
    document.documentElement.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("blur", this.onPointerLeave);
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    // Cap by a pixel budget, not a flat 2: a 2560x1438 window at dpr 2 is
    // 14.7M canvas pixels redrawn 30 times a second, and the sea is soft
    // anyway. 7M keeps it crisp without melting the GPU.
    const raw = Math.min(window.devicePixelRatio || 1, 2);
    const budget = 7_000_000;
    const area = Math.max(1, rect.width * rect.height);
    const dpr = Math.max(1, Math.min(raw, Math.sqrt(budget / area)));
    this.renderer.resize(rect.width, rect.height, dpr);
    this.world.resize(rect.width, rect.height, this.renderer.cellWidth, this.renderer.cellHeight);
    if (this.reducedMotion.matches) this.drawStill();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || !this.visible || this.hidden || this.reducedMotion.matches) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    // Nothing is happening: the conversation is idle and the pointer has not
    // moved for a while. Halve the cadence instead of animating a still pond
    // at full rate. Any input or arousal wakes it back up immediately.
    const idle = this.idleThrottle && this.stokeTarget < 0.02 && now - this.lastInput > 4000;
    const fps = idle ? Math.min(this.fps, 12) : this.fps;
    if (fps > 0 && now - this.lastFrame < 1000 / fps - 0.6) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    this.lastFrame = now;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    // Ease toward the target so the sea swells instead of snapping.
    this.stoke += (this.stokeTarget - this.stoke) * Math.min(1, dt * 5);
    this.renderer.setStoke(this.stoke);
    this.world.setArousal(this.stoke);
    const stepSize = STEP * (1 + this.stoke * 0.55);

    this.acc += dt;
    let steps = 0;
    while (this.acc >= stepSize && steps < MAX_STEPS) {
      this.world.step(stepSize);
      this.acc -= stepSize;
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;
    this.renderer.render(this.world, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  /** Reduced motion: let the ecosystem settle, then show a single frame. */
  private drawStill() {
    this.renderer.setStoke(this.stoke);
    this.world.setArousal(this.stoke);
    if (this.world.time < 4) {
      for (let i = 0; i < 240; i++) this.world.step(STEP);
    }
    this.renderer.render(this.world, STEP);
  }

  private onMotionPreference = () => {
    if (this.reducedMotion.matches) {
      cancelAnimationFrame(this.raf);
      this.drawStill();
    } else {
      this.schedule();
    }
  };

  private onWindowBlur = () => {
    this.hidden = true;
    cancelAnimationFrame(this.raf);
  };

  private onWindowFocus = () => {
    this.hidden = document.visibilityState === "hidden";
    this.lastInput = performance.now();
    this.schedule();
  };

  private onVisibility = () => {
    this.hidden = document.visibilityState === "hidden";
    if (this.hidden) cancelAnimationFrame(this.raf);
    else this.schedule();
  };

  private toLocal(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
    return { x, y, inside };
  }

  private onPointerMove = (e: PointerEvent) => {
    this.lastInput = performance.now();
    const { x, y, inside } = this.toLocal(e);
    const p = this.world.pointer;
    p.x = x;
    p.y = y;
    p.active = inside && e.pointerType !== "touch";
  };

  private onPointerDown = (e: PointerEvent) => {
    this.lastInput = performance.now();
    const { x, y, inside } = this.toLocal(e);
    if (inside && this.splashEnabled && !this.reducedMotion.matches) this.world.splash(x, y);
  };

  private onPointerLeave = () => {
    this.world.pointer.active = false;
  };
}
