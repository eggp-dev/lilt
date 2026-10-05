import Adw from "gi://Adw?version=1";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { buildPreferences } from "../extension/preferences.js";

const app = new Adw.Application({
  application_id: "org.lilt.PreferencesFixture",
});
app.connect("activate", () => {
  const settings = new Gio.Settings({
    schema_id: "org.gnome.shell.extensions.lilt",
  });
  const window = new Adw.PreferencesWindow({
    application: app,
    title: "Lilt",
    default_width: 590,
    default_height: 620,
  });
  const widgets = buildPreferences(window, settings);
  window.present();
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 600, () => {
    widgets["top-spacing"].value = 112;
    widgets["volume-duration"].value = 1.8;
    widgets.preview.emit("clicked");
    const checks = [
      settings.get_int("top-spacing") === 112,
      settings.get_double("volume-duration") === 1.8,
      settings.get_uint("preview-request") > 0,
    ];
    GLib.file_set_contents(
      `${GLib.getenv("LILT_ROOT")}/evidence/preferences-results.json`,
      JSON.stringify({ passed: checks }),
    );
    return GLib.SOURCE_REMOVE;
  });
});
app.run([]);
