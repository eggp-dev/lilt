# Lilt 0.3.0

Lilt's first published GitHub release brings volume, mute, and MPRIS music into one floating native GNOME surface. A small bead inflates with a restrained recoil, changes shape as content changes, and gathers inward when it disappears. Text, artwork, and controls remain undistorted.

This is an **early 0.x release**, published as a regular GitHub release. It is not a claim of production reliability or GNOME Extensions review approval.

## Included

- Speaker volume/mute OSD replacement with merged repeated inputs and the newest value displayed in one surface.
- Compact music, expanded playback controls, local album artwork, and capability-aware MPRIS transport.
- Liquid contour motion with continuous position and velocity during interruption, including input during disappearance.
- Position and display-duration preferences, a preview that does not change audio volume, and reduced motion that cancels active transitions.
- Fullscreen/overview fallback, player-loss cleanup, and restoration of owned GNOME OSD methods on disable.

## Download and install

The [v0.3.0 release](https://github.com/eggp-dev/lilt/releases/tag/v0.3.0) contains:

| File | Purpose |
| --- | --- |
| `lilt_0.3.0_all.deb` | Ubuntu/Debian package for GNOME 50 |
| `lilt@eggp-dev.github.io.shell-extension.zip` | Installable user-level GNOME extension |
| `SHA256SUMS` | SHA-256 file checksums; unsigned |
| `lilt-liquid-motion.mp4` | Approximately nine seconds of actual isolated GNOME surface capture |

GitHub's automatic **Source code (zip/tar.gz)** downloads are repository archives, not the installable extension ZIP. Choose either the Debian package or the user extension; a user copy overrides a system package.

For Ubuntu, download the `.deb` and `SHA256SUMS` into the same directory:

```sh
sha256sum --ignore-missing --check SHA256SUMS
sudo apt install ./lilt_0.3.0_all.deb
gnome-extensions enable lilt@eggp-dev.github.io
```

If GNOME has not discovered the new extension, save your work and log out/in once, then enable it. The package itself does not restart the session or force-enable Lilt. There is no signed APT repository; name-only installation and automatic repository updates are unavailable. Checksums verify bytes and are not signatures.

For user-level installation, with no existing copy of this UUID:

```sh
gnome-extensions install ./lilt@eggp-dev.github.io.shell-extension.zip
```

Use the same discovery/login and enable steps. Before replacing an existing copy, disable Lilt and back up its UUID directory. Before switching from a user copy to the Debian package, back up and remove that user copy so it does not shadow the package.

## Verification and limits

The declared target is GNOME 50. Verification ran on **GNOME Shell 50.1 / Ubuntu 26.04.1 / Wayland** in isolated sessions: **68 distinct checks** (18 pure state/motion checks, 40 native checks, 7 two-monitor checks, and 3 GTK preference bindings). The extracted Debian payload also runs the same native suite; that rerun is not counted twice. Package structure, schema compilation, and APT dependency simulation are checked separately.

The OSD events and MPRIS media in those tests are synthetic. Actual MX Keys volume/mute keys, the Samsung soundbar, real lock/unlock and suspend, physical mixed/fractional DPI and hot-plug, common-player coverage, screen-reader behavior, and long-term reliability remain unverified. GNOME 51, X11, and other desktops are not verified. The demo records actual isolated Shell pixels with variable screenshot cadence; an encoded frame rate is not a hardware performance benchmark.

A keyboard workaround that emits `notify-send` notifications is outside Lilt's OSD input path. Lilt does not repair PipeWire endpoints, change audio routing or keyboard bindings, collect notifications, fetch network artwork, or control hardware brightness. See [VALIDATION.md](https://github.com/eggp-dev/lilt/blob/v0.3.0/docs/VALIDATION.md) for the full record.

No CI workflow is configured in this repository. These checks were run locally through the included isolated test harness. Public downloads and hashes are verified after publication; a successful download does not establish installation or operation on another user's machine.

## Disable, uninstall, and rollback

Disable to return to GNOME's original volume display:

```sh
gnome-extensions disable lilt@eggp-dev.github.io
```

For a Debian installation:

```sh
sudo apt remove gnome-shell-extension-lilt
```

For a user extension:

```sh
gnome-extensions uninstall lilt@eggp-dev.github.io
```

This first GitHub release has no earlier published binary release. The immediate rollback is disable/uninstall. If you have a saved previous copy, keep Lilt disabled and restore only that UUID's directory, then use a fresh login before enabling it. For a saved older Debian package, install that exact file with APT's explicit downgrade option after disabling Lilt. Preserve unrelated extensions and settings; do not overwrite the entire GNOME enabled-extension list. See [OPERATIONS.md](https://github.com/eggp-dev/lilt/blob/v0.3.0/docs/OPERATIONS.md) and [DEBIAN.md](https://github.com/eggp-dev/lilt/blob/v0.3.0/docs/DEBIAN.md).

## License and assets

Lilt source and authored assets are under [MIT](https://github.com/eggp-dev/lilt/blob/v0.3.0/LICENSE). The installable packages include the license. The demo uses original artwork and synthetic media metadata, with no audio track, private notifications, Apple artwork, or third-party recordings. Reference projects and the UDC study informed the design; no reference implementation or assets were copied. Optional development/video dependencies retain their own licenses and are not bundled into the extension.
