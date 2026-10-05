# Architecture

`extension/` is a GNOME Shell extension using GJS ES modules, St, Clutter, Gio, and GLib. It runs inside Shell. GTK layer-shell is not the implementation: GNOME Wayland does not offer the protocol needed for a conventional GTK layer-shell overlay.

- `core.js`: platform-free state machine, exact spring solution, text normalization, player selection, and placement.
- `extension.js`: enable/disable lifecycle, settings, Shell signals, deadlines, and policy for fullscreen/overview.
- `hook.js`: GNOME 50 `show` / `showAll` instance adapters. `showOne` delegates through `show`. Only speaker-volume icons are consumed.
- `surface.js` and `stylesheet.css`: one native St surface and Clutter frame timeline. Chrome does not reserve desktop space.
- `mpris.js`: session-bus discovery, player property updates, owner loss, and capability-checked transport calls.
- `prefs.js`: separate GTK/Adwaita preferences process; GTK is never imported into Shell runtime code.

## Ownership and failure behavior

Hooks preserve the original own-property descriptor. Disable restores it only if Lilt still owns the method. If another extension wrapped it later, Lilt's disabled wrapper becomes a pass-through instead of overwriting the other extension's hook. This does not establish compatibility with every third-party OSD extension; avoid enabling two replacements.

Exceptions in the OSD consumer hide Lilt and call the original display. Initialization failure calls cleanup. Async MPRIS discovery has cancellation and per-name tokens, so callbacks cannot add stale players after removal or disable. D-Bus subscriptions and proxy signal IDs are released, as are Shell signal handlers, timers, timelines, and actors.

The extension does not use Shell's external Eval interface or attempt to evade D-Bus access controls. Tests use GNOME's supported automation harness inside an isolated Shell.

## Privacy and data

Lilt reads MPRIS metadata from the session bus while enabled and presents it on the unlocked desktop. It does not persist that metadata or collect notifications. Cover art is restricted to local raster files with a 5 MiB limit. No HTTP artwork, analytics, or remote requests are implemented. Preview/test fixtures are artificial.

## Platform contract

Shell internal APIs can change between releases. The metadata targets GNOME 50, and actual native checks ran on 50.1. GNOME 51 and older Shell releases are not declared supported. Monitor coordinates are constrained to a valid target; monitor-change signals reset the target to primary. Tests include two virtual monitors and a global theme-scale change, not physical mixed-DPI monitors or physical hot-unplug.

Read the official [extension architecture](https://gjs.guide/extensions/overview/architecture.html), [updates and breakage](https://gjs.guide/extensions/overview/updates-and-breakage.html), and [review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) before extending or submitting the project. GNOME review is a separate process; this repository makes no approval claim.
