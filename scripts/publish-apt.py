#!/usr/bin/env python3
"""Publish an already signed site to Lilt's gh-pages branch; default is review."""
import argparse
import json
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
from apt_archive import validate

REPO = "https://github.com/eggp-dev/lilt.git"
FINGERPRINT = "D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E"

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--site", type=Path, required=True)
parser.add_argument("--publish", action="store_true")
args = parser.parse_args()
site = args.site.resolve()
version = validate(site)
archive = site / "apt"
manifest = json.loads((archive / "archive.json").read_text())
if not manifest.get("signed") or manifest.get("fingerprint") != FINGERPRINT or manifest.get("version") != version:
    parser.error("Only the approved Lilt signed archive can be published.")
files = list(site.rglob("*"))
for p in files:
    if p.is_symlink() or ".git" in p.relative_to(site).parts:
        parser.error("Links and embedded Git files are not public archive inputs.")
    name = p.relative_to(site).as_posix()
    fixed = {".nojekyll", "index.html", "apt/index.html", "apt/archive.json", "apt/fingerprint.txt", "apt/lilt-archive-keyring.gpg", "apt/lilt.sources", "apt/lilt.pref", "apt/dists/stable/Release", "apt/dists/stable/Release.gpg", "apt/dists/stable/InRelease", "apt/dists/stable/main/binary-amd64/Packages", "apt/dists/stable/main/binary-amd64/Packages.gz"}
    immutable = re.fullmatch(r"apt/pool/main/l/lilt/(?:lilt|gnome-shell-extension-lilt)_[0-9A-Za-z.+:~\-]+_all\.deb|apt/dists/stable/main/binary-amd64/by-hash/(?:SHA256/[a-f0-9]{64}|SHA512/[a-f0-9]{128})", name)
    if p.is_file() and name not in fixed and not immutable:
        parser.error("Unexpected public archive file: " + name)
with tempfile.TemporaryDirectory(prefix="lilt-pages-publish-") as temp:
    root = Path(temp)
    gpg_home = root / "gpg"
    gpg_home.mkdir(mode=0o700)
    key = archive / "lilt-archive-keyring.gpg"
    shown = subprocess.check_output(["gpg", "--homedir", str(gpg_home), "--batch", "--with-colons", "--show-keys", str(key)], text=True)
    if [line.split(":")[9] for line in shown.splitlines() if line.startswith("fpr:")] != [FINGERPRINT]:
        parser.error("Public key fingerprint differs.")
    for sig, original in [("InRelease", None), ("Release.gpg", "Release")]:
        command = ["gpgv", "--homedir", str(gpg_home), "--keyring", str(key), str(archive / "dists/stable" / sig)]
        if original:
            command.append(str(archive / "dists/stable" / original))
        subprocess.run(command, check=True)
    print("Verified version", version, "for", REPO, "branch gh-pages; public key", FINGERPRINT)
    if args.publish:
        checkout = root / "checkout"
        subprocess.run(["git", "init", "--initial-branch=gh-pages", str(checkout)], check=True)
        def git(*arguments, **kwargs):
            return subprocess.run(["git", "-C", str(checkout), *arguments], check=True, **kwargs)
        git("remote", "add", "origin", REPO)
        remote = subprocess.run(["git", "ls-remote", "--exit-code", "--heads", REPO, "gh-pages"], capture_output=True, text=True)
        if remote.returncode not in {0, 2}:
            raise SystemExit("Cannot read existing gh-pages branch; no publication attempted.")
        if remote.returncode == 0:
            git("fetch", "--depth=1", "origin", "gh-pages")
            git("checkout", "-B", "gh-pages", "FETCH_HEAD")
        # Retain previous pool and by-hash files for clients with cached metadata.
        for source in files:
            if not source.is_file():
                continue
            target = checkout / source.relative_to(site)
            target.parent.mkdir(parents=True, exist_ok=True)
            immutable = "/pool/" in str(source) or "/by-hash/" in str(source)
            if immutable and target.exists() and target.read_bytes() != source.read_bytes():
                raise SystemExit("An immutable package/index name already has different bytes; publication stopped.")
            shutil.copyfile(source, target)
        git("add", ".")
        changed = subprocess.run(["git", "-C", str(checkout), "diff", "--cached", "--quiet"])
        if changed.returncode == 0:
            print("Archive already matches; no duplicate commit or push.")
        elif changed.returncode == 1:
            git("-c", "user.name=Lilt contributors", "-c", "user.email=noreply@github.com", "commit", "-m", f"Publish signed Lilt APT archive {version}")
            git("push", "origin", "gh-pages")
        else:
            raise SystemExit("Cannot inspect publication diff.")
    else:
        print("Review only. Add --publish after local APT verification to push; Pages setup is separate.")
