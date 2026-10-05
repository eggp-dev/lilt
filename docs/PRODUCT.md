# Product brief

Lilt offers a quiet, temporary place for sound feedback. It floats near the upper middle of the chosen monitor, apart from the top panel. The first release prioritizes proportion, legibility, and motion over a broad dashboard.

## State model

| State | Trigger | Behavior |
| --- | --- | --- |
| Hidden | No active content | No visible surface or input region |
| Compact | Playing MPRIS player | Cover, title, artist, and small playback mark |
| Media | Click compact surface | Previous, play/pause, next, and collapse controls |
| Volume | Speaker volume or mute OSD | Temporary gauge; each event replaces the same deadline |
| Blocked | Overview, fullscreen, or locked/greeter mode | Hide media immediately; let standard OSD handling continue |

Volume takes priority for 1,400 ms by default (configurable from 600 to 4,000 ms) after the last input, then returns to the currently valid media state. Paused media receives a 5,000 ms grace period. A removed player cannot reappear from stale state. Music selection favors a playing player and preserves the current selection when possible.

## Motion and geometry

| Parameter | Value |
| --- | --- |
| Spring mass / stiffness | 1 / 400 |
| Damping | Width 27 on expansion, height 30; exit and numeric feedback 36 |
| Curvature / slower width echo | Damping 28; echo stiffness 300 |
| Hidden seed | 2 × 2 logical pixels, opacity 0, vertical offset −6, horizontal shift −18 |
| Compact / volume / media | 272 × 60 / 344 × 96 / 384 × 136 |
| Position | Monitor horizontal center; configurable top spacing × scale, constrained to the monitor |
| Surface | Charcoal gradient, restrained edge, warm pale text |

An analytic damped spring retains current position and velocity when retargeted. Repeated input does not start a new actor or reset the spring to its starting shape. The timeline stops after settling. Numerical thresholds are 0.015 position and 0.035 velocity. Incoming content eases into place over 180 ms with a 4-pixel drift; outgoing content fades over 90 ms (70 ms on disappearance). Title and local-artwork changes use an 85 ms fade out and 160 ms fade in. Retargeting cancels obsolete callbacks. Shape geometry follows the Shell theme scale; true mixed-DPI behavior remains a hardware test item.

The silhouette is an original cubic Bézier contour drawn with St.DrawingArea/Cairo. A continuous presence mapping lets a round bead form before lateral inflation and gathers the body on exit. A slower width spring changes the curvature of the two ends slightly during motion. Content uses separate actors with translation and opacity only; it is never scaled with the body. The contour stops repainting at rest. See the [reference study and adaptation](LIQUID-MOTION-STUDY.md).

## Accessibility

Reduced motion snaps geometry and opacity to the final state, with no residual spring. Both `org.gnome.desktop.interface enable-animations` and Lilt's own switch are honored. Buttons have accessible names, keyboard focus styles, and capability-based availability. Text is bounded plain text, never markup from a player. Screen-reader behavior, keyboard-only reachability, high contrast, and extreme font scaling need manual validation before a stable release.

## Acceptance criteria

1. One surface during a burst of volume input, with no duplicate GNOME OSD.
2. A volume interruption returns to current media, or hidden if that player left.
3. No content from notifications; no notification history entries.
4. Disable removes actors, signal handlers, timers, and owned hooks; the standard OSD works again.
5. Re-enabling does not duplicate UI or callbacks.
6. Fullscreen, overview, monitor changes, and player loss leave a valid state.
7. Reduced motion is immediate and contains no idle animation loop.
8. Production testing must include physical volume keys, audio devices, mixed DPI, and real lock/unlock before calling these supported.

Brightness, all-notification aggregation, weather, file sharing, network artwork, and a player picker are later work. A visible brightness gauge alone would not establish hardware brightness control.

Top spacing defaults to 72 logical pixels, adjustable from 48 to 240. The preferences Preview button displays a synthetic 64% gauge through settings while the extension is enabled; it does not change the audio backend. It is suppressed in blocked states.
