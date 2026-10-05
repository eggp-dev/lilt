import test from "node:test";
import assert from "node:assert/strict";
import {
  SurfaceState,
  Spring,
  selectPlayer,
  placement,
  cleanText,
} from "../extension/core.js";
import { OsdHook, volumeEvent } from "../extension/hook.js";
const player = {
  id: "one",
  title: "Track",
  artist: "Artist",
  status: "Playing",
};
test("rapid volume events replace one deadline and return to music", () => {
  const s = new SurfaceState();
  s.media(player, 0);
  for (let i = 0; i < 60; i++) s.volume(i / 100, false, i * 20);
  assert.equal(s.mode(2000), "volume");
  assert.equal(s.mode(2581), "compact");
  assert.equal(s.level, 0.59);
});
test("muting and silence without player return to hidden", () => {
  const s = new SurfaceState();
  s.volume(0.5, true, 0);
  assert.equal(s.mode(100), "volume");
  assert.equal(s.muted, true);
  assert.equal(s.mode(1401), "hidden");
});
test("player loss during volume does not resurrect stale media", () => {
  const s = new SurfaceState();
  s.media(player, 0);
  s.expanded = true;
  s.volume(0.6, false, 1);
  s.media(null, 300);
  assert.equal(s.mode(400), "volume");
  assert.equal(s.mode(1402), "hidden");
  assert.equal(s.expanded, false);
});
test("paused metadata changes do not extend the five second grace period", () => {
  const s = new SurfaceState();
  s.media({ ...player, status: "Paused" }, 0);
  s.media({ ...player, status: "Paused", title: "Changed" }, 3000);
  assert.equal(s.mode(4999), "compact");
  assert.equal(s.mode(5001), "hidden");
});
test("lock clears temporary volume and expansion; unlock restores current media", () => {
  const s = new SurfaceState();
  s.media(player, 0);
  s.volume(0.8, false, 10);
  s.expanded = true;
  s.block(true);
  assert.equal(s.mode(11), "hidden");
  s.block(false);
  assert.equal(s.mode(12), "compact");
});
test("player choice prefers playing and is stable among playing players", () => {
  const second = { ...player, id: "two" };
  assert.equal(
    selectPlayer([{ ...player, status: "Paused" }, second], "one").id,
    "two",
  );
  assert.equal(selectPlayer([player, second], "two").id, "two");
  assert.equal(selectPlayer([{ ...player, status: "Stopped" }]), null);
});
test("untrusted metadata is plain bounded text", () => {
  assert.equal(cleanText("hello\nworld\x00"), "hello world ");
  assert.equal(cleanText({}), "");
  assert.equal(cleanText("a".repeat(500)).length, 240);
});
test("spring is frame rate independent and retains momentum on retarget", () => {
  const a = new Spring(112),
    b = new Spring(112);
  a.target = b.target = 344;
  for (let i = 0; i < 30; i++) a.advance(1 / 60);
  for (let i = 0; i < 60; i++) b.advance(1 / 120);
  assert.ok(Math.abs(a.value - b.value) < 1e-9);
  const c = new Spring(272);
  c.target = 344;
  c.advance(0.05);
  const velocity = c.velocity;
  c.target = 272;
  assert.equal(c.velocity, velocity);
  for (let i = 0; i < 120; i++) c.advance(1 / 60);
  assert.equal(c.value, 272);
});
test("reduced motion snaps without residual motion", () => {
  const s = new Spring(0);
  s.target = 344;
  assert.equal(s.advance(0.01, true), false);
  assert.equal(s.value, 344);
  assert.equal(s.velocity, 0);
});
test("monitor geometry respects offsets, scale, removal and narrow screens", () => {
  const ms = [
    { x: -1920, y: 0, width: 1920, height: 1080 },
    { x: 0, y: 0, width: 3840, height: 2160 },
  ];
  assert.equal(placement(ms, 1, 344, 96, 2).width, 688);
  assert.equal(placement(ms, 1, 344, 96, 2).x, 1576);
  assert.ok(placement(ms, 0, 344, 96).x < 0);
  assert.equal(placement([], 0, 344, 96), null);
  assert.equal(
    placement([{ x: 0, y: 0, width: 320, height: 600 }], 2, 344, 96).width,
    296,
  );
});
test("GNOME 50 show and showAll parsing only consumes speaker volume", () => {
  const icon = { get_names: () => ["audio-volume-high-symbolic"] };
  assert.equal(
    volumeEvent(
      "show",
      [icon, "Speaker", { 1: { level: 0.8, maxLevel: 1.5 } }],
      0,
    ).monitor,
    1,
  );
  assert.equal(
    volumeEvent("showAll", [icon, "Speaker", 0.8, 1.5], 0).maxLevel,
    1.5,
  );
  assert.equal(
    volumeEvent("show", [
      { get_names: () => ["display-brightness-symbolic"] },
      null,
      { 0: { level: 0.5 } },
    ]),
    null,
  );
  assert.equal(
    volumeEvent("show", [
      { get_names: () => ["microphone-sensitivity-muted-symbolic"] },
      null,
      { 0: { level: 0 } },
    ]),
    null,
  );
});
test("hook is idempotent and restores exact methods", () => {
  let originalCalls = 0,
    ours = 0;
  const manager = {
    show() {
      originalCalls++;
    },
    showAll() {
      originalCalls++;
    },
  };
  const original = manager.show;
  const hook = new OsdHook(manager, () => {
    ours++;
    return true;
  });
  hook.enable();
  const wrapper = manager.show;
  hook.enable();
  assert.equal(manager.show, wrapper);
  manager.show();
  assert.equal(ours, 1);
  hook.disable();
  assert.equal(manager.show, original);
  manager.show();
  assert.equal(originalCalls, 1);
});
test("hook fails open and respects a later extension wrapper", () => {
  let called = 0;
  const manager = {
    show() {
      called++;
    },
    showAll() {},
  };
  const hook = new OsdHook(manager, () => {
    throw Error("test");
  });
  hook.enable();
  manager.show();
  assert.equal(called, 1);
  const ours = manager.show;
  const later = (...args) => ours(...args);
  manager.show = later;
  hook.disable();
  assert.equal(manager.show, later);
  manager.show();
  assert.equal(called, 2);
});
