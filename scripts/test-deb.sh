#!/usr/bin/env bash
set -euo pipefail
LILT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LILT_ROOT
python3 "$LILT_ROOT/scripts/pack-deb.py"
LILT_DEB_ROOT="$(mktemp -d /tmp/lilt-deb-test.XXXXXX)"
export LILT_DEB_ROOT
trap 'rm -rf -- "$LILT_DEB_ROOT"' EXIT
dpkg-deb --extract "$LILT_ROOT/dist/lilt.deb" "$LILT_DEB_ROOT"
glib-compile-schemas --strict "$LILT_DEB_ROOT/usr/share/glib-2.0/schemas"
mkdir -p "$LILT_DEB_ROOT/runtime" "$LILT_ROOT/evidence"
chmod 700 "$LILT_DEB_ROOT/runtime"
export XDG_RUNTIME_DIR="$LILT_DEB_ROOT/runtime"
export XDG_DATA_DIRS="$LILT_DEB_ROOT/usr/share:/usr/local/share:/usr/share"
export LIBGL_ALWAYS_SOFTWARE=1
export SHELL_BACKGROUND_IMAGE="$LILT_ROOT/preview/wallpaper.png"
unset WAYLAND_DISPLAY DISPLAY
timeout 55s dbus-run-session -- gnome-shell-test-tool --headless --extra-filter org.lilt.TestWindow "$LILT_ROOT/tests/deb.js"
