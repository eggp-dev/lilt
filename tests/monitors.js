import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Shell from "gi://Shell";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as Scripting from "resource:///org/gnome/shell/ui/scripting.js";
export const METRICS = {};
export async function run() {
  Main.overview.hide();
  await Scripting.sleep(600);
  const app = Main.extensionManager.lookup("lilt@eggp-dev.github.io").stateObj,
    checks = [];
  function check(v, message) {
    if (!v) throw Error(message);
    checks.push(message);
    console.log(`LILT PASS: ${message}`);
  }
  check(
    Main.layoutManager.monitors.length === 2,
    "Two actual headless virtual monitors available",
  );
  Main.osdWindowManager.showOne(
    1,
    Gio.ThemedIcon.new("audio-volume-high-symbolic"),
    null,
    0.8,
    1,
  );
  await Scripting.sleep(600);
  const m = Main.layoutManager.monitors[1],
    actor = app._surface.actor;
  check(app._monitor === 1, "showOne routes to the requested second monitor");
  check(
    actor.x >= m.x && actor.x + actor.width <= m.x + m.width,
    "Surface remains within the second monitor bounds",
  );
  check(
    Math.abs(actor.x + actor.width / 2 - (m.x + m.width / 2)) < 1,
    "Surface is centered on the second monitor",
  );
  const stream = Gio.File.new_for_path(
    `${GLib.getenv("LILT_ROOT")}/evidence/native-multimonitor.png`,
  ).replace(null, false, Gio.FileCreateFlags.NONE, null);
  await new Shell.Screenshot().screenshot(false, stream);
  stream.close(null);
  app._monitor = 99;
  Main.layoutManager.emit("monitors-changed");
  await Scripting.sleep(100);
  check(
    app._monitor === Main.layoutManager.primaryIndex,
    "Monitor change signal resets a stale target to primary",
  );
  check(
    Number.isFinite(actor.x) && Number.isFinite(actor.y),
    "Monitor change leaves finite native coordinates",
  );
  app.disable();
  check(
    !Main.uiGroup.get_children().some((c) => c.name === "lilt-surface"),
    "Multi-monitor disable cleans the single surface",
  );
  GLib.file_set_contents(
    `${GLib.getenv("LILT_ROOT")}/evidence/native-monitors.json`,
    JSON.stringify(
      {
        environment:
          "Two headless virtual monitors; stale target simulated via monitors-changed",
        monitors: Main.layoutManager.monitors.map((m) => ({
          x: m.x,
          y: m.y,
          width: m.width,
          height: m.height,
        })),
        passed: checks,
      },
      null,
      2,
    ),
  );
}
