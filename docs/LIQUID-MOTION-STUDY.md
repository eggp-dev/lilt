# Liquid motion study — 2026-10-05

Status: adapted into the 0.3 native preview. The reference observations below remain distinct from Lilt’s original implementation. A native contour, continuous bead/inflation mapping, independent content, and interruption handling are implemented; verification is recorded in VALIDATION.md.

## Reference actually inspected

- [UDC demonstration, direct video](https://media.fmkorea.com/files/attach/new5/20260911/10320880074_3254535_10e53f33cfff8edd7e51ec8baa6861b3.mp4), linked as “UDC 아래로 카메라가 숨는 UI” in [this post](https://www.fomos.kr/talk/article_view?bbs_id=4&indexno=2094510).
- The public clip is 1280 × 720, 30 fps, approximately 11.05 seconds. Decoded consecutive frames around disappearance and appearance, in addition to a whole-clip contact sheet. The reference remains a temporary research file; no video frames, Apple artwork, or third-party implementation enter the distributed project.
- This is a rehosted demonstration, not independently authenticated device footage or documentation of Apple's implementation. Handheld camera movement and perspective prevent precise recovery of animation parameters.

Observed: the dark capsule contracts toward its larger circular camera end, the small green indicator fades, and the remaining round shape contracts to a point and disappears. On appearance, a round camera region precedes a lateral expansion into the capsule around the indicator. The silhouette changes as it moves. This clip does not establish repeated vertical bouncing, liquid simulation, a shader, or a specific spring equation.

Interpretation for Lilt: the useful quality is a soft body collecting into a bead and inflating into a surface. The user's requested bouncy water-droplet character can be an original extension of that visual language.

## Difference from 0.2

Before this change, `extension/core.js` sprang width, height, opacity, and vertical offset together. `stylesheet.css` had a fixed 30 px corner radius, without an independently deforming contour. The existing mass 1 / stiffness 400 / damping 36 spring has damping ratio 0.9 and approximately 0.15% ideal step overshoot, so it is deliberately restrained.

Changing damping alone will make the existing rectangle bounce; it will not create the requested droplet silhouette.

## Proposed behavior

| Transition | Shape and content |
| --- | --- |
| Hidden → volume | A small rounded bead inflates laterally, briefly compresses vertically, then settles into a readable surface. Content becomes legible early, without waiting for the full settle. |
| Compact music → volume | The existing body swells into the new silhouette; album/title yield to the gauge. No second island appears. |
| Volume → music | The body gathers inward and settles around the compact music content. |
| Expanded music | More interior space and softer corners; restrained deformation during the transition, stable controls at rest. |
| Visible → hidden | Content clears, the silhouette collects into a bead, then the bead disappears. No persistent notch or camera-hole imitation. |
| Repeated key input | Update the same gauge immediately; preserve contour velocity and target the newest state. Never queue bead/expansion animations. |

The floating surface stays in the upper-center area. Text, artwork, icons, and focus indicators remain independently rendered and undistorted. The contour carries squash/stretch and a small asymmetric lag; content only translates and fades. Any outline highlight follows that contour, with restrained shading and no flashing or neon.

Initial tuning proposals, **not measured Apple values**:

- Appearance/expansion: about 380–520 ms to visually settle; useful content visible within about 120 ms.
- Return to compact: about 320–450 ms. Disappearance: about 220–320 ms.
- Contour spring: mass 1, stiffness 400, damping 26–28 (roughly 4.6–6.8% ideal step overshoot). Tune contour channels separately from position, content, and numeric feedback.
- One discernible recoil followed by rapid decay. Vertical travel stays small; the main expression comes from the changing contour.
- These phases describe appearance, not a non-interruptible keyframe queue. A new state immediately retargets the live system.

## Native implementation route

Preserve the existing OSD/MPRIS/state/lifecycle layer. Add a small parameterized contour behind the existing St content actors, with independently animated corner curvature, lateral expansion, and local bulge. A cubic Bézier path in `St.DrawingArea` is the implemented rendering route; a full fluid simulation is unnecessary for this contour.

[GNOME's DrawingArea API](https://gnome.pages.gitlab.gnome.org/gnome-shell/st/class.DrawingArea.html) supports Cairo drawing and queued repaints. The online reference currently documents version 51; the actual API was verified in the GNOME 50.1 isolated session for this preview. Hardware rendering cost remains unmeasured. Repaint only while deforming, stop at rest, and avoid per-frame recreation of actors or content. If Cairo costs too much at high scale, benchmark a custom rendering effect before selecting it; GPU performance is not assumed.

Keep position and velocity continuous when retargeting. [Apple's spring animation documentation](https://developer.apple.com/documentation/swiftui/animation/spring) describes this continuity principle; it is not evidence of the UDC clip's private implementation. Lilt already preserves spring velocity and can retain that property.

## Acceptance checks before native delivery

- Render appearance, compact/volume/media changes, and disappearance in an isolated Shell capture. Inspect silhouette and text at normal speed and frame by frame.
- Interruption at every phase, including a key press during disappearance: no snap, stale content, duplicate actor, or delayed volume update.
- Content is not scaled or warped with the contour; controls and focus stay usable, with no invisible reactive area after hiding.
- Reduced motion removes contour deformation and recoil, including when enabled mid-transition.
- Clamp the gauge to real bounds even if a decorative spring overshoots. Stop all animation/repaint callbacks at rest and on disable.
- Recheck scaling, small monitors, fullscreen/overview, lock/session cleanup, player loss, and original OSD restoration. Real hardware, fractional scaling, and live-session performance remain separate validation gaps.

The initial research did not modify the extension. Subsequent development was explicitly authorized, including installation. Installation status is recorded separately from this design study.
