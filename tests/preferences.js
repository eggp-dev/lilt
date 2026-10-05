import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Scripting from "resource:///org/gnome/shell/ui/scripting.js";
export const METRICS = {};

export async function run() {
  const root = GLib.getenv("LILT_ROOT");
  Main.overview.hide();
  await Scripting.sleep(500);
  const app = Main.extensionManager.lookup("lilt@eggp-dev.github.io").stateObj;
  const launcher = new Gio.SubprocessLauncher({
    flags: Gio.SubprocessFlags.NONE,
  });
  launcher.setenv("WAYLAND_DISPLAY", "gnome-shell-test-display", true);
  launcher.setenv("GDK_BACKEND", "wayland", true);
  launcher.setenv(
    "GSETTINGS_SCHEMA_DIR",
    app.dir.get_child("schemas").get_path(),
    true,
  );
  const process = launcher.spawnv([
    "gjs",
    "-m",
    `${root}/tests/preferences-fixture.js`,
  ]);
  try {
    let matched = false;
    for (let i = 0; i < 80; i++) {
      await Scripting.sleep(50);
      if (
        app._settings.get_int("top-spacing") === 112 &&
        app._state.mode(app._now()) === "volume"
      ) {
        matched = true;
        break;
      }
    }
    if (!matched)
      throw Error("Preferences did not trigger the native preview.");
    await Scripting.sleep(450);
    if (Math.abs(app._surface.actor.y - 112) > 1)
      throw Error("Preferences spacing was not applied.");
    const file = Gio.File.new_for_path(
      `${root}/evidence/preferences-results.json`,
    );
    const [, bytes] = file.load_contents(null);
    if (!JSON.parse(new TextDecoder().decode(bytes)).passed.every(Boolean))
      throw Error("Preference widget binding failed.");
    await Scripting.sleep(1800);
    const stream = Gio.File.new_for_path(
      `${root}/evidence/native-preferences.png`,
    ).replace(null, false, Gio.FileCreateFlags.NONE, null);
    await new Shell.Screenshot().screenshot(false, stream);
    stream.close(null);
    console.log(
      "Lilt preferences: three widget bindings and native preview verified.",
    );
  } finally {
    process.force_exit();
    app.disable();
  }
}
