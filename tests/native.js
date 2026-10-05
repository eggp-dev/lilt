// Run ONLY via scripts/test-native.sh in a private bus + disposable XDG dirs.
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Scripting from "resource:///org/gnome/shell/ui/scripting.js";
export const METRICS = {};
const results = [];
const root = GLib.getenv("LILT_ROOT");
function check(condition, message) {
  if (!condition) throw Error(message);
  results.push(message);
  console.log(`LILT PASS: ${message}`);
}
async function waitFor(fn) {
  for (let i = 0; i < 60; i++) {
    if (fn()) return;
    await Scripting.sleep(50);
  }
  throw Error("Timed out awaiting condition");
}
async function screenshot(name) {
  const file = Gio.File.new_for_path(`${root}/evidence/${name}.png`),
    stream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);
  await new Shell.Screenshot().screenshot(false, stream);
  stream.close(null);
}
async function record(app, icon) {
  if (GLib.getenv("LILT_RECORD") !== "1") return;
  GLib.mkdir_with_parents(`${root}/evidence/frames`, 0o755);
  app._state.expanded = false;
  app._refresh();
  const events = [
    [1100, () => Main.osdWindowManager.showAll(icon, null, 0.52, 1)],
    [1260, () => Main.osdWindowManager.showAll(icon, null, 0.6, 1)],
    [1420, () => Main.osdWindowManager.showAll(icon, null, 0.68, 1)],
    [1580, () => Main.osdWindowManager.showAll(icon, null, 0.76, 1)],
    [3750, () => app._surface.compactButton.emit("clicked", 1)],
    [
      5900,
      () => {
        app._surface.close.emit("clicked", 1);
        Main.osdWindowManager.showAll(
          Gio.ThemedIcon.new("audio-volume-muted-symbolic"),
          null,
          0.76,
          1,
        );
      },
    ],
  ];
  const start = GLib.get_monotonic_time(),
    frames = [];
  let eventIndex = 0;
  while (GLib.get_monotonic_time() - start < 8800000) {
    const tick = GLib.get_monotonic_time(),
      elapsed = (tick - start) / 1000;
    while (eventIndex < events.length && elapsed >= events[eventIndex][0]) {
      events[eventIndex++][1]();
    }
    const name = `frames/${String(frames.length).padStart(4, "0")}`;
    frames.push({ file: `${name}.png`, time: (tick - start) / 1e6 });
    await screenshot(name);
    await Scripting.sleep(
      Math.max(1, 33 - (GLib.get_monotonic_time() - tick) / 1000),
    );
  }
  let manifest = "";
  for (let i = 0; i < frames.length; i++) {
    manifest += `file '${frames[i].file}'\nduration ${i + 1 < frames.length ? frames[i + 1].time - frames[i].time : 0.033}\n`;
  }
  manifest += `file '${frames.at(-1).file}'\n`;
  GLib.file_set_contents(`${root}/evidence/native-motion.concat`, manifest);
  GLib.file_set_contents(
    `${root}/evidence/frame-timing.json`,
    JSON.stringify(frames),
  );
}
export async function run() {
  Main.overview.hide();
  await Scripting.sleep(700);
  const ext = Main.extensionManager.lookup("lilt@eggp-dev.github.io");
  check(
    !!ext?.stateObj?._surface,
    "Extension enabled inside isolated GNOME Shell 50.1",
  );
  const app = ext.stateObj;
  const original = app._hook.slots.find((s) => s.name === "show").original;
  const originalAll = app._hook.slots.find(
    (s) => s.name === "showAll",
  ).original;
  const icon = Gio.ThemedIcon.new("audio-volume-high-symbolic");
  Main.osdWindowManager.showAll(icon, "Fixture speaker", 0.64, 1);
  await Scripting.sleep(550);
  check(
    app._state.mode(app._now()) === "volume",
    "GNOME 50 showAll routes volume to Lilt",
  );
  check(
    !Main.osdWindowManager._osdWindows.some((w) => w.visible),
    "No duplicate native OSD",
  );
  check(
    app._surface.actor.opacity > 250 &&
      Math.abs(app._surface.actor.width - 344) < 1,
    "Native animation settles at visible full width",
  );
  await screenshot("native-volume");
  for (let i = 0; i < 30; i++) {
    Main.osdWindowManager.showOne(0, icon, null, i / 40, 1);
    await Scripting.sleep(8);
  }
  check(
    Main.uiGroup.get_children().filter((c) => c.name === "lilt-surface")
      .length === 1,
    "30 rapid inputs use exactly one surface",
  );
  await Scripting.sleep(1500);
  check(
    app._state.mode(app._now()) === "hidden",
    "Temporary volume expires to hidden",
  );
  Main.osdWindowManager.showAll(
    Gio.ThemedIcon.new("display-brightness-symbolic"),
    null,
    0.5,
    1,
  );
  await Scripting.sleep(200);
  check(
    Main.osdWindowManager._osdWindows.some((w) => w.visible),
    "Brightness remains on the original GNOME OSD",
  );
  Main.osdWindowManager.hideAll();
  // An MPRIS fixture exists only on this private D-Bus. No host player is accessed.
  const xml =
    '<node><interface name="org.mpris.MediaPlayer2.Player"><method name="PlayPause"/><method name="Next"/><method name="Previous"/><property name="PlaybackStatus" type="s" access="read"/><property name="Metadata" type="a{sv}" access="read"/><property name="CanPlay" type="b" access="read"/><property name="CanPause" type="b" access="read"/><property name="CanControl" type="b" access="read"/><property name="CanGoNext" type="b" access="read"/><property name="CanGoPrevious" type="b" access="read"/></interface></node>';
  let calls = 0;
  const fixture = {
    PlaybackStatus: "Playing",
    Metadata: {
      "xesam:title": new GLib.Variant("s", "Soft landing"),
      "xesam:artist": new GLib.Variant("as", ["Lilt Sessions"]),
      "mpris:artUrl": new GLib.Variant(
        "s",
        `file://${root}/tests/fixtures/cover.png`,
      ),
    },
    CanPlay: true,
    CanPause: true,
    CanControl: true,
    CanGoNext: true,
    CanGoPrevious: true,
    PlayPause() {
      calls++;
    },
    Next() {
      calls++;
    },
    Previous() {
      calls++;
    },
  };
  const exported = Gio.DBusExportedObject.wrapJSObject(xml, fixture);
  exported.export(Gio.DBus.session, "/org/mpris/MediaPlayer2");
  const owner = Gio.bus_own_name_on_connection(
    Gio.DBus.session,
    "org.mpris.MediaPlayer2.LiltFixture",
    Gio.BusNameOwnerFlags.NONE,
    null,
    null,
  );
  await waitFor(() => app._state.player?.title === "Soft landing");
  await Scripting.sleep(550);
  check(
    app._state.mode(app._now()) === "compact",
    "Real private-bus MPRIS discovery displays compact media",
  );
  await screenshot("native-compact");
  app._state.expanded = true;
  app._refresh();
  await Scripting.sleep(550);
  await screenshot("native-media");
  check(app._media.control("PlayPause"), "MPRIS transport honors capability");
  await waitFor(() => calls === 1);
  check(calls === 1, "PlayPause reaches the private-bus player");
  app._media.control("Next");
  app._media.control("Previous");
  await waitFor(() => calls === 3);
  check(calls === 3, "Next and Previous reach the private-bus player");
  await record(app, icon);
  app._state.expanded = false;
  Main.osdWindowManager.showAll(
    Gio.ThemedIcon.new("audio-volume-muted-symbolic"),
    null,
    0.64,
    1,
  );
  await Scripting.sleep(500);
  await screenshot("native-muted");
  check(app._state.muted, "Muted speaker icon maps to mute state");
  await Scripting.sleep(1000);
  check(
    app._state.mode(app._now()) === "compact",
    "Volume returns to the same active media player",
  );
  Main.overview.show();
  await Scripting.sleep(200);
  check(!app._surface.actor.visible, "Overview immediately hides media");
  Main.overview.hide();
  await Scripting.sleep(400);
  const theme = St.ThemeContext.get_for_stage(global.stage),
    oldScale = theme.scale_factor;
  theme.scale_factor = 2;
  await Scripting.sleep(200);
  check(
    app._surface.actor.width > 530,
    "Native theme scale 2 doubles the compact surface",
  );
  await screenshot("native-scale-2");
  theme.scale_factor = oldScale;
  await Scripting.sleep(200);
  const launcher = new Gio.SubprocessLauncher({
    flags: Gio.SubprocessFlags.NONE,
  });
  launcher.setenv("WAYLAND_DISPLAY", "gnome-shell-test-display", true);
  launcher.setenv("GDK_BACKEND", "wayland", true);
  const fixtureProcess = launcher.spawnv([
    "gjs",
    "-m",
    `${root}/tests/fullscreen-fixture.js`,
  ]);
  await waitFor(() =>
    global
      .get_window_actors()
      .some((a) => a.meta_window.title === "Lilt isolated fullscreen fixture"),
  );
  const window = global
    .get_window_actors()
    .map((a) => a.meta_window)
    .find((w) => w.title === "Lilt isolated fullscreen fixture");
  check(!!window, "Isolated fullscreen fixture window created");
  window.make_fullscreen();
  await waitFor(
    () => Main.layoutManager.monitors[window.get_monitor()].inFullscreen,
  );
  await Scripting.sleep(150);
  check(!app._surface.actor.visible, "Actual fullscreen window hides media");
  Main.osdWindowManager.showAll(icon, null, 0.4, 1);
  await Scripting.sleep(150);
  check(
    Main.osdWindowManager._osdWindows.some((w) => w.visible),
    "Fullscreen volume falls back to GNOME OSD",
  );
  window.unmake_fullscreen();
  fixtureProcess.force_exit();
  Main.osdWindowManager.hideAll();
  await Scripting.sleep(300);
  Main.sessionMode.pushMode("unlock-dialog");
  await Scripting.sleep(300);
  check(
    !Main.uiGroup.get_children().some((c) => c.name === "lilt-surface"),
    "Isolated unlock-dialog mode removes the extension surface",
  );
  Main.sessionMode.popMode("unlock-dialog");
  await waitFor(() => app._surface && app._state.player);
  await Scripting.sleep(100);
  check(
    app._state.mode(app._now()) === "compact",
    "Leaving unlock-dialog rediscovers current media",
  );
  app._settings.set_boolean("reduced-motion", true);
  Main.osdWindowManager.showAll(icon, null, 0.4, 1);
  await Scripting.sleep(80);
  check(
    app._surface.motion.values.width.value === 344,
    "Reduced motion reaches final shape immediately",
  );
  app._settings.set_boolean("reduced-motion", false);
  Main.osdWindowManager.showAll(icon, null, 0.7, 1);
  Gio.bus_unown_name(owner);
  exported.unexport();
  await waitFor(() => app._state.player === null);
  await Scripting.sleep(1500);
  check(
    app._state.mode(app._now()) === "hidden",
    "Player disappearance during OSD returns to hidden",
  );
  app._settings.set_boolean("replace-volume-osd", false);
  await Scripting.sleep(30);
  check(
    Main.osdWindowManager.show === original &&
      Main.osdWindowManager.showAll === originalAll,
    "Disabling own volume display restores both original methods",
  );
  Main.osdWindowManager.showAll(icon, null, 0.5, 1);
  await Scripting.sleep(150);
  check(
    Main.osdWindowManager._osdWindows.some((w) => w.visible),
    "Restored GNOME volume OSD is visible",
  );
  await screenshot("native-restored-osd");
  Main.osdWindowManager.hideAll();
  app._settings.set_boolean("replace-volume-osd", true);
  await Scripting.sleep(20);
  app.disable();
  check(
    Main.osdWindowManager.show === original,
    "Extension disable restores exact original hook",
  );
  check(
    !Main.uiGroup.get_children().some((c) => c.name === "lilt-surface"),
    "Disable destroys surface",
  );
  check(
    app._timer === 0 && app._signals.length === 0,
    "Disable clears timers and signal subscriptions",
  );
  app.enable();
  app.enable();
  check(
    Main.uiGroup.get_children().filter((c) => c.name === "lilt-surface")
      .length === 1,
    "Repeated enable does not duplicate hooks or actors",
  );
  app.disable();
  GLib.file_set_contents(
    `${root}/evidence/native-results.json`,
    JSON.stringify(
      {
        environment:
          "GNOME Shell 50.1 headless, private D-Bus, disposable XDG settings",
        passed: results,
      },
      null,
      2,
    ),
  );
}
