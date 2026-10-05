#!/usr/bin/env python3
"""Review or apply Lilt's three APT trust files. Does not install or restart."""
import argparse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

URL = "https://eggp-dev.github.io/lilt/apt"
FINGERPRINT = "D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E"

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--apply", action="store_true", help="Write only the reviewed key, source and package pin; requires root")
args = parser.parse_args()
if args.apply and os.geteuid() != 0:
    parser.error("Run with sudo only after approving these exact APT trust changes.")


def download(name):
    request = urllib.request.Request(URL + "/" + name, headers={"User-Agent": "Lilt-APT-setup"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


with tempfile.TemporaryDirectory(prefix="lilt-apt-setup-") as temp:
    key = Path(temp) / "key.gpg"
    key.write_bytes(download("lilt-archive-keyring.gpg"))
    shown = subprocess.check_output(["gpg", "--homedir", temp, "--batch", "--with-colons", "--show-keys", str(key)], text=True)
    fps = [line.split(":")[9] for line in shown.splitlines() if line.startswith("fpr:")]
    if fps != [FINGERPRINT]:
        raise SystemExit("Archive key differs from the documented exact fingerprint; nothing changed.")
    release = Path(temp) / "InRelease"
    release.write_bytes(download("dists/stable/InRelease"))
    subprocess.run(["gpgv", "--homedir", temp, "--keyring", str(key), str(release)], check=True)
    signed = release.read_text().split("-----BEGIN PGP SIGNATURE-----", 1)[0]
    expiry_lines = [line.split(":", 1)[1].strip() for line in signed.splitlines() if line.startswith("Valid-Until:")]
    if len(expiry_lines) != 1 or parsedate_to_datetime(expiry_lines[0]) <= datetime.now(timezone.utc):
        raise SystemExit("Archive metadata is expired or has no validity deadline; nothing changed.")
    files = {
        Path("/etc/apt/keyrings/lilt-archive-keyring.gpg"): key.read_bytes(),
        Path("/etc/apt/sources.list.d/lilt.sources"): (
            f"Types: deb\nURIs: {URL}\nSuites: stable\nComponents: main\n"
            "Architectures: amd64\nSigned-By: /etc/apt/keyrings/lilt-archive-keyring.gpg\n"
        ).encode(),
        Path("/etc/apt/preferences.d/lilt.pref"): (
            "Package: lilt gnome-shell-extension-lilt\nPin: release o=Lilt\nPin-Priority: 500\n\n"
            "Package: *\nPin: release o=Lilt\nPin-Priority: -1\n"
        ).encode(),
    }
    # Stop before any write if an existing file would change. Key rotation is explicit.
    for path, data in files.items():
        if path.is_symlink() or (path.exists() and path.read_bytes() != data):
            raise SystemExit(f"Existing target differs or is a symlink: {path}; nothing changed.")
    print("Verified public signing fingerprint:", FINGERPRINT)
    for path in files:
        print("APT trust target:", path)
    if not args.apply:
        print("Review only. No system configuration changed. --apply is a separate approved action.")
    else:
        created = []
        try:
            for path, data in files.items():
                if path.exists():
                    continue
                path.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                # O_EXCL prevents overwriting a file appearing after review.
                with path.open("xb") as target:
                    created.append((path, os.fstat(target.fileno()).st_ino))
                    target.write(data)
                path.chmod(0o644)
        except BaseException:
            # Roll back only files created by this invocation, never existing files.
            for path, inode in reversed(created):
                if path.exists() and path.stat().st_ino == inode:
                    path.unlink()
            raise
        print("Lilt-only trust files configured. Run apt update, then apt install lilt.")
