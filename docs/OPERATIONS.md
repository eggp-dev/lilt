# Installation, backup, and recovery

The preview is for GNOME 50. Review the [validation limits](VALIDATION.md). None of the build or test commands activate an extension in your logged-in desktop. Do not install from unreviewed copies of source.

## Build and isolated test

```sh
python3 scripts/pack.py
bash scripts/test-native.sh
LILT_MULTI=1 bash scripts/test-native.sh
```

`pack.py` uses Python's ZIP library and `glib-compile-schemas`. Only `extension/` enters the archive; the video tools, fixtures, and documentation do not. `test-native.sh` uses GNOME's test tool with a fresh D-Bus, runtime directory, and disposable XDG configuration. It never calls `sudo` or changes the host extension list.

## Install when you choose to

First disable any older Lilt installation and any competing volume OSD replacement. The UUID for this repository is `lilt@eggp-dev.github.io`.

```sh
python3 scripts/install.py          # report target and backup; make no changes
python3 scripts/install.py --apply  # copy source, compiling its schema
```

The installer refuses an enabled Lilt or a symlink target. It backs up an existing extension and records the prior enabled-extension list in `backups/<timestamp>/`. It does not enable the extension or log you out. Backups may contain local paths; they are excluded from Git.

Alternatively, on a clean test account with no existing Lilt installation:

```sh
gnome-extensions install dist/lilt@eggp-dev.github.io.shell-extension.zip
```

GNOME may require a fresh Wayland login to discover a new extension. Save work and log out yourself if needed; no script here does so. After discovery, enable deliberately:

```sh
gnome-extensions enable lilt@eggp-dev.github.io
gnome-extensions prefs lilt@eggp-dev.github.io
```

The preferences switches control volume replacement, media visibility, and reduced motion. Turning off volume replacement restores the original GNOME volume methods immediately. Lilt cannot fix a keyboard binding that sends ordinary notifications, an unavailable audio endpoint, or hardware brightness support.

## Disable and uninstall

```sh
gnome-extensions disable lilt@eggp-dev.github.io
gnome-extensions uninstall lilt@eggp-dev.github.io
```

Disable removes Lilt's surface and subscriptions and restores its owned OSD methods. Uninstall removes the on-disk copy; it does not erase unrelated extensions. If GNOME cannot accept the disable command, save work and log into a recovery/test session before removing only this UUID's directory. Do not reset the entire enabled-extension list.

## Restore a backup

Keep Lilt disabled. In the backup directory's `state.json`, inspect the saved target and whether a previous installation existed. Copy that backup's `extension/` back to the same UUID directory, replacing only Lilt. If there was no previous installation, uninstall Lilt instead. Enable only after inspecting the restored version. The saved complete extension list is diagnostic information, not a command to overwrite current settings.

Settings are stored in `/org/gnome/shell/extensions/lilt/`. Uninstall need not reset them. If you intentionally want defaults, use `dconf reset -f /org/gnome/shell/extensions/lilt/` after disabling. Do not clear parent GNOME settings.
