# Install with apt

For Ubuntu with GNOME 50, download the Lilt preview `.deb`, then run in the download directory:

```sh
sudo apt install ./lilt.deb
```

No Node.js, Python, build step, package repository, or signing-key setup is required to install this file. APT checks dependencies. The package is named `gnome-shell-extension-lilt` and intentionally accepts GNOME 50 only.

After installation, enable Lilt in your GNOME Extensions application. The equivalent command is:

```sh
gnome-extensions enable lilt@eggp-dev.github.io
```

If GNOME has not discovered the new extension yet, save your work and log out and in once, then enable it. Installation does not restart your session or force-enable an extension for any user. Preferences are available through `gnome-extensions prefs lilt@eggp-dev.github.io`.

## Update and remove

For a new downloaded version, disable Lilt, run the same apt install command with the new file, then use a fresh login to load the new code. There is no Lilt APT repository yet; normal `apt upgrade` does not fetch Lilt releases automatically.

To remove:

```sh
gnome-extensions disable lilt@eggp-dev.github.io
sudo apt remove gnome-shell-extension-lilt
```

Disabling restores the original GNOME OSD. Removing the package removes only its system files and keeps per-user preferences. Avoid a second copy in `~/.local/share/gnome-shell/extensions/lilt@eggp-dev.github.io`: a user copy takes precedence over the system package. If you used the source installer earlier, disable and back up that copy before switching to the Debian package.

## Package contents and verification

Code goes to `/usr/share/gnome-shell/extensions/lilt@eggp-dev.github.io/`. Its GSettings XML goes to `/usr/share/glib-2.0/schemas/`; GLib's existing dpkg trigger compiles the system schema cache. There are no package maintainer scripts, services, automatic session actions, new repositories, or user-settings writes.

Developers can build without root using `python3 scripts/pack-deb.py`. The result is `dist/lilt.deb` with `dist/lilt.deb.sha256`. `bash scripts/test-deb.sh` extracts the package into a temporary directory and runs its system-extension layout in the isolated GNOME harness. This verifies payload loading and native behavior, not an actual installation into the host package database. Review `apt-get --simulate install ./dist/lilt.deb` before a real install.

The package is a development preview. Physical keys, audio devices, mixed DPI, and real lock/unlock still require the checks listed in [VALIDATION.md](VALIDATION.md).
