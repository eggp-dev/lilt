// SPDX-License-Identifier: MIT
// Platform-free behavior shared by GJS and the visual rehearsal.
export const MOTION = Object.freeze({
  stiffness: 400,
  damping: 36,
  mass: 1,
  volumeHold: 1400,
  pausedHold: 5000,
});
export const SHAPES = Object.freeze({
  hidden: {
    width: 2,
    height: 2,
    presence: 0,
    offset: -6,
    shift: -18,
    roundness: 1,
  },
  compact: {
    width: 272,
    height: 60,
    presence: 1,
    offset: 0,
    shift: 0,
    roundness: 1,
  },
  volume: {
    width: 344,
    height: 96,
    presence: 1,
    offset: 0,
    shift: 0,
    roundness: 0.78,
  },
  media: {
    width: 384,
    height: 136,
    presence: 1,
    offset: 0,
    shift: 0,
    roundness: 0.64,
  },
});
export const clamp = (v, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
export function cleanText(value, fallback = "") {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 240)
    : fallback;
}
export function normalizePlayer(raw) {
  if (!raw || !["Playing", "Paused"].includes(raw.status)) return null;
  return {
    ...raw,
    title: cleanText(raw.title, "Untitled"),
    artist: cleanText(raw.artist, "Unknown artist"),
  };
}
export function selectPlayer(players, previousId) {
  const candidates = players.filter((p) => normalizePlayer(p));
  const playing = candidates.filter((p) => p.status === "Playing");
  const pool = playing.length ? playing : candidates;
  return normalizePlayer(
    pool.find((p) => p.id === previousId) ?? pool[0] ?? null,
  );
}
export class SurfaceState {
  constructor() {
    this.player = null;
    this.volumeUntil = 0;
    this.pausedUntil = 0;
    this.expanded = false;
    this.blocked = false;
    this.level = 0;
    this.muted = false;
  }
  media(player, now) {
    const next = normalizePlayer(player);
    if (
      next?.status === "Paused" &&
      (this.player?.status !== "Paused" || this.player?.id !== next.id)
    )
      this.pausedUntil = now + MOTION.pausedHold;
    this.player = next;
    if (!next) {
      this.pausedUntil = 0;
      this.expanded = false;
    }
  }
  volume(level, muted, now, maxLevel = 1, holdMs = MOTION.volumeHold) {
    this.level = clamp(level, 0, Math.max(1, maxLevel));
    this.muted = muted;
    this.maxLevel = Math.max(1, maxLevel);
    this.volumeUntil = now + clamp(holdMs, 600, 4000);
  }
  block(value) {
    this.blocked = value;
    if (value) {
      this.volumeUntil = 0;
      this.expanded = false;
    }
  }
  mode(now) {
    if (this.blocked) return "hidden";
    if (now < this.volumeUntil) return "volume";
    if (
      this.player &&
      (this.player.status === "Playing" ||
        now < this.pausedUntil ||
        this.expanded)
    )
      return this.expanded ? "media" : "compact";
    return "hidden";
  }
  deadline(now) {
    return Math.min(
      ...[
        this.volumeUntil,
        this.player?.status === "Paused" ? this.pausedUntil : 0,
      ].filter((n) => n > now),
      Infinity,
    );
  }
}
// Exact damped oscillator solution: no frame-rate dependent Euler integration,
// and retargeting retains both current position and current velocity.
export class Spring {
  constructor(value, damping = MOTION.damping, stiffness = MOTION.stiffness) {
    this.value = value;
    this.velocity = 0;
    this.target = value;
    this.damping = damping;
    this.stiffness = stiffness;
  }
  advance(seconds, reduced = false) {
    if (reduced) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    const t = clamp(seconds, 0, 0.1),
      w = Math.sqrt(this.stiffness / MOTION.mass),
      a = this.damping / (2 * MOTION.mass);
    const b = Math.sqrt(w * w - a * a),
      x = this.value - this.target,
      c = (this.velocity + a * x) / b;
    const e = Math.exp(-a * t),
      cos = Math.cos(b * t),
      sin = Math.sin(b * t);
    this.value = this.target + e * (x * cos + c * sin);
    this.velocity = e * ((c * b - a * x) * cos + (-x * b - a * c) * sin);
    if (
      Math.abs(this.value - this.target) < 0.015 &&
      Math.abs(this.velocity) < 0.035
    ) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    return true;
  }
}
export class SurfaceMotion {
  constructor() {
    this.values = Object.fromEntries(
      Object.entries(SHAPES.hidden).map(([k, v]) => [k, new Spring(v)]),
    );
    // A slower width echo gives the two ends different curvature while moving.
    // Both oscillators remain continuous when interrupted; no timed phase queue.
    this.echo = new Spring(SHAPES.hidden.width, 28, 300);
    this.mode = "hidden";
  }
  target(mode) {
    this.mode = mode;
    for (const [k, v] of Object.entries(SHAPES[mode]))
      this.values[k].target = v;
    this.echo.target = SHAPES[mode].width;
    // An almost critically damped exit can contract all the way to a bead.
    // Expansion gets one controlled recoil; numeric feedback keeps its own spring.
    this.values.width.damping = mode === "hidden" ? 36 : 27;
    this.values.height.damping = mode === "hidden" ? 36 : 30;
    this.values.roundness.damping = 28;
  }
  advance(dt, reduced = false) {
    let active = false;
    for (const s of Object.values(this.values))
      active = s.advance(dt, reduced) || active;
    active = this.echo.advance(dt, reduced) || active;
    return active;
  }
  snapshot() {
    const v = Object.fromEntries(
      Object.entries(this.values).map(([k, s]) => [k, s.value]),
    );
    // Bounds are for drawing only: never discard spring momentum on reversal.
    v.width = Math.max(2, v.width);
    v.height = Math.max(2, v.height);
    // Let a bead form before lateral inflation. This continuous mapping also
    // gathers an exiting body into a round droplet, without a delay or callback.
    const t = clamp((v.presence - 0.12) / 0.52);
    const inflation = t * t * (3 - 2 * t);
    v.width = v.height + (v.width - v.height) * inflation;
    v.roundness = 1 + (v.roundness - 1) * inflation;
    v.opacity = clamp(v.presence * 4);
    v.lag =
      clamp((this.values.width.value - this.echo.value) / 140, -0.35, 0.35) *
      inflation;
    return v;
  }
}
export function placement(
  monitors,
  preferred,
  width,
  height,
  scale = 1,
  topSpacing = 72,
) {
  const m = monitors[preferred] ?? monitors[0];
  if (!m) return null;
  const safeScale = Math.max(0.5, scale);
  const w = Math.min(width * safeScale, m.width - 24);
  return {
    x: Math.round(m.x + (m.width - w) / 2),
    y: Math.round(
      m.y +
        Math.min(
          clamp(topSpacing, 48, 240) * safeScale,
          Math.max(0, m.height - height * safeScale - 12),
        ),
    ),
    width: w,
    height: height * safeScale,
  };
}
