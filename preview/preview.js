import {
  SurfaceState,
  SurfaceMotion,
  Spring,
  clamp,
  SHAPES,
} from "../extension/core.js";
import { contour, contentVisibility } from "../extension/contour.js";
const $ = (id) => document.getElementById(id),
  state = new SurfaceState(),
  motion = new SurfaceMotion(),
  bar = new Spring(0.64);
let level = 0.64,
  muted = false,
  raf = 0,
  last = 0,
  expiry = 0,
  sequence = [],
  reduced = false;
const track = {
  id: "demo",
  title: "Soft landing",
  artist: "Lilt Sessions",
  status: "Playing",
};
const speaker = (m) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5L5 9H2v6h3l5 4z"/>${m ? '<path d="M16 9l6 6m0-6l-6 6"/>' : '<path d="M15 8c3 2 3 6 0 8m3-12c6 4 6 12 0 16"/>'}</svg>`;
function refresh() {
  const mode = state.mode(performance.now());
  $("surface").dataset.mode = mode;
  motion.target(mode);
  for (const id of ["compact", "volume", "media"])
    $(id).classList.toggle("active", id === mode);
  document.body.classList.toggle("playing", state.player?.status === "Playing");
  $("play").textContent = state.player?.status === "Playing" ? "Ⅱ" : "▶";
  $("volume-label").textContent = state.muted ? "Muted" : "Volume";
  $("percentage").innerHTML = state.muted
    ? "0<span>%</span>"
    : `${Math.round(state.level * 100)}<span>%</span>`;
  $("speaker").innerHTML = speaker(state.muted);
  bar.target = state.muted ? 0 : state.level;
  clearTimeout(expiry);
  const deadline = state.deadline(performance.now());
  if (Number.isFinite(deadline))
    expiry = setTimeout(refresh, Math.max(1, deadline - performance.now() + 1));
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
}
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  const a = motion.advance(dt, reduced),
    b = bar.advance(dt, reduced),
    v = motion.snapshot();
  Object.assign($("surface").style, {
    width: `${v.width}px`,
    height: `${v.height}px`,
    opacity: clamp(v.opacity),
    transform: `translate(calc(-50% + ${v.shift}px),${v.offset}px)`,
    pointerEvents: v.opacity < 0.05 ? "none" : "auto",
  });
  $("body").setAttribute("viewBox", `0 0 ${v.width} ${v.height}`);
  $("contour").setAttribute(
    "d",
    contour(v.width, v.height, v.roundness, v.lag)
      .map((c) => c.join(" "))
      .join(" "),
  );
  const mode = state.mode(now);
  for (const id of ["compact", "volume", "media"]) {
    Object.assign($(id).style, {
      width: `${SHAPES[id].width}px`,
      height: `${SHAPES[id].height}px`,
      left: `${(v.width - SHAPES[id].width) / 2}px`,
      top: `${(v.height - SHAPES[id].height) / 2}px`,
      opacity: mode === id ? contentVisibility(v, SHAPES[id]) : 0,
    });
  }
  $("fill").style.width = `${clamp(bar.value) * 100}%`;
  raf = a || b ? requestAnimationFrame(frame) : 0;
}
function volume(delta = 0) {
  level = clamp(level + delta);
  if (delta) muted = false;
  state.volume(level, muted, performance.now());
  refresh();
}
function music() {
  state.media(
    {
      ...track,
      status: state.player?.status === "Playing" ? "Paused" : "Playing",
    },
    performance.now(),
  );
  refresh();
}
function stopSequence() {
  sequence.forEach(clearTimeout);
  sequence = [];
}
function demo() {
  stopSequence();
  state.media(null, performance.now());
  state.volumeUntil = 0;
  state.expanded = false;
  refresh();
  const steps = [
    [
      400,
      () => {
        state.media(track, performance.now());
        refresh();
      },
    ],
    [2000, () => volume(0)],
    [2150, () => volume(0.08)],
    [2300, () => volume(0.08)],
    [2450, () => volume(-0.04)],
    [
      4650,
      () => {
        state.expanded = true;
        refresh();
      },
    ],
    [
      6700,
      () => {
        state.expanded = false;
        muted = true;
        volume(0);
      },
    ],
    [
      8950,
      () => {
        state.media(null, performance.now());
        refresh();
      },
    ],
  ];
  sequence = steps.map(([ms, fn]) => setTimeout(fn, ms));
}
$("demo").onclick = demo;
$("music").onclick = music;
$("play").onclick = (e) => {
  e.stopPropagation();
  music();
};
$("vol-down").onclick = () => volume(-0.06);
$("vol-up").onclick = () => volume(0.06);
$("mute").onclick = () => {
  muted = !muted;
  volume(0);
};
$("remove").onclick = () => {
  stopSequence();
  state.media(null, performance.now());
  refresh();
};
$("surface").onclick = () => {
  if (state.player && state.mode(performance.now()) !== "volume") {
    state.expanded = !state.expanded;
    refresh();
  }
};
for (const id of ["next", "previous"])
  $(id).onclick = (e) => {
    e.stopPropagation();
    track.title =
      track.title === "Soft landing" ? "Morning tide" : "Soft landing";
    document
      .querySelectorAll(".song")
      .forEach((el) => (el.textContent = track.title));
    state.media(
      { ...track, status: state.player?.status ?? "Playing" },
      performance.now(),
    );
    refresh();
  };
const preference = matchMedia("(prefers-reduced-motion: reduce)");
function setReduced(value) {
  reduced = value;
  $("reduced").checked = value;
  document.body.classList.toggle("reduced", value);
  refresh();
}
$("reduced").onchange = () => setReduced($("reduced").checked);
preference.onchange = () => setReduced(preference.matches);
setReduced(preference.matches);
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  if (e.key === "ArrowUp") volume(0.06);
  if (e.key === "ArrowDown") volume(-0.06);
  if (e.key.toLowerCase() === "m") $("mute").click();
  if (e.key.toLowerCase() === "p" || e.key === " ") music();
  if (e.key === "Escape") {
    state.expanded = false;
    refresh();
  }
});
window.lilt = {
  demo,
  volume,
  music,
  state,
  motion,
  refresh,
  setReduced,
  stopSequence,
};
if (new URLSearchParams(location.search).has("capture"))
  document.body.classList.add("capture");
demo();
