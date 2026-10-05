// SPDX-License-Identifier: MIT
// Original liquid contour. Shared path commands for Cairo and the SVG rehearsal.
import { clamp } from "./core.js";

export function contour(width, height, roundness = 1, lag = 0) {
  const w = Math.max(2, width),
    h = Math.max(2, height);
  const x = 0.65,
    y = 0.65;
  const l = clamp(lag, -0.35, 0.35);
  const crown = (Math.min(3, h * 0.045) * Math.abs(l)) / 0.35;
  const r = Math.max(0, Math.min(w - 2 * x, h - 2 * y - 2 * crown) / 2);
  const radius = r * clamp(roundness, 0.5, 1);
  const left = Math.min(r, radius * (1 + l));
  const right = Math.min(r, radius * (1 - l));
  const top = y + crown,
    bottom = h - y - crown;
  const k = 0.5522847498;
  const mix = (a, b, t) => a + (b - a) * t;
  return [
    ["M", x + left, top],
    [
      "C",
      mix(x + left, w - x - right, 0.35),
      y,
      mix(x + left, w - x - right, 0.65),
      y,
      w - x - right,
      top,
    ],
    [
      "C",
      w - x - right + k * right,
      top,
      w - x,
      top + (1 - k) * right,
      w - x,
      top + right,
    ],
    [
      "C",
      w - x,
      mix(top + right, bottom - right, 0.35),
      w - x,
      mix(top + right, bottom - right, 0.65),
      w - x,
      bottom - right,
    ],
    [
      "C",
      w - x,
      bottom - (1 - k) * right,
      w - x - (1 - k) * right,
      bottom,
      w - x - right,
      bottom,
    ],
    [
      "C",
      mix(w - x - right, x + left, 0.35),
      h - y,
      mix(w - x - right, x + left, 0.65),
      h - y,
      x + left,
      bottom,
    ],
    [
      "C",
      x + (1 - k) * left,
      bottom,
      x,
      bottom - (1 - k) * left,
      x,
      bottom - left,
    ],
    [
      "C",
      x,
      mix(bottom - left, top + left, 0.35),
      x,
      mix(bottom - left, top + left, 0.65),
      x,
      top + left,
    ],
    ["C", x, top + (1 - k) * left, x + (1 - k) * left, top, x + left, top],
    ["Z"],
  ];
}

export function contentVisibility(v, target) {
  const fit = Math.min(v.width / target.width, v.height / target.height);
  // Keep full-size labels out of the contracting outline. Reveal them only
  // when the surface has enough room for its fixed-size, undistorted content.
  const t = clamp((fit - 0.85) / 0.13);
  return t * t * (3 - 2 * t);
}
