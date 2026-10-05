// SPDX-License-Identifier: MIT
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import { SurfaceState } from "./core.js";
import { OsdHook, volumeEvent } from "./hook.js";
import { MediaMonitor } from "./mpris.js";
import { Surface } from "./surface.js";

export default class LiltExtension extends Extension {
  enable() {
    if (this._enabled) return;
    this._enabled = true;
    this._signals = [];
    this._timer = 0;
    this._monitor = Main.layoutManager.primaryIndex;
    this._state = new SurfaceState();
    try {
      this._settings = this.getSettings();
      this._interface = new Gio.Settings({
        schema_id: "org.gnome.desktop.interface",
      });
      this._surface = new Surface(
        (expanded) => {
          this._state.expanded =
            typeof expanded === "boolean" ? expanded : !this._state.expanded;
          this._refresh();
        },
        (method) => this._media?.control(method),
      );
      this._media = new MediaMonitor((player) => {
        this._state.media(
          this._settings.get_boolean("show-media") ? player : null,
          this._now(),
        );
        this._refresh();
      });
      this._hook = new OsdHook(
        Main.osdWindowManager,
        (method, args) => this._consume(method, args),
        () => {
          this._surface.hideImmediately();
          console.warn("Lilt: OSD failed; using the standard display.");
        },
      );
      this._connect(this._settings, "changed", (_settings, key) => {
        if (key === "preview-request") {
          if (!this._blocked()) {
            this._state.volume(
              0.64,
              false,
              this._now(),
              1,
              this._settings.get_double("volume-duration") * 1000,
            );
            this._refresh();
          }
          return;
        }
        this._syncHook();
        this._state.media(
          this._settings.get_boolean("show-media")
            ? this._media.selected
            : null,
          this._now(),
        );
        this._refresh();
      });
      this._connect(this._interface, "changed::enable-animations", () =>
        this._refresh(),
      );
      this._connect(
        St.ThemeContext.get_for_stage(global.stage),
        "notify::scale-factor",
        () => {
          this._surface.layout();
          this._refresh();
        },
      );
      this._connect(Main.layoutManager, "monitors-changed", () => {
        this._monitor = Main.layoutManager.primaryIndex;
        this._surface.layout();
        this._refresh();
      });
      this._connect(Main.sessionMode, "updated", () => this._refresh());
      this._connect(Main.overview, "showing", () => this._refresh());
      this._connect(Main.overview, "hidden", () => this._refresh());
      this._connect(global.display, "in-fullscreen-changed", () =>
        this._refresh(),
      );
      this._syncHook();
      this._refresh();
    } catch (e) {
      this.disable();
      throw e;
    }
  }
  _now() {
    return GLib.get_monotonic_time() / 1000;
  }
  _connect(object, signal, fn) {
    this._signals.push([object, object.connect(signal, fn)]);
  }
  _blocked() {
    return !!(
      Main.sessionMode.isLocked ||
      Main.sessionMode.isGreeter ||
      Main.overview.visible ||
      Main.layoutManager.monitors[this._monitor]?.inFullscreen
    );
  }
  _syncHook() {
    if (this._settings.get_boolean("replace-volume-osd")) this._hook.enable();
    else {
      this._hook.disable();
      this._state.volumeUntil = 0;
    }
  }
  _consume(method, args) {
    if (!this._enabled) return false;
    const event = volumeEvent(
      method,
      args,
      global.display.get_current_monitor(),
    );
    if (!event) return false;
    const monitor = Main.layoutManager.monitors[event.monitor];
    if (!monitor) return false;
    // Native OSD stays available in fullscreen/overview/lock; no duplicate.
    if (
      Main.sessionMode.isLocked ||
      Main.sessionMode.isGreeter ||
      Main.overview.visible ||
      monitor.inFullscreen
    )
      return false;
    this._monitor = event.monitor;
    this._state.volume(
      event.level,
      event.muted,
      this._now(),
      event.maxLevel,
      this._settings.get_double("volume-duration") * 1000,
    );
    this._refresh();
    return true;
  }
  _refresh() {
    if (!this._enabled || !this._surface) return;
    if (this._timer) {
      GLib.source_remove(this._timer);
      this._timer = 0;
    }
    const blocked = this._blocked();
    this._state.block(blocked);
    if (blocked) {
      this._surface.hideImmediately();
      return;
    }
    const now = this._now(),
      reduced =
        this._settings.get_boolean("reduced-motion") ||
        !this._interface.get_boolean("enable-animations");
    this._surface.update(
      this._state,
      this._state.mode(now),
      this._monitor,
      reduced,
      this._settings.get_int("top-spacing"),
    );
    const deadline = this._state.deadline(now);
    if (Number.isFinite(deadline))
      this._timer = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        Math.max(1, Math.ceil(deadline - now) + 1),
        () => {
          this._timer = 0;
          this._refresh();
          return GLib.SOURCE_REMOVE;
        },
      );
  }
  disable() {
    this._enabled = false;
    this._hook?.disable();
    this._hook = null;
    if (this._timer) {
      GLib.source_remove(this._timer);
      this._timer = 0;
    }
    for (const [object, id] of this._signals ?? []) object.disconnect(id);
    this._signals = [];
    this._media?.destroy();
    this._media = null;
    this._surface?.destroy();
    this._surface = null;
    this._settings = null;
    this._interface = null;
    this._state = null;
  }
}
