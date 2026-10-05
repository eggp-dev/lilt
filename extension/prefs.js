import Adw from "gi://Adw";
import Gio from "gi://Gio";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
export default class LiltPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const page = new Adw.PreferencesPage({
      title: "Lilt",
      icon_name: "audio-volume-high-symbolic",
    });
    window.add(page);
    const group = new Adw.PreferencesGroup({
      title: "Quiet motion",
      description:
        "A small surface for volume and music. GNOME 50 development preview.",
    });
    page.add(group);
    for (const [key, title, subtitle] of [
      [
        "replace-volume-osd",
        "Use volume display",
        "Turn off to immediately restore the GNOME volume display.",
      ],
      ["show-media", "Show music", "Keep a compact surface while music plays."],
      [
        "reduced-motion",
        "Reduce motion",
        "Show immediately without size or position animation. System preferences are also respected.",
      ],
    ]) {
      const row = new Adw.SwitchRow({ title, subtitle });
      settings.bind(key, row, "active", Gio.SettingsBindFlags.DEFAULT);
      group.add(row);
    }
  }
}
