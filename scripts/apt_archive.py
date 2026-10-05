#!/usr/bin/env python3
"""Build an unsigned signing bundle. Never creates a key or changes host APT."""
import argparse
from datetime import datetime, timedelta, timezone
from email.utils import format_datetime, parsedate_to_datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://eggp-dev.github.io/lilt/apt"
PACKAGES = {"lilt", "gnome-shell-extension-lilt"}


def fields(text):
    result = {}
    for line in text.splitlines():
        if line and not line[0].isspace():
            key, value = line.split(":", 1)
            result[key] = value.strip()
    return result


def control(deb):
    return subprocess.check_output(["dpkg-deb", "--field", str(deb)], text=True)


def alias_package(version, output):
    subprocess.run(["dpkg", "--validate-version", version], check=True)
    with tempfile.TemporaryDirectory(prefix="lilt-apt-alias-") as temp:
        stage = Path(temp)
        (stage / "DEBIAN").mkdir()
        (stage / "DEBIAN/control").write_text(
            f"Package: lilt\nVersion: {version}\nArchitecture: all\n"
            "Section: gnome\nPriority: optional\n"
            "Maintainer: Lilt contributors <noreply@github.com>\n"
            f"Depends: gnome-shell-extension-lilt (= {version})\n"
            "Homepage: https://github.com/eggp-dev/lilt\n"
            "Description: install Lilt volume and media feedback for GNOME 50\n"
            " A small package that follows the native GNOME Shell extension.\n"
        )
        docs = stage / "usr/share/doc/lilt"
        docs.mkdir(parents=True)
        shutil.copyfile(ROOT / "LICENSE", docs / "copyright")
        for p in [stage, *stage.rglob("*")]:
            p.chmod(0o755 if p.is_dir() else 0o644)
            # Deterministic alias; the repository timestamps are separate.
            os.utime(p, (1791158400, 1791158400))
        subprocess.run(["dpkg-deb", "--root-owner-group", "-Zxz", "--build", str(stage), str(output)], check=True)


def landing(fingerprint=None):
    status = "Not published: unsigned signing bundle."
    if fingerprint:
        status = f"Signed archive. Public signing fingerprint: <code>{fingerprint}</code>"
    return (
        "<!doctype html><html lang='en'><meta charset='utf-8'>"
        "<meta name='viewport' content='width=device-width'><title>Lilt APT archive</title>"
        "<style>body{font:17px system-ui;max-width:48rem;margin:4rem auto;padding:0 1.5rem;"
        "line-height:1.65;color:#222;background:#faf9f6}code{overflow-wrap:anywhere}</style>"
        "<h1>Lilt APT archive</h1><p>Volume, mute and music for GNOME 50.</p>"
        f"<p>{status}</p><p>Ubuntu 26.04, amd64. Suite: stable. Component: main.</p>"
        "<p><a href='https://github.com/eggp-dev/lilt/blob/main/docs/APT.md'>"
        "Setup, updates, verification and removal</a></p>"
        "<p><a href='dists/stable/InRelease'>InRelease</a> · "
        "<a href='lilt-archive-keyring.gpg'>Public key</a></p></html>\n"
    )


def build(deb, site, now=None):
    site = Path(site).resolve()
    if site.exists():
        raise ValueError("Output already exists; use a fresh directory. Existing archives are preserved.")
    source_control = control(deb)
    source_fields = fields(source_control)
    if source_fields.get("Package") != "gnome-shell-extension-lilt" or source_fields.get("Architecture") != "all":
        raise ValueError("Only Lilt's architecture-all extension package is accepted.")
    version = source_fields["Version"]
    subprocess.run(["dpkg", "--validate-version", version], check=True)
    if any(c in version for c in "/\\\x00\n"):
        raise ValueError("Unsafe package version.")
    with tempfile.TemporaryDirectory(prefix="lilt-apt-stage-", dir=site.parent) as temp:
        stage = Path(temp)
        archive = stage / "apt"
        pool = archive / "pool/main/l/lilt"
        pool.mkdir(parents=True)
        payload = pool / f"gnome-shell-extension-lilt_{version}_all.deb"
        shutil.copyfile(deb, payload)
        alias = pool / f"lilt_{version}_all.deb"
        alias_package(version, alias)
        entries = []
        for p in [payload, alias]:
            text = control(p).rstrip() + "\n"
            assert fields(text)["Package"] in PACKAGES
            data = p.read_bytes()
            text += f"Filename: {p.relative_to(archive)}\nSize: {len(data)}\n"
            for field, algorithm in [("SHA256", "sha256"), ("SHA512", "sha512")]:
                text += f"{field}: {hashlib.new(algorithm, data).hexdigest()}\n"
            entries.append(text)
        binary = archive / "dists/stable/main/binary-amd64"
        binary.mkdir(parents=True)
        index = binary / "Packages"
        index.write_text("\n".join(entries) + "\n")
        (binary / "Packages.gz").write_bytes(gzip.compress(index.read_bytes(), mtime=0))
        # Immutable hash paths keep clients consistent during a Pages deployment.
        for p in [index, binary / "Packages.gz"]:
            for algorithm in ["SHA256", "SHA512"]:
                hashed = binary / "by-hash" / algorithm / hashlib.new(algorithm.lower(), p.read_bytes()).hexdigest()
                hashed.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(p, hashed)
        now = now or datetime.now(timezone.utc)
        release = (
            "Origin: Lilt\nLabel: Lilt\nSuite: stable\nCodename: stable\n"
            f"Date: {format_datetime(now, usegmt=True)}\n"
            f"Valid-Until: {format_datetime(now + timedelta(days=90), usegmt=True)}\n"
            "Architectures: amd64\nComponents: main\nAcquire-By-Hash: yes\n"
            "Description: Lilt native volume and media surface for GNOME 50\n"
        )
        distribution = archive / "dists/stable"
        for algorithm in ["SHA256", "SHA512"]:
            release += algorithm + ":\n"
            for p in [index, binary / "Packages.gz"]:
                release += f" {hashlib.new(algorithm.lower(), p.read_bytes()).hexdigest()} {p.stat().st_size:16d} {p.relative_to(distribution)}\n"
        (distribution / "Release").write_text(release)
        (archive / "index.html").write_text(landing())
        (archive / "lilt.sources").write_text(
            f"Types: deb\nURIs: {BASE_URL}\nSuites: stable\nComponents: main\n"
            "Architectures: amd64\nSigned-By: /etc/apt/keyrings/lilt-archive-keyring.gpg\n"
        )
        (archive / "lilt.pref").write_text(
            "Package: lilt gnome-shell-extension-lilt\nPin: release o=Lilt\nPin-Priority: 500\n\n"
            "Package: *\nPin: release o=Lilt\nPin-Priority: -1\n"
        )
        (stage / ".nojekyll").write_text("")
        (stage / "index.html").write_text("<!doctype html><title>Lilt</title><a href='apt/'>Lilt APT archive</a>\n")
        (archive / "archive.json").write_text(json.dumps({
            "version": version, "packages": sorted(PACKAGES), "signed": False,
            "base_url": BASE_URL, "valid_until": format_datetime(now + timedelta(days=90), usegmt=True),
        }, indent=2) + "\n")
        shutil.copytree(stage, site)
    return version


def validate(site):
    """Check the signed hash chain's local inputs, without trusting a manifest."""
    archive = Path(site).resolve() / "apt"
    distribution = archive / "dists/stable"
    binary = distribution / "main/binary-amd64"
    index = binary / "Packages"
    entries = [fields(e) for e in index.read_text().strip().split("\n\n")]
    if len(entries) != 2 or {e["Package"] for e in entries} != PACKAGES:
        raise ValueError("The archive must contain exactly Lilt's two packages.")
    versions = {e["Version"] for e in entries}
    if len(versions) != 1:
        raise ValueError("Alias and extension versions differ.")
    version = versions.pop()
    for entry in entries:
        filename = entry["Filename"]
        p = (archive / filename).resolve()
        if not p.is_relative_to(archive) or Path(filename).is_absolute():
            raise ValueError("Unsafe pool path.")
        data = p.read_bytes()
        if int(entry["Size"]) != len(data):
            raise ValueError("Package size mismatch.")
        for algorithm in ["SHA256", "SHA512"]:
            if hashlib.new(algorithm.lower(), data).hexdigest() != entry[algorithm]:
                raise ValueError("Package digest mismatch.")
        actual = fields(control(p))
        if any(actual[k] != entry[k] for k in ["Package", "Version", "Architecture"]):
            raise ValueError("Package metadata mismatch.")
        if entry["Package"] == "lilt" and actual.get("Depends") != f"gnome-shell-extension-lilt (= {version})":
            raise ValueError("Alias dependency is not an exact extension version.")
        if actual["Architecture"] != "all":
            raise ValueError("Unexpected package architecture.")
        if entry["Package"] == "gnome-shell-extension-lilt":
            dependencies = actual.get("Depends", "")
            if "gnome-shell (>= 50)" not in dependencies or "gnome-shell (<< 51)" not in dependencies:
                raise ValueError("The extension must retain GNOME 50 dependency bounds.")
    if gzip.decompress((binary / "Packages.gz").read_bytes()) != index.read_bytes():
        raise ValueError("Compressed index differs.")
    release = (distribution / "Release").read_text()
    release_fields = fields(release)
    for name, expected in {"Origin": "Lilt", "Label": "Lilt", "Suite": "stable", "Codename": "stable", "Architectures": "amd64", "Components": "main", "Acquire-By-Hash": "yes"}.items():
        if release_fields.get(name) != expected:
            raise ValueError("Unexpected Release identity or architecture.")
    date = parsedate_to_datetime(release_fields["Date"])
    expiry = parsedate_to_datetime(release_fields["Valid-Until"])
    now = datetime.now(timezone.utc)
    if date > now + timedelta(minutes=10) or expiry <= now or expiry - date > timedelta(days=90):
        raise ValueError("Release date/expiry is invalid or expired; rebuild and sign fresh metadata.")
    for algorithm in ["SHA256", "SHA512"]:
        block = release.split(algorithm + ":\n", 1)[1].split("\n" + ("SHA512:" if algorithm == "SHA256" else "\x00"), 1)[0]
        records = [line.split() for line in block.splitlines() if line.startswith(" ")]
        if {line[2] for line in records} != {"main/binary-amd64/Packages", "main/binary-amd64/Packages.gz"}:
            raise ValueError("Release must authenticate both exact indexes.")
        for digest, size, name in records:
            p = distribution / name
            data = p.read_bytes()
            if len(data) != int(size) or hashlib.new(algorithm.lower(), data).hexdigest() != digest:
                raise ValueError("Release/index digest mismatch.")
            if (binary / "by-hash" / algorithm / digest).read_bytes() != data:
                raise ValueError("By-hash index differs.")
    return version


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deb", required=True, type=Path)
    parser.add_argument("--site", required=True, type=Path)
    args = parser.parse_args()
    args.site.parent.mkdir(parents=True, exist_ok=True)
    print("Built unsigned bundle", args.site, "version", build(args.deb, args.site))
