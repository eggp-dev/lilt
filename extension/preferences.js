// SPDX-License-Identifier: MIT
// GTK preferences only. This module is never imported by the Shell runtime.
import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

export function buildPreferences(window, settings) {
  const page = new Adw.PreferencesPage({
    title: "Lilt",
    icon_name: "audio-volume-high-symbolic",
  });
  window.add(page);
  const display = new Adw.PreferencesGroup({
    title: "A little room for sound",
    description: "A quiet surface for volume and music.",
  });
  page.add(display);
  const widgets = {};
  for (const [key, title, subtitle] of [
    [
      "replace-volume-osd",
      "Volume display",
      "Turn off to restore the standard GNOME display.",
    ],
    [
      "show-media",
      "Keep music in view",
      "A compact surface while music plays.",
    ],
  ]) {
    const row = new Adw.SwitchRow({ title, subtitle });
    settings.bind(key, row, "active", Gio.SettingsBindFlags.DEFAULT);
    display.add(row);
  }
  const placement = new Adw.PreferencesGroup({ title: "Make it feel right" });
  page.add(placement);
  for (const [key, title, subtitle, lower, upper, step, digits] of [
    [
      "top-spacing",
      "Distance from the top",
      "Logical pixels from the monitor edge.",
      48,
      240,
      4,
      0,
    ],
    [
      "volume-duration",
      "Linger for",
      "Seconds after your last volume input.",
      0.6,
      4,
      0.1,
      1,
    ],
  ]) {
    const row = new Adw.SpinRow({
      title,
      subtitle,
      digits,
      numeric: true,
      adjustment: new Gtk.Adjustment({
        lower,
        upper,
        step_increment: step,
        page_increment: step * 5,
      }),
    });
    settings.bind(key, row, "value", Gio.SettingsBindFlags.DEFAULT);
    placement.add(row);
    widgets[key] = row;
  }
  const motion = new Adw.PreferencesGroup({ title: "Motion" });
  page.add(motion);
  const reduced = new Adw.SwitchRow({
    title: "Reduce motion",
    subtitle: "Immediate changes. Your system preference is also respected.",
  });
  settings.bind(
    "reduced-motion",
    reduced,
    "active",
    Gio.SettingsBindFlags.DEFAULT,
  );
  motion.add(reduced);
  const preview = new Gtk.Button({
    label: "Preview",
    tooltip_text:
      "Show a sample while Lilt is enabled, without changing volume.",
    valign: Gtk.Align.CENTER,
    css_classes: ["suggested-action"],
  });
  preview.connect("clicked", () =>
    settings.set_uint(
      "preview-request",
      (settings.get_uint("preview-request") + 1) >>> 0,
    ),
  );
  placement.header_suffix = preview;
  return { ...widgets, preview, reduced };
}
