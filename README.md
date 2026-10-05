<p align="center"><img src="assets/mark.svg" width="48" alt="Lilt"></p>

# Lilt

[![Actual Lilt motion, recorded in a test GNOME session](assets/lilt-loop.gif)](assets/lilt-intro.mp4)

**A floating pill for volume and media on GNOME.**

Volume, mute, and now-playing feedback in a quiet surface that expands, settles, and gets out of the way. Repeated volume changes update one display. Playing music stays compact; controls unfold when you need them.

**Early 0.x release.** Tested in isolated GNOME Shell **50.1** sessions on Ubuntu **26.04.1 / Wayland**. Physical keyboard, audio-device, mixed-DPI, and real lock-screen testing are still pending. This is a native GJS extension, with a separate browser rehearsal for motion design. It has not been reviewed for extensions.gnome.org.

The clip is an actual GNOME capture at its recorded speed, using test inputs and test media. It demonstrates behavior, not long-term stability. [Close-up motion](assets/liquid-closeup.mp4) · [24-second introduction](assets/lilt-intro.mp4) · [Unedited 18-second capture](assets/native-source.mp4) · [Static image](assets/hero.png) · [Preferences](assets/native-preferences.png)

## Install 0.3.0

Download `lilt_0.3.0_all.deb` and `SHA256SUMS` from the [0.3.0 release](https://github.com/eggp-dev/lilt/releases/tag/v0.3.0). Review the [tested scope](docs/VALIDATION.md) first; the Ubuntu package targets GNOME 50 only. In the download directory:

```sh
sha256sum --ignore-missing --check SHA256SUMS
sudo apt install ./lilt_0.3.0_all.deb
```

Then enable **Lilt** in GNOME Extensions. A first logout/login may be needed for GNOME to discover it. See [apt installation, updates, and removal](docs/DEBIAN.md). There is no Lilt APT repository yet; installing by package name alone and automatic repository updates are not available. The checksums verify file bytes and are not signatures.

The release also includes `lilt@eggp-dev.github.io.shell-extension.zip` for user-level installation. Choose one installation method; a user copy overrides a system package. GitHub's automatic **Source code** archives contain the repository and are different from the installable extension ZIP. See the [0.3.0 notes](docs/RELEASE-0.3.0.md) for changes, verification, and recovery.

### Build from source

Node and Python are development tools; the extension has no npm runtime dependencies. From a source checkout, build a local Debian package:

```sh
python3 scripts/pack-deb.py
sudo apt install ./dist/lilt.deb
```

For the user-only ZIP and isolated development tests:

```sh
git clone https://github.com/eggp-dev/lilt.git
cd lilt
npm test
python3 scripts/pack.py
```

The ZIP is created at `dist/lilt@eggp-dev.github.io.shell-extension.zip`. Packaging does **not** install or enable it. You can test it in a disposable GNOME session:

```sh
bash scripts/test-native.sh
LILT_MULTI=1 bash scripts/test-native.sh
```

This requires GNOME 50's `gnome-shell-test-tool`, GJS, Python 3, `glib-compile-schemas`, and a working local graphics stack. The test tool uses private D-Bus and disposable XDG directories. See the [manual install steps](docs/OPERATIONS.md) when you choose to use it on your desktop.

## What it does

- Replaces speaker volume and mute OSDs with one animated surface.
- Forms a small droplet, inflates with a restrained recoil, and gathers back into a bead. Text and artwork remain undistorted.
- Shows MPRIS title, artist, local cover art, and supported playback controls.
- Returns from a temporary volume display to the current music state.
- Fades track titles and local artwork as media changes.
- Lets you set top spacing and display duration, with a native Preview button.
- Respects the system animation preference and cancels active transitions in reduced motion.
- Restores GNOME's original volume display when replacement is disabled.
- Hides media in the overview and fullscreen; fullscreen volume uses the standard OSD.

It does not collect notifications, call a notification daemon, control brightness, change audio routing, or install keyboard shortcuts. A key workaround that sends `notify-send` notifications is outside this extension's input path. It needs normal GNOME volume OSD events. No telemetry, account, or network artwork fetching is built into the extension.

Only local PNG/JPEG/WebP covers up to 5 MiB are accepted; other artwork uses a music symbol. Multiple players are selected consistently, preferring a currently playing one. There is no player picker yet.

## Feedback that helps

[Open an issue](https://github.com/eggp-dev/lilt/issues/new?template=bug_report.yml) with your OS, GNOME version, Wayland/X11, monitor scaling, and a short reproduction. Tell us what you expected and what appeared. Please omit private track titles, screenshots, usernames, and full system logs unless you have reviewed them.

There are **68 automated checks**: 18 platform-free, 40 in an isolated native session, 7 with two virtual monitors, and 3 GTK preference bindings. [What those checks establish—and what they do not](docs/VALIDATION.md).

## Develop

```sh
npm test                 # pure state, motion, geometry, and hook checks
npm run preview          # http://127.0.0.1:48621/preview/index.html
npm run pack             # installable ZIP; does not activate it
npm run pack:deb         # dist/lilt.deb; does not install it
```

The browser rehearsal uses test data and never changes real volume or music. Its shared state/spring model is useful for design; it is not proof of native compatibility. The optional [Remotion project](promo/README.md) recreates the video from native source footage.

[Remaining features and priorities](docs/ROADMAP.md) · [Product and motion](docs/PRODUCT.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md) · [Operations](docs/OPERATIONS.md) · [Contributing](CONTRIBUTING.md) · [Launch plan](docs/LAUNCH.md)

## License and provenance

[MIT](LICENSE). The source, artwork, wallpaper, and test-media metadata in this repository were created for Lilt. No code was copied from reference extensions. Third-party dependencies retain their own licenses; Remotion is used only by the optional video project.

AI tools assisted implementation, testing, documentation, and promotional drafts. These materials remain subject to maintainer review. This disclosure is not a claim of GNOME extension review approval; maintainers should understand and be able to explain the code before submitting it. See [provenance](docs/PROVENANCE.md).
