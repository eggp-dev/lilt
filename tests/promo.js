// Capture only inside the private Shell launched by scripts/test-native.sh.
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Scripting from "resource:///org/gnome/shell/ui/scripting.js";
export const METRICS = {};

export async function run() {
  const root = GLib.getenv("LILT_ROOT");
  Main.overview.hide();
  await Scripting.sleep(700);
  const app = Main.extensionManager.lookup("lilt@eggp-dev.github.io").stateObj;
  if (!app?._surface) throw Error("Lilt did not enable");
  const output = `${root}/evidence/promo-frames`;
  GLib.mkdir_with_parents(output, 0o755);
  const xml =
    '<node><interface name="org.mpris.MediaPlayer2.Player"><method name="PlayPause"/><method name="Next"/><method name="Previous"/><property name="PlaybackStatus" type="s" access="read"/><property name="Metadata" type="a{sv}" access="read"/><property name="CanPlay" type="b" access="read"/><property name="CanPause" type="b" access="read"/><property name="CanControl" type="b" access="read"/><property name="CanGoNext" type="b" access="read"/><property name="CanGoPrevious" type="b" access="read"/></interface></node>';
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
    PlayPause() {},
    Next() {},
    Previous() {},
  };
  let exported = null,
    owner = 0;
  const volume = (level) =>
    Main.osdWindowManager.showAll(
      Gio.ThemedIcon.new("audio-volume-high-symbolic"),
      null,
      level,
      1,
    );
  const events = [
    [600, () => volume(0.28)],
    [760, () => volume(0.36)],
    [920, () => volume(0.44)],
    [1080, () => volume(0.52)],
    [1240, () => volume(0.6)],
    [
      3600,
      () => {
        exported = Gio.DBusExportedObject.wrapJSObject(xml, fixture);
        exported.export(Gio.DBus.session, "/org/mpris/MediaPlayer2");
        owner = Gio.bus_own_name_on_connection(
          Gio.DBus.session,
          "org.mpris.MediaPlayer2.LiltFixture",
          Gio.BusNameOwnerFlags.NONE,
          null,
          null,
        );
      },
    ],
    [5600, () => app._surface.compactButton.emit("clicked", 1)],
    [7700, () => volume(0.64)],
    [7860, () => volume(0.72)],
    [8020, () => volume(0.8)],
    [11200, () => app._surface.close.emit("clicked", 1)],
    [
      12700,
      () =>
        Main.osdWindowManager.showAll(
          Gio.ThemedIcon.new("audio-volume-muted-symbolic"),
          null,
          0.8,
          1,
        ),
    ],
    [
      16000,
      () => {
        Gio.bus_unown_name(owner);
        exported.unexport();
        owner = 0;
      },
    ],
  ];
  const frames = [],
    start = GLib.get_monotonic_time();
  let index = 0;
  while (GLib.get_monotonic_time() - start < 18000000) {
    const tick = GLib.get_monotonic_time();
    while (index < events.length && (tick - start) / 1000 >= events[index][0])
      events[index++][1]();
    const name = `${String(frames.length).padStart(4, "0")}.png`;
    const stream = Gio.File.new_for_path(`${output}/${name}`).replace(
      null,
      false,
      Gio.FileCreateFlags.NONE,
      null,
    );
    await new Shell.Screenshot().screenshot(false, stream);
    stream.close(null);
    frames.push({ file: `promo-frames/${name}`, time: (tick - start) / 1e6 });
    await Scripting.sleep(
      Math.max(1, 33 - (GLib.get_monotonic_time() - tick) / 1000),
    );
  }
  let manifest = "";
  frames.forEach((frame, i) => {
    manifest += `file '${frame.file}'\nduration ${i + 1 < frames.length ? frames[i + 1].time - frame.time : 0.033}\n`;
  });
  manifest += `file '${frames.at(-1).file}'\n`;
  GLib.file_set_contents(`${root}/evidence/promo-native.concat`, manifest);
  if (owner) {
    Gio.bus_unown_name(owner);
    exported.unexport();
  }
  app.disable();
}
