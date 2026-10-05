#!/usr/bin/env python3
"""Archive integrity and preservation checks; no keys or host APT writes."""
from datetime import datetime, timezone
import gzip
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from apt_archive import build, fields, validate


class ArchiveTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="lilt-apt-tests-")
        cls.root = Path(cls.temp.name)
        cls.deb = Path(sys.argv_payload).resolve()
        cls.site = cls.root / "site"
        cls.version = build(cls.deb, cls.site)

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def copy(self, name):
        return Path(shutil.copytree(self.site, self.root / name))

    def test_exact_alias_dependency_and_hash_chain(self):
        self.assertEqual(validate(self.site), self.version)

    def test_original_release_payload_preserved(self):
        payload = self.site / f"apt/pool/main/l/lilt/gnome-shell-extension-lilt_{self.version}_all.deb"
        self.assertEqual(payload.read_bytes(), self.deb.read_bytes())

    def test_existing_output_is_never_overwritten(self):
        before = (self.site / "apt/dists/stable/Release").read_bytes()
        with self.assertRaises(ValueError):
            build(self.deb, self.site)
        self.assertEqual(before, (self.site / "apt/dists/stable/Release").read_bytes())

    def test_modified_package_is_rejected(self):
        site = self.copy("tampered-pool")
        payload = next((site / "apt/pool").rglob("gnome*.deb"))
        data = bytearray(payload.read_bytes())
        data[-1] ^= 1
        payload.write_bytes(data)
        with self.assertRaisesRegex(ValueError, "digest mismatch"):
            validate(site)

    def test_modified_index_is_rejected(self):
        site = self.copy("tampered-index")
        path = site / "apt/dists/stable/main/binary-amd64/Packages"
        path.write_text(path.read_text().replace("Priority: optional", "Priority: required"))
        with self.assertRaises(ValueError):
            validate(site)

    def test_modified_by_hash_is_rejected(self):
        site = self.copy("tampered-hash")
        path = next((site / "apt/dists/stable/main/binary-amd64/by-hash/SHA256").iterdir())
        path.write_bytes(b"wrong index")
        with self.assertRaisesRegex(ValueError, "By-hash"):
            validate(site)

    def test_foreign_package_and_traversal_are_rejected(self):
        for label, old, new in [("foreign", "Package: lilt\n", "Package: conn\n"),
                                ("traversal", "Filename: pool/", "Filename: ../../pool/")]:
            site = self.copy(label)
            path = site / "apt/dists/stable/main/binary-amd64/Packages"
            path.write_text(path.read_text().replace(old, new))
            with self.assertRaises(ValueError):
                validate(site)

    def test_alias_is_deterministic_without_maintainer_scripts(self):
        other = self.root / "second"
        build(self.deb, other)
        relative = f"apt/pool/main/l/lilt/lilt_{self.version}_all.deb"
        self.assertEqual((self.site / relative).read_bytes(), (other / relative).read_bytes())
        output = subprocess.check_output(["dpkg-deb", "--ctrl-tarfile", str(self.site / relative)])
        import tarfile, io
        with tarfile.open(fileobj=io.BytesIO(output)) as archive:
            self.assertEqual(set(archive.getnames()), {".", "./control"})


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python3 tests/apt.test.py PATH_TO_RELEASE_DEB")
    sys.argv_payload = sys.argv.pop(1)
    unittest.main()
