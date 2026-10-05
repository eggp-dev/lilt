#!/usr/bin/env bash
set -euo pipefail
LILT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LILT_ROOT
mkdir -p "$LILT_ROOT/evidence"
python3 "$LILT_ROOT/scripts/pack.py"
LILT_RUNTIME="$(mktemp -d /tmp/lilt-runtime.XXXXXX)"
trap 'rm -rf -- "$LILT_RUNTIME"' EXIT
chmod 700 "$LILT_RUNTIME"
# GNOME's test tool separately creates disposable XDG data/config/cache dirs.
# Our extra runtime and bus isolate sockets from the logged-in desktop.
export XDG_RUNTIME_DIR="$LILT_RUNTIME"
export LIBGL_ALWAYS_SOFTWARE=1
export SHELL_BACKGROUND_IMAGE="$LILT_ROOT/preview/wallpaper.png"
unset WAYLAND_DISPLAY DISPLAY
LILT_TEST="$LILT_ROOT/tests/native.js"
LILT_ARGS=()
if [[ "${LILT_PROMO:-0}" == 1 ]]; then
    LILT_TEST="$LILT_ROOT/tests/promo.js"
fi
if [[ "${LILT_PREFS:-0}" == 1 ]]; then
    LILT_TEST="$LILT_ROOT/tests/preferences.js"
    LILT_ARGS=(--extra-filter org.lilt.PreferencesFixture)
fi
if [[ "${LILT_MULTI:-0}" == 1 ]]; then
    LILT_TEST="$LILT_ROOT/tests/monitors.js"
    LILT_ARGS=(--wrap "$LILT_ROOT/scripts/extra-monitor.sh")
fi
timeout 55s dbus-run-session -- gnome-shell-test-tool --headless --extra-filter org.lilt.TestWindow "${LILT_ARGS[@]}" --extension "$LILT_ROOT/dist/lilt@eggp-dev.github.io.shell-extension.zip" "$LILT_TEST"
