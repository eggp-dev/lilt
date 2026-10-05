// The harness supplies a private keyfile backend and disposable XDG settings.
import GLib from "gi://GLib";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Scripting from "resource:///org/gnome/shell/ui/scripting.js";
import { run as runNative } from "./native.js";

export const METRICS = {};

export async function run() {
  const root = GLib.getenv("LILT_DEB_ROOT");
  if (!root?.startsWith("/tmp/lilt-deb-test."))
    throw Error("Run through scripts/test-deb.sh in its isolated session.");
  const uuid = "lilt@eggp-dev.github.io";
  global.settings.set_strv("enabled-extensions", [uuid]);
  await Scripting.sleep(1200);
  const app = Main.extensionManager.lookup(uuid)?.stateObj;
  const expected = `${root}/usr/share/gnome-shell/extensions/${uuid}`;
  if (!app || app.dir.get_path() !== expected)
    throw Error(
      "The staged system extension was not loaded from the Debian payload.",
    );
  console.log(
    "Lilt Debian payload: system extension and global GSettings schema loaded.",
  );
  await runNative();
}
