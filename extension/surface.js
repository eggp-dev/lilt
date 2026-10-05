// SPDX-License-Identifier: MIT
import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";
import Pango from "gi://Pango";
import Cairo from "cairo";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { SurfaceMotion, Spring, SHAPES, clamp, placement } from "./core.js";
import { contour, contentVisibility } from "./contour.js";

export class Surface {
  constructor(onExpand, onControl) {
    this.motion = new SurfaceMotion();
    this.bar = new Spring(0);
    this.alive = true;
    this.mode = "hidden";
    this.monitor = 0;
    this.reduced = false;
    this.topSpacing = 72;
    this.artSerial = 0;
    this.actor = new St.Widget({
      name: "lilt-surface",
      style_class: "lilt-surface",
      layout_manager: new Clutter.FixedLayout(),
      reactive: false,
      visible: false,
    });
    Main.layoutManager.addChrome(this.actor, { affectsStruts: false });
    this.body = new St.DrawingArea({ reactive: false });
    this.actor.add_child(this.body);
    this.body.connect("repaint", () => this.paint());
    this.content = new St.Widget({ layout_manager: new Clutter.FixedLayout() });
    this.actor.add_child(this.content);
    this.panes = {};
    for (const key of ["compact", "volume", "media"]) {
      this.panes[key] = new St.Widget({
        layout_manager: new Clutter.FixedLayout(),
        visible: false,
      });
      this.content.add_child(this.panes[key]);
    }
    this.compactButton = new St.Button({
      style_class: "lilt-compact-hit",
      accessible_name: "Open music controls",
      can_focus: true,
    });
    this.panes.compact.add_child(this.compactButton);
    this.compactButton.connect("clicked", onExpand);
    this.cArt = this.icon(
      this.panes.compact,
      "audio-x-generic-symbolic",
      40,
      "lilt-art",
    );
    this.cTitle = this.label(this.panes.compact, "lilt-title");
    this.cArtist = this.label(this.panes.compact, "lilt-artist");
    this.wave = this.icon(
      this.panes.compact,
      "media-playback-start-symbolic",
      16,
      "lilt-wave",
    );
    this.speaker = this.icon(
      this.panes.volume,
      "audio-volume-high-symbolic",
      21,
    );
    this.volumeLabel = this.label(this.panes.volume, "lilt-volume-label");
    this.percent = this.label(this.panes.volume, "lilt-percent");
    this.track = new St.Widget({
      style_class: "lilt-track",
      layout_manager: new Clutter.FixedLayout(),
    });
    this.fill = new St.Widget({ style_class: "lilt-fill" });
    this.track.add_child(this.fill);
    this.panes.volume.add_child(this.track);
    this.mArt = this.icon(
      this.panes.media,
      "audio-x-generic-symbolic",
      49,
      "lilt-art",
    );
    this.mTitle = this.label(this.panes.media, "lilt-title");
    this.mArtist = this.label(this.panes.media, "lilt-artist");
    this.now = this.label(this.panes.media, "lilt-now");
    this.buttons = {};
    for (const [method, icon, label] of [
      ["Previous", "media-skip-backward-symbolic", "Previous track"],
      ["PlayPause", "media-playback-pause-symbolic", "Play or pause"],
      ["Next", "media-skip-forward-symbolic", "Next track"],
    ]) {
      const button = new St.Button({
        style_class: "lilt-control",
        can_focus: true,
        accessible_name: label,
        child: new St.Icon({ icon_name: icon, icon_size: 18 }),
      });
      button.connect("clicked", () => onControl(method));
      this.panes.media.add_child(button);
      this.buttons[method] = button;
    }
    this.close = new St.Button({
      style_class: "lilt-close",
      accessible_name: "Collapse",
      can_focus: true,
      child: new St.Icon({ icon_name: "pan-up-symbolic", icon_size: 12 }),
    });
    this.close.connect("clicked", onExpand);
    this.panes.media.add_child(this.close);
    this.actor.connect("key-press-event", (_a, event) => {
      if (event.get_key_symbol() === Clutter.KEY_Escape) {
        onExpand(false);
        return Clutter.EVENT_STOP;
      }
      return Clutter.EVENT_PROPAGATE;
    });
    this.layout();
  }
  icon(parent, name, size, style = "") {
    const a = new St.Icon({
      icon_name: name,
      icon_size: size,
      style_class: style,
    });
    parent.add_child(a);
    return a;
  }
  label(parent, style) {
    const a = new St.Label({ style_class: style });
    a.clutter_text.ellipsize = Pango.EllipsizeMode.END;
    parent.add_child(a);
    return a;
  }
  layout() {
    const s = St.ThemeContext.get_for_stage(global.stage).scale_factor;
    this.scale = s;
    const box = (a, x, y, w, h) => {
      a.set_position(x * s, y * s);
      if (w !== undefined) a.set_size(w * s, h * s);
    };
    box(this.panes.compact, 0, 0, 272, 60);
    box(this.panes.volume, 0, 0, 344, 96);
    box(this.panes.media, 0, 0, 384, 136);
    box(this.compactButton, 0, 0, 272, 60);
    box(this.cArt, 10, 10, 40, 40);
    box(this.cTitle, 62, 14, 156, 20);
    box(this.cArtist, 62, 34, 156, 17);
    box(this.wave, 239, 22);
    box(this.speaker, 25, 24);
    box(this.volumeLabel, 57, 24, 188, 23);
    box(this.percent, 262, 20, 58, 28);
    box(this.track, 25, 69, 292, 5);
    box(this.mArt, 23, 20, 49, 49);
    box(this.mTitle, 85, 23, 203, 22);
    box(this.mArtist, 85, 46, 203, 18);
    box(this.now, 294, 23, 67, 16);
    box(this.buttons.Previous, 110, 89, 40, 34);
    box(this.buttons.PlayPause, 172, 89, 40, 34);
    box(this.buttons.Next, 234, 89, 40, 34);
    box(this.close, 338, 91, 25, 28);
    this.draw();
  }
  update(state, mode, monitor, reduced, topSpacing = 72) {
    this.monitor = monitor;
    this.reduced = reduced;
    this.topSpacing = topSpacing;
    this.motion.target(mode);
    if (mode !== this.mode || reduced) {
      for (const [key, pane] of Object.entries(this.panes)) {
        pane.remove_all_transitions();
        pane.reactive = false;
        if (key === mode) {
          const wasVisible = pane.visible;
          pane.show();
          pane.opacity = reduced ? 255 : wasVisible ? pane.opacity : 0;
          pane.translation_y = reduced
            ? 0
            : wasVisible
              ? pane.translation_y
              : 4 * this.scale;
          pane.ease({
            opacity: 255,
            translation_y: 0,
            duration: reduced ? 0 : 180,
            mode: Clutter.AnimationMode.EASE_OUT_CUBIC,
          });
        } else if (pane.visible && !reduced) {
          pane.ease({
            opacity: 0,
            translation_y: -3 * this.scale,
            duration: mode === "hidden" ? 70 : 90,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
              if (this.alive) pane.hide();
            },
          });
        } else {
          pane.hide();
          pane.opacity = 0;
          pane.translation_y = 0;
        }
      }
      this.mode = mode;
      if (mode !== "hidden") this.lastContentMode = mode;
    }
    const p = state.player;
    this.text(this.cTitle, p?.title ?? "");
    this.text(this.mTitle, p?.title ?? "");
    this.text(this.cArtist, p?.artist ?? "");
    this.text(this.mArtist, p?.artist ?? "");
    this.now.text = p?.status === "Playing" ? "Playing" : "Paused";
    this.wave.icon_name =
      p?.status === "Playing"
        ? "media-playback-start-symbolic"
        : "media-playback-pause-symbolic";
    this.buttons.PlayPause.child.icon_name =
      p?.status === "Playing"
        ? "media-playback-pause-symbolic"
        : "media-playback-start-symbolic";
    for (const [key, allowed] of Object.entries({
      Previous: p?.canPrevious,
      Next: p?.canNext,
      PlayPause: p?.status === "Playing" ? p?.canPause : p?.canPlay,
    })) {
      this.buttons[key]._liltAllowed = !!allowed;
      this.buttons[key].reactive = mode === "media" && !!allowed;
      this.buttons[key].can_focus = mode === "media" && !!allowed;
      this.buttons[key].opacity = allowed ? 255 : 80;
    }
    this.volumeLabel.text = state.muted ? "Muted" : "Volume";
    this.percent.text = `${state.muted ? 0 : Math.round(state.level * 100)}%`;
    this.speaker.icon_name = state.muted
      ? "audio-volume-muted-symbolic"
      : state.level > 0.66
        ? "audio-volume-high-symbolic"
        : state.level > 0.33
          ? "audio-volume-medium-symbolic"
          : "audio-volume-low-symbolic";
    this.actor.accessible_name =
      mode === "volume"
        ? `${this.volumeLabel.text} ${this.percent.text}`
        : `${p?.title ?? ""}, ${p?.artist ?? ""}`;
    this.bar.target = state.muted
      ? 0
      : clamp(state.level / (state.maxLevel ?? 1));
    this.setArt(p?.art ?? "");
    if (mode !== "hidden") this.actor.show();
    this.actor.reactive = mode === "compact" || mode === "media";
    this.compactButton.reactive = this.compactButton.can_focus =
      mode === "compact";
    this.close.reactive = this.close.can_focus = mode === "media";
    this.animate();
  }
  text(label, value) {
    if (this.reduced || !label.get_parent().visible || !label.text) {
      label.remove_all_transitions();
      label._liltTarget = value;
      label.text = value;
      label.opacity = 255;
      return;
    }
    if (label._liltTarget === value) return;
    label._liltTarget = value;
    label.remove_all_transitions();
    label.ease({
      opacity: 0,
      duration: 85,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        if (!this.alive || label._liltTarget !== value) return;
        label.text = value;
        label.ease({
          opacity: 255,
          duration: 160,
          mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
      },
    });
  }
  artwork(style, serial) {
    this.artStyle = style;
    this.artReadySerial = serial;
    for (const actor of [this.cArt, this.mArt]) {
      actor.remove_all_transitions();
      const apply = () => {
        if (!this.alive || serial !== this.artSerial) return;
        actor.style = style;
        actor.gicon = null;
        actor.icon_name = style ? null : "audio-x-generic-symbolic";
        actor.ease({
          opacity: 255,
          duration: this.reduced ? 0 : 160,
          mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
      };
      if (this.reduced || !actor.get_parent().visible) {
        apply();
      } else {
        actor.ease({
          opacity: 0,
          duration: 85,
          mode: Clutter.AnimationMode.EASE_OUT_QUAD,
          onComplete: apply,
        });
      }
    }
  }
  setArt(uri) {
    if (uri === this.artUri) return;
    this.artUri = uri;
    const serial = ++this.artSerial;
    this.artCancel?.cancel();
    this.artCancel = new Gio.Cancellable();
    // Local raster artwork only: never fetch remote content or execute SVGs.
    if (!/^file:\/\//.test(uri) || !/\.(png|jpe?g|webp)$/i.test(uri)) {
      this.artwork(null, serial);
      return;
    }
    const file = Gio.File.new_for_uri(uri);
    file.query_info_async(
      "standard::size,standard::type",
      Gio.FileQueryInfoFlags.NONE,
      GLib.PRIORITY_DEFAULT,
      this.artCancel,
      (f, result) => {
        try {
          const info = f.query_info_finish(result);
          if (!this.alive || serial !== this.artSerial) return;
          if (
            info.get_file_type() !== Gio.FileType.REGULAR ||
            info.get_size() > 5 * 1024 * 1024
          ) {
            this.artwork(null, serial);
            return;
          }
          const uri = f.get_uri().replace(/"/g, "%22");
          this.artwork(
            `background-image:url("${uri}");background-size:cover;`,
            serial,
          );
        } catch {
          if (this.alive && serial === this.artSerial)
            this.artwork(null, serial);
        }
      },
    );
  }
  animate() {
    if (this.reduced) {
      this.timeline?.stop();
      this.timeline = null;
      this.motion.advance(0, true);
      this.bar.advance(0, true);
      for (const actor of [this.cArt, this.mArt]) {
        actor.remove_transition("opacity");
        actor.opacity = 255;
        if (this.artReadySerial === this.artSerial) {
          actor.style = this.artStyle;
          actor.gicon = null;
          actor.icon_name = this.artStyle ? null : "audio-x-generic-symbolic";
        }
      }
      this.draw();
      if (this.mode === "hidden") this.actor.hide();
      return;
    }
    if (this.timeline) return;
    this.last = GLib.get_monotonic_time();
    this.timeline = new Clutter.Timeline({
      actor: this.actor,
      duration: 1000,
      repeat_count: -1,
    });
    this.timeline.connect("new-frame", () => {
      const now = GLib.get_monotonic_time(),
        dt = (now - this.last) / 1e6;
      this.last = now;
      const a = this.motion.advance(dt, this.reduced),
        b = this.bar.advance(dt, this.reduced);
      this.draw();
      if (!a && !b) {
        this.timeline.stop();
        this.timeline = null;
        if (this.mode === "hidden") this.actor.hide();
      }
    });
    this.timeline.start();
  }
  draw() {
    if (!this.actor || !this.scale) return;
    const v = this.motion.snapshot(),
      p = placement(
        Main.layoutManager.monitors,
        this.monitor,
        v.width,
        v.height,
        this.scale,
        this.topSpacing,
      );
    if (!p) {
      this.actor.hide();
      return;
    }
    this.actor.set_position(
      p.x + v.shift * this.scale,
      p.y + v.offset * this.scale,
    );
    this.actor.set_size(p.width, p.height);
    this.actor.opacity = Math.round(clamp(v.opacity) * 255);
    this.body.set_size(p.width, p.height);
    const shapeKey = [p.width, p.height, v.roundness, v.lag].join(":");
    if (shapeKey !== this.shapeKey) {
      this.shapeKey = shapeKey;
      this.body.queue_repaint();
    }
    this.content.set_size(p.width, p.height);
    this.content.set_clip(0, 0, p.width, p.height);
    const contentShape =
      SHAPES[this.mode === "hidden" ? this.lastContentMode : this.mode];
    const visibility = contentShape ? contentVisibility(v, contentShape) : 0;
    this.content.opacity = Math.round(255 * visibility);
    for (const [key, pane] of Object.entries(this.panes)) {
      pane.set_position(
        (p.width - SHAPES[key].width * this.scale) / 2,
        (p.height - SHAPES[key].height * this.scale) / 2,
      );
    }
    const ready = visibility > 0.95 && this.actor.visible;
    this.actor.reactive = ready && ["compact", "media"].includes(this.mode);
    this.compactButton.reactive = this.compactButton.can_focus =
      ready && this.mode === "compact";
    this.close.reactive = this.close.can_focus = ready && this.mode === "media";
    for (const button of Object.values(this.buttons))
      button.reactive = button.can_focus =
        ready && this.mode === "media" && !!button._liltAllowed;
    this.fill.set_size(
      Math.max(0, clamp(this.bar.value) * 292 * this.scale),
      5 * this.scale,
    );
  }
  paint() {
    const cr = this.body.get_context();
    const [w, h] = this.body.get_surface_size();
    const v = this.motion.snapshot();
    const s = this.scale || 1;
    cr.scale(s, s);
    for (const [op, ...points] of contour(w / s, h / s, v.roundness, v.lag)) {
      if (op === "M") cr.moveTo(...points);
      else if (op === "C") cr.curveTo(...points);
      else cr.closePath();
    }
    const fill = new Cairo.LinearGradient(0, 0, 0, h / s);
    fill.addColorStopRGBA(0, 40 / 255, 43 / 255, 46 / 255, 0.99);
    fill.addColorStopRGBA(1, 23 / 255, 26 / 255, 29 / 255, 0.99);
    cr.setSource(fill);
    cr.fillPreserve();
    cr.setSourceRGBA(1, 1, 1, 0.16);
    cr.setLineWidth(1);
    cr.stroke();
    cr.$dispose();
    this.paintCount = (this.paintCount ?? 0) + 1;
  }
  hideImmediately() {
    this.timeline?.stop();
    this.timeline = null;
    this.actor.hide();
    this.actor.reactive = false;
    this.motion.target("hidden");
    this.motion.advance(0, true);
    this.mode = "hidden";
  }
  destroy() {
    if (!this.alive) return;
    this.alive = false;
    this.artCancel?.cancel();
    this.timeline?.stop();
    this.timeline = null;
    Main.layoutManager.removeChrome(this.actor);
    this.actor.destroy();
    this.actor = null;
  }
}
