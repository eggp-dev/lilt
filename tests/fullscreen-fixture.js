import Gtk from "gi://Gtk?version=4.0";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
const app = new Gtk.Application({
  application_id: "org.lilt.TestWindow",
  flags: Gio.ApplicationFlags.NON_UNIQUE,
});
app.connect("activate", () => {
  const w = new Gtk.ApplicationWindow({
    application: app,
    title: "Lilt isolated fullscreen fixture",
    default_width: 800,
    default_height: 500,
  });
  w.set_child(new Gtk.Label({ label: "Isolated Lilt fullscreen test" }));
  w.fullscreen();
  w.present();
  GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
    app.quit();
    return GLib.SOURCE_REMOVE;
  });
});
app.run([]);
