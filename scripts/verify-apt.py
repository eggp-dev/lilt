#!/usr/bin/env python3
"""Check APT in disposable state. Never installs packages or modifies host trust."""
import argparse
from contextlib import contextmanager
from functools import partial
import hashlib
import http.server
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
import urllib.request
from apt_archive import validate


@contextmanager
def local_url(site):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(site)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/apt"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def verify(url, fingerprint, unsigned=False):
    with tempfile.TemporaryDirectory(prefix="lilt-apt-verify-") as temp:
        root = Path(temp)
        for name in ["etc/apt/apt.conf.d", "etc/apt/preferences.d", "var/lib/apt/lists/partial", "var/lib/dpkg", "var/cache/apt/archives/partial", "var/log/apt", "download", "gpg"]:
            (root / name).mkdir(parents=True, exist_ok=True)
        shutil.copyfile("/var/lib/dpkg/status", root / "var/lib/dpkg/status")
        key = root / "etc/apt/lilt.gpg"
        (root / "gpg").chmod(0o700)
        if not unsigned:
            request = urllib.request.Request(url + "/lilt-archive-keyring.gpg", headers={"User-Agent": "Lilt-APT-verification"})
            with urllib.request.urlopen(request, timeout=30) as response:
                key.write_bytes(response.read())
            public = subprocess.check_output(["gpg", "--homedir", str(root / "gpg"), "--batch", "--with-colons", "--show-keys", str(key)], text=True)
            fps = [line.split(":")[9] for line in public.splitlines() if line.startswith("fpr:")]
            if fps != [fingerprint]:
                raise ValueError("Downloaded public key does not match the approved fingerprint.")
        else:
            key.write_bytes(b"")
        (root / "etc/apt/sources.list").write_text(f"deb [arch=amd64 signed-by={key}] {url} stable main\n")
        (root / "etc/apt/preferences.d/lilt").write_text(
            "Package: lilt gnome-shell-extension-lilt\nPin: release o=Lilt\nPin-Priority: 500\n\n"
            "Package: *\nPin: release o=Lilt\nPin-Priority: -1\n"
        )
        conf = root / "apt.conf"
        conf.write_text(
            f'Dir "{root}";\nDir::Etc "{root}/etc/apt";\n'
            'Dir::Etc::sourcelist "sources.list";\nDir::Etc::sourceparts "-";\n'
            'Dir::Etc::main "empty.conf";\nDir::Etc::parts "apt.conf.d";\n'
            f'Dir::Etc::trusted "{root}/etc/apt/no-global.gpg";\nDir::Etc::trustedparts "-";\n'
            f'Dir::State "{root}/var/lib/apt";\nDir::State::status "{root}/var/lib/dpkg/status";\n'
            f'Dir::Cache "{root}/var/cache/apt";\nDir::Log "{root}/var/log/apt";\n'
            'APT::Architecture "amd64";\nAcquire::Languages "none";\n'
            'Acquire::AllowInsecureRepositories "false";\nAPT::Get::AllowUnauthenticated "false";\n'
        )
        import os
        env = {**os.environ, "APT_CONFIG": str(conf), "LC_ALL": "C"}
        dump = subprocess.check_output(["apt-config", "dump"], env=env, text=True)
        if "/etc/apt/apt.conf.d" in dump.replace(str(root), "ISOLATED") or "Post-Invoke" in dump:
            raise ValueError("Unexpected host configuration or hooks.")
        update = subprocess.run(["apt-get", "update", "--error-on=any"], env=env, capture_output=True, text=True)
        if unsigned:
            if update.returncode == 0 or "not signed" not in update.stderr:
                raise ValueError("Unsigned repository was not rejected by normal APT authentication.")
            return {"unsigned_rejected": True, "host_apt_changed": False}
        if update.returncode:
            raise RuntimeError(update.stdout + update.stderr)
        policy = subprocess.check_output(["apt-cache", "policy", "lilt", "gnome-shell-extension-lilt"], env=env, text=True)
        candidates = re.findall(r"Candidate: ([^\n]+)", policy)
        if len(candidates) != 2 or candidates[0] != candidates[1] or candidates[0] == "(none)":
            raise ValueError("The two packages do not have matching candidates.")
        simulation = subprocess.run(["apt-get", "--simulate", "install", "lilt"], env=env, capture_output=True, text=True)
        if simulation.returncode or "0 to remove" not in simulation.stdout:
            raise RuntimeError(simulation.stdout + simulation.stderr)
        subprocess.run(["apt-get", "download", "lilt", "gnome-shell-extension-lilt"], env=env, cwd=root / "download", check=True, capture_output=True)
        files = sorted((root / "download").glob("*.deb"))
        if len(files) != 2:
            raise ValueError("Expected two authenticated package downloads.")
        return {"url": url, "fingerprint": fingerprint, "candidate": candidates[0], "apt_update_authenticated": True,
                "install_simulation": simulation.stdout.strip(), "downloads": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
                "host_apt_changed": False, "real_install": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    location = parser.add_mutually_exclusive_group(required=True)
    location.add_argument("--site", type=Path)
    location.add_argument("--url")
    parser.add_argument("--fingerprint")
    parser.add_argument("--reject-unsigned", action="store_true")
    args = parser.parse_args()
    if not args.reject_unsigned and not re.fullmatch(r"[A-F0-9]{40}", args.fingerprint or ""):
        parser.error("An independently approved exact signing fingerprint is required.")
    if args.url and args.url.rstrip("/") != "https://eggp-dev.github.io/lilt/apt":
        parser.error("Remote verification is restricted to the official HTTPS Lilt archive.")
    if args.site:
        validate(args.site)
        with local_url(args.site.resolve()) as url:
            report = verify(url, args.fingerprint, args.reject_unsigned)
    else:
        report = verify(args.url.rstrip("/"), args.fingerprint, args.reject_unsigned)
    print(json.dumps(report, indent=2))
