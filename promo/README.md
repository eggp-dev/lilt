# Lilt video project

A 24-second, 1920 × 1080, 30 fps Remotion composition. Its first 18 seconds show one uninterrupted native GNOME recording at 1× speed. Framing widens near the end; the final six seconds are a title/preview invitation. No synthetic UI behavior is substituted for the capture. There is no audio track.

## Reproduce

From the repository root, copy the committed, reviewed sources into Remotion's local asset directory:

```sh
cp assets/native-source.mp4 promo/public/native-source.mp4
cp assets/native-volume.png promo/public/native-volume.png
cd promo
npm ci
npm run check
npm run dev
```

Studio uses `http://localhost:48631`. It does not deploy the video. To render:

```sh
npm run render
npm run poster
```

An existing compatible Chromium can be supplied with Remotion's `--browser-executable=/path/to/chrome` flag. The captured source and native screenshot are committed in `assets/`; intermediate frames and copies in `promo/public/` are ignored. Uses the system DejaVu Sans font; install that font to match typography.

## Capture new native footage

```sh
LILT_PROMO=1 bash scripts/test-native.sh
ffmpeg -safe 0 -f concat -i evidence/promo-native.concat -vf fps=30 \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart assets/native-source.mp4
```

Run those commands from the repository root. The concat manifest uses actual screenshot timestamps; do not change playback speed while describing it as 1×. The harness uses fake MPRIS media and internally generated OSD events in a private GNOME session. Review each new recording for private content before publishing it.

The runtime extension has no Remotion dependency. This optional tooling retains its third-party licenses. The minimal local toolchain passed `npm audit` with zero reported vulnerabilities on 2026-10-05; that is a point-in-time report, not a security guarantee.
