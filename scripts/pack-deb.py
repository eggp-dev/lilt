#!/usr/bin/env python3
"""Build dist/lilt.deb without root, installation, or session changes."""
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = "gnome-shell-extension-lilt"
UUID = "lilt@eggp-dev.github.io"
VERSION = json.loads((ROOT / "package.json").read_text())["version"] + "~preview1"
EPOCH = int(os.environ.get("SOURCE_DATE_EPOCH", "1791158400"))
OUTPUT = ROOT / "dist" / "lilt.deb"


def build():
    metadata = json.loads((ROOT / "extension/metadata.json").read_text())
    if metadata["uuid"] != UUID or metadata["shell-version"] != ["50"]:
        raise SystemExit("Review the package UUID and GNOME dependency bounds first.")
    subprocess.run(["dpkg", "--validate-version", VERSION], check=True)
    OUTPUT.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="lilt-deb-") as temp:
        stage = Path(temp)
        extension = stage / "usr/share/gnome-shell/extensions" / UUID
        extension.mkdir(parents=True)
        # The Debian package uses the standard global schema directory and
        # GLib's existing dpkg path trigger. No maintainer script runs in a
        # user's session, and no compiled host schema cache is shipped.
        for source in sorted((ROOT / "extension").iterdir()):
            if source.is_file() and (source.suffix in {".js", ".css", ".json"} or source.name == "LICENSE"):
                shutil.copyfile(source, extension / source.name)
        schemas = stage / "usr/share/glib-2.0/schemas"
        schemas.mkdir(parents=True)
        for source in sorted((ROOT / "extension/schemas").glob("*.gschema.xml")):
            shutil.copyfile(source, schemas / source.name)
        subprocess.run(["glib-compile-schemas", "--strict", "--dry-run", str(schemas)], check=True)
        docs = stage / "usr/share/doc" / PACKAGE
        docs.mkdir(parents=True)
        shutil.copyfile(ROOT / "LICENSE", docs / "copyright")
        shutil.copyfile(ROOT / "docs/DEBIAN.md", docs / "README.Debian")
        changelog = (
            f"{PACKAGE} ({VERSION}) unstable; urgency=low\n\n"
            "  * Initial local development-preview package for GNOME 50.\n\n"
            " -- Lilt contributors <noreply@github.com>  Mon, 05 Oct 2026 00:00:00 +0000\n"
        )
        (docs / "changelog.Debian.gz").write_bytes(gzip.compress(changelog.encode(), mtime=0))
        control = stage / "DEBIAN"
        control.mkdir()
        files = sorted(p for p in (stage / "usr").rglob("*") if p.is_file())
        installed_size = sum(math.ceil(p.stat().st_size / 1024) for p in files)
        (control / "control").write_text(
            f"Package: {PACKAGE}\nVersion: {VERSION}\nArchitecture: all\n"
            "Section: gnome\nPriority: optional\n"
            "Maintainer: Lilt contributors <noreply@github.com>\n"
            "Depends: gnome-shell (>= 50), gnome-shell (<< 51), gir1.2-adw-1, libglib2.0-bin\n"
            f"Installed-Size: {installed_size}\n"
            "Homepage: https://github.com/eggp-dev/lilt\n"
            "Description: floating volume and media surface for GNOME 50\n"
            " A native GNOME Shell extension for volume, mute and MPRIS feedback.\n"
            " Development preview. Enable it separately in your GNOME session.\n"
        )
        (control / "md5sums").write_text("".join(
            f"{hashlib.md5(p.read_bytes()).hexdigest()}  {p.relative_to(stage)}\n" for p in files
        ))
        for p in [stage, *stage.rglob("*")]:
            p.chmod(0o755 if p.is_dir() else 0o644)
            os.utime(p, (EPOCH, EPOCH))
        subprocess.run([
            "dpkg-deb", "--root-owner-group", "-Zxz", "--build", str(stage), str(OUTPUT)
        ], check=True, env={**os.environ, "SOURCE_DATE_EPOCH": str(EPOCH)})
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    (OUTPUT.parent / "lilt.deb.sha256").write_text(f"{digest}  lilt.deb\n")
    print(f"Built: {OUTPUT}\nInstall when ready: sudo apt install ./dist/lilt.deb")


if __name__ == "__main__":
    build()
