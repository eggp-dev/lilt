// SPDX-License-Identifier: MIT
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { cleanText, selectPlayer } from "./core.js";
const PREFIX = "org.mpris.MediaPlayer2.";
const PATH = "/org/mpris/MediaPlayer2";
const IFACE = "org.mpris.MediaPlayer2.Player";
const unpack = (v) => v?.deepUnpack?.() ?? v;
export class MediaMonitor {
  constructor(onChange) {
    this.onChange = onChange;
    this.players = new Map();
    this.pending = new Map();
    this.alive = true;
    this.selected = null;
    this.cancellable = new Gio.Cancellable();
    this.bus = Gio.DBus.session;
    // Subscribe before listing to avoid missing a player launched during discovery.
    this.subscription = this.bus.signal_subscribe(
      "org.freedesktop.DBus",
      "org.freedesktop.DBus",
      "NameOwnerChanged",
      "/org/freedesktop/DBus",
      null,
      Gio.DBusSignalFlags.NONE,
      (_c, _s, _p, _i, _n, params) => {
        const [name, oldOwner, owner] = params.deepUnpack();
        if (!name.startsWith(PREFIX)) return;
        if (oldOwner) this.remove(name);
        if (owner) this.add(name);
      },
    );
    this.bus.call(
      "org.freedesktop.DBus",
      "/org/freedesktop/DBus",
      "org.freedesktop.DBus",
      "ListNames",
      null,
      new GLib.VariantType("(as)"),
      Gio.DBusCallFlags.NONE,
      2000,
      this.cancellable,
      (bus, result) => {
        try {
          const [names] = bus.call_finish(result).deepUnpack();
          if (this.alive)
            for (const name of names)
              if (name.startsWith(PREFIX)) this.add(name);
        } catch {
          /* No media is a valid state. */
        }
      },
    );
  }
  add(name) {
    if (!this.alive || this.players.has(name) || this.pending.has(name)) return;
    const token = {};
    this.pending.set(name, token);
    Gio.DBusProxy.new(
      this.bus,
      Gio.DBusProxyFlags.DO_NOT_AUTO_START,
      null,
      name,
      PATH,
      IFACE,
      this.cancellable,
      (_o, result) => {
        let proxy;
        try {
          proxy = Gio.DBusProxy.new_finish(result);
        } catch {
          if (this.pending.get(name) === token) this.pending.delete(name);
          return;
        }
        if (!this.alive || this.pending.get(name) !== token) {
          return;
        }
        this.pending.delete(name);
        if (!proxy.g_name_owner) {
          return;
        }
        const ids = [
          proxy.connect("g-properties-changed", () => this.publish()),
          proxy.connect("notify::g-name-owner", () => {
            if (!proxy.g_name_owner) this.remove(name);
          }),
        ];
        this.players.set(name, { proxy, ids });
        this.publish();
      },
    );
  }
  remove(name) {
    this.pending.delete(name);
    const record = this.players.get(name);
    if (record) {
      this.players.delete(name);
      record.ids.forEach((id) => record.proxy.disconnect(id));
    }
    if (this.alive) this.publish();
  }
  snapshot(name, proxy) {
    const prop = (key) => unpack(proxy.get_cached_property(key));
    const metadata = prop("Metadata") ?? {},
      artists = unpack(metadata["xesam:artist"]);
    return {
      id: name,
      status: prop("PlaybackStatus"),
      title: cleanText(unpack(metadata["xesam:title"]), "Untitled"),
      artist: Array.isArray(artists)
        ? artists
            .filter((a) => typeof a === "string")
            .join(", ")
            .slice(0, 240)
        : "Unknown artist",
      art: cleanText(unpack(metadata["mpris:artUrl"])),
      canPlay: !!prop("CanPlay") && !!prop("CanControl"),
      canPause: !!prop("CanPause") && !!prop("CanControl"),
      canNext: !!prop("CanGoNext") && !!prop("CanControl"),
      canPrevious: !!prop("CanGoPrevious") && !!prop("CanControl"),
    };
  }
  publish() {
    if (!this.alive) return;
    this.selected = selectPlayer(
      [...this.players].map(([name, { proxy }]) => this.snapshot(name, proxy)),
      this.selected?.id,
    );
    this.onChange(this.selected);
  }
  control(method) {
    const p = this.selected,
      record = p && this.players.get(p.id);
    const allowed =
      p &&
      {
        PlayPause: p.status === "Playing" ? p.canPause : p.canPlay,
        Next: p.canNext,
        Previous: p.canPrevious,
      }[method];
    if (!record || !allowed) return false;
    record.proxy.call(
      method,
      null,
      Gio.DBusCallFlags.NO_AUTO_START,
      2000,
      this.cancellable,
      (proxy, result) => {
        try {
          proxy.call_finish(result);
        } catch {
          /* Player may have exited since the click. */
        }
      },
    );
    return true;
  }
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.cancellable.cancel();
    this.bus.signal_unsubscribe(this.subscription);
    for (const name of [...this.players.keys()]) this.remove(name);
    this.pending.clear();
    this.selected = null;
    this.onChange = () => {};
  }
}
