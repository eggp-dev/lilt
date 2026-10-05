# Toward a daily-use Lilt

The goal is a small surface that feels precise every time you touch a media key. Features should earn their space. No deadlines or unsupported compatibility promises are implied below.

## Implemented in the 0.2 preview

- Native speaker volume/mute feedback, merged repeated inputs, MPRIS compact and expanded media, and capability-aware playback controls.
- Retargetable shape motion; incoming and outgoing content transitions; title and local-cover changes fade into place.
- Top spacing (48–240 logical pixels), volume hold time (0.6–4.0 seconds), and a native preview button that does not change audio volume.
- Reduced motion that also cancels an in-flight transition, fullscreen/overview fallback, cleanup, and a local apt-installable Debian package.

These are implemented, but real hardware and live-session reliability remain an explicit validation gap. The preview does not replace a notification-based keyboard workaround or repair an audio endpoint.

## Next: first everyday session

1. Confirm real volume/mute keys reach the normal GNOME OSD and the intended audio output. Exercise the user's keyboard and soundbar without changing unrelated configuration.
2. Check real lock/unlock, suspend/resume, physical displays and fractional scaling. Establish clean install/disable/uninstall/recovery on a test account.
3. Review long Korean and multilingual metadata, keyboard focus, screen reader behavior, high contrast, and font scaling. Add Korean UI localization.
4. Use the current preview for an ordinary session and collect specific friction before adding a broader dashboard.

## Next useful controls

| Feature | Intended experience | Important boundary |
| --- | --- | --- |
| Direct volume adjustment | Scroll or drag the visible gauge; click to mute | Must use GNOME's audio backend and keep the display and real level in sync |
| Media progress and seek | A subtle timeline in the expanded card | Only when the player advertises seeking; no fake progress |
| Player selection | Choose music or browser media when several are active | Selection survives updates, and a vanished player is removed cleanly |
| Artwork support | More real-world covers, optional restrained cover-derived color | Remote artwork needs an explicit network/cache/privacy design; currently local files only |
| Display preferences | Preferred monitor, transient music mode, light/high-contrast treatment | Preserve a calm default and a predictable fullscreen policy |
| Output device context | Show the actual active speaker/headphone and optionally switch it | Do not infer hardware state from an OSD label alone |

## Distribution

A signed APT repository would allow name-based installation and package updates. It needs a separate publishing/signing decision; none is configured. GNOME Extensions distribution requires maintainer understanding of the source and a separate review. A private source repository and a local `.deb` do not constitute either channel.

## Later, only with a reason

Microphone mute and supported brightness feedback can fit the same visual language. External-monitor brightness requires real hardware support. Battery/Bluetooth events may be useful if they can remain quiet and private. General notifications, weather, file sharing, audio visualizers, and a full control-center dashboard are not part of the current milestone.
