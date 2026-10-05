#!/usr/bin/env python3
"""Sign a reviewed archive with an existing approved local key. No key creation."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
from apt_archive import landing, validate

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--site", required=True, type=Path)
parser.add_argument("--gnupg-home", required=True, type=Path)
parser.add_argument("--fingerprint", required=True)
args = parser.parse_args()
if not re.fullmatch(r"[A-F0-9]{40}", args.fingerprint):
    parser.error("Use the exact uppercase primary signing fingerprint.")
archive = args.site.resolve() / "apt"
validate(args.site)
distribution = archive / "dists/stable"
if (distribution / "InRelease").exists() or (distribution / "Release.gpg").exists():
    parser.error("This bundle is already signed; rebuild a fresh bundle to renew it.")
if not args.gnupg_home.is_dir():
    parser.error("Approved signing home must already exist.")
base = ["gpg", "--homedir", str(args.gnupg_home.resolve()), "--batch", "--local-user", args.fingerprint + "!"]
key = subprocess.check_output(base + ["--export-options", "export-minimal", "--export", args.fingerprint])
if not key:
    raise SystemExit("Public key export was empty.")
with tempfile.TemporaryDirectory(prefix="lilt-apt-sign-") as temp:
    t = Path(temp)
    public = t / "lilt-archive-keyring.gpg"
    public.write_bytes(key)
    shown = subprocess.check_output(["gpg", "--homedir", temp, "--batch", "--with-colons", "--show-keys", str(public)], text=True)
    fingerprints = [line.split(":")[9] for line in shown.splitlines() if line.startswith("fpr:")]
    if fingerprints != [args.fingerprint]:
        raise SystemExit("Expected a single exact primary signing key; no implicit subkeys.")
    release = distribution / "Release"
    subprocess.run(base + ["--digest-algo", "SHA256", "--armor", "--output", str(t / "InRelease"), "--clearsign", str(release)], check=True)
    subprocess.run(base + ["--digest-algo", "SHA256", "--armor", "--output", str(t / "Release.gpg"), "--detach-sign", str(release)], check=True)
    subprocess.run(["gpgv", "--homedir", temp, "--keyring", str(public), str(t / "InRelease")], check=True)
    subprocess.run(["gpgv", "--homedir", temp, "--keyring", str(public), str(t / "Release.gpg"), str(release)], check=True)
    for name in ["InRelease", "Release.gpg"]:
        (distribution / name).write_bytes((t / name).read_bytes())
    (archive / public.name).write_bytes(key)
manifest = json.loads((archive / "archive.json").read_text())
manifest.update(signed=True, fingerprint=args.fingerprint)
(archive / "archive.json").write_text(json.dumps(manifest, indent=2) + "\n")
(archive / "fingerprint.txt").write_text(args.fingerprint + "\n")
(archive / "index.html").write_text(landing(args.fingerprint))
print("Verified signatures with public key", args.fingerprint)
