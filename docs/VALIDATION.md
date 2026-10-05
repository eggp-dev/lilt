# Validation record

Recorded 2026-10-05. Environment: Ubuntu 26.04.1 host; GNOME Shell 50.1 running headless on Wayland with a private session bus, disposable XDG directories, software rendering, and test media. These automated runs do not modify the logged-in desktop.

## Confirmed automated checks

**68 passing checks** comprise:

| Suite | Count | Coverage |
| --- | ---: | --- |
| Node unit suite | 18 | State priority/deadlines, player loss and selection, plain bounded metadata, spring frame-rate independence/retargeting, reduced motion, geometry, GNOME 50 argument parsing, idempotent hooks and failure fallback |
| Native single-monitor suite | 40 | Loading the packaged extension, `showAll`, one actor across 30 rapid events, no duplicate OSD, expiry, brightness pass-through, private-bus MPRIS discovery and transport, mute, media return, overview, scale 2, actual fullscreen GTK fixture, fullscreen OSD fallback, unlock-dialog lifecycle simulation, immediate reduced motion, player loss, exact hook restoration, actor/timer/signal cleanup, repeated enable; configurable spacing/duration, preferences preview, rapid metadata retargeting, cover fade, in-flight reduced motion, and pane cleanup; native Cairo rendering, interrupted contraction, readable recovery, no idle repaints, unscaled content, and immediate cancellation of contour lag |
| Native two-monitor suite | 7 | Two headless monitors, `showOne` target and bounds/centering, stale monitor target reset, finite coordinates, single-surface cleanup |

The native test harness installs the built ZIP only into its disposable data directory and removes the temporary session afterward. Disable and restored GNOME OSD were visibly verified there. Raw local logs are intentionally not published because they can contain machine-specific paths. The tests are included to reproduce the evidence.

The GTK preferences fixture adds **3 widget-binding checks** (spacing, duration, and Preview request), with the resulting native preview and position also observed in a separate isolated session. All counts refer to distinct assertions; rerunning the same suite from a Debian payload is not counted again.

## Simulations and limits

- MPRIS uses a real D-Bus interface with synthetic title/artist/art and test transport methods.
- OSD inputs are generated inside the test Shell, not by a physical keyboard.
- Fullscreen is an actual isolated GTK window; ordinary applications may differ.
- Lock behavior uses the Shell's unlock-dialog session mode; PAM, real credentials, suspend, and physical lock/unlock were not tested.
- Scale 2 is the global theme scale. Mixed-DPI and fractional scaling on real monitors remain unverified.
- Monitor removal resets a deliberately stale target via a monitor-change signal. It is not a physical cable removal test.
- The clip is one short demonstration. Looping it does not prove stability over time.

## Before a stable release

- [ ] Physical volume/mute keys and local audio device; no notification workaround in the path.
- [ ] GNOME session installation, disable, uninstall, re-login, and recovery on a clean test account.
- [ ] Real lock/unlock, suspend/resume, and fullscreen applications.
- [ ] Physical dual-monitor mixed/fractional DPI, hot-plug, and primary-monitor changes.
- [ ] Common MPRIS applications, multiple players, remote artwork fallback, and application crashes.
- [ ] High contrast, large text, screen reader, keyboard-only control, long/non-Latin metadata.
- [ ] Maintainer review of source and current GNOME extension-review requirements.

GNOME 51, X11, and other Linux desktops are not verified. The product remains a development preview.

## Published demonstration

The introduction is 24.000 seconds, 1920 × 1080, H.264, 30 fps (720 frames), with no audio stream. Its native portion is an uninterrupted 18-second capture at recorded speed; the remaining six seconds are a title/CTA. The 9-second GIF and WebP repeat the beginning of that same test sequence. All assets use original test artwork. Frames were visually reviewed after rendering. The optional video TypeScript check passed, and its dependency audit reported zero known vulnerabilities at the time of capture.

## Debian package

The local `0.3.0~preview1` package passed APT dependency simulation on the test host: one new package, no upgrades or removals. Two builds produced the same SHA-256. Archive ownership, file checksums, schema syntax, and absence of maintainer scripts were inspected. The extracted system-extension layout and global schema were loaded in a private GNOME session, then the existing 40 native checks passed again. This does not count as 40 additional independent checks or a real host installation. Installation into the live package database remains untested; no administrator operation was performed.

## Liquid contour in 0.3

The original contour runs through St.DrawingArea/Cairo on GNOME 50.1. Three additional pure checks exercise 160 rapid reversals, bounded contour coordinates, and cancellation of all spring channels. Six additional native checks cover actual Cairo painting, reversal during disappearance, return to readable current volume, absence of settled repaints, unscaled title/art actors, and mid-transition removal of contour lag. The revised source capture includes an input while the body is contracting. This is a behavioral and visual verification on software-rendered virtual displays, not a hardware frame-rate benchmark.

The separate nine-second 480 × 180 close-up also records actual Shell pixels, using area screenshots to reduce readback/encoding cost. Both capture paths have variable screenshot cadence. Encoding at 30 fps does not imply that every frame is a distinct compositor frame or prove 30/60 fps desktop performance.
