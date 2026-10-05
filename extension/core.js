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
  hidden: { width: 112, height: 32, opacity: 0, offset: -10 },
  compact: { width: 272, height: 60, opacity: 1, offset: 0 },
  volume: { width: 344, height: 96, opacity: 1, offset: 0 },
  media: { width: 384, height: 136, opacity: 1, offset: 0 },
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
  volume(level, muted, now, maxLevel = 1) {
    this.level = clamp(level, 0, Math.max(1, maxLevel));
    this.muted = muted;
    this.maxLevel = Math.max(1, maxLevel);
    this.volumeUntil = now + MOTION.volumeHold;
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
  constructor(value) {
    this.value = value;
    this.velocity = 0;
    this.target = value;
  }
  advance(seconds, reduced = false) {
    if (reduced) {
      this.value = this.target;
      this.velocity = 0;
      return false;
    }
    const t = clamp(seconds, 0, 0.1),
      w = Math.sqrt(MOTION.stiffness / MOTION.mass),
      a = MOTION.damping / (2 * MOTION.mass);
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
  }
  target(mode) {
    for (const [k, v] of Object.entries(SHAPES[mode]))
      this.values[k].target = v;
  }
  advance(dt, reduced = false) {
    let active = false;
    for (const s of Object.values(this.values))
      active = s.advance(dt, reduced) || active;
    return active;
  }
  snapshot() {
    return Object.fromEntries(
      Object.entries(this.values).map(([k, s]) => [k, s.value]),
    );
  }
}
export function placement(monitors, preferred, width, height, scale = 1) {
  const m = monitors[preferred] ?? monitors[0];
  if (!m) return null;
  const safeScale = Math.max(0.5, scale);
  const w = Math.min(width * safeScale, m.width - 24);
  return {
    x: Math.round(m.x + (m.width - w) / 2),
    y: Math.round(m.y + Math.max(72 * safeScale, m.height * 0.085)),
    width: w,
    height: height * safeScale,
  };
}
