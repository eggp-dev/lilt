# Install and update by package name

Lilt's signed archive is at **https://eggp-dev.github.io/lilt/apt/**. It targets **Ubuntu 26.04 with GNOME 50, amd64**. The payload is architecture-independent; other distributions and architectures are not verified or indexed here. GNOME 51 and older Shell versions are excluded by package dependencies.

## One-time setup

Adding a third-party APT archive is a trust decision. The approved signing fingerprint is:

```text
D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E
```

Download and inspect the small configuration helper, then review its output:

```sh
curl -fsSLo lilt-apt-setup.py https://raw.githubusercontent.com/eggp-dev/lilt/main/scripts/configure-apt.py
python3 lilt-apt-setup.py
```

The review fetches the public key, checks its exact fingerprint and the archive signature, and lists the three targets. It changes no system configuration. Once you approve the Lilt publisher:

```sh
sudo python3 lilt-apt-setup.py --apply
sudo apt update
sudo apt install lilt
```

The helper writes only `/etc/apt/keyrings/lilt-archive-keyring.gpg`, `/etc/apt/sources.list.d/lilt.sources`, and `/etc/apt/preferences.d/lilt.pref`. It refuses to overwrite a different existing file. The key is scoped with `Signed-By`; package preferences admit only `lilt` and `gnome-shell-extension-lilt` from this archive. No global `apt-key`, unsigned trust option, private key, or CI credential is installed.

`lilt` is a small installation package depending on the exact same-version `gnome-shell-extension-lilt` payload. The 0.3.0 payload is byte-for-byte identical to the original GitHub release `.deb`; existing GitHub assets and tags are preserved.

## Existing user-level extension

A copy in `~/.local/share/gnome-shell/extensions/lilt@eggp-dev.github.io` overrides the APT package. Before migration, disable Lilt, make a backup of **only that UUID directory**, and move that copy outside the extensions directory. Keep the backup. Do not overwrite the GNOME enabled-extension list or unrelated settings. See [OPERATIONS.md](OPERATIONS.md).

After installation, use a fresh login if GNOME has not discovered the system copy, then enable Lilt in GNOME Extensions. Package installation does not force-enable Lilt or restart the session. After an upgrade, the current session may still have the old JavaScript loaded; save work and use a fresh login when convenient.

## Updates

Once registered, new signed versions are available through normal APT updates:

```sh
sudo apt update
sudo apt upgrade
```

`apt upgrade` follows your system's usual policy and can update other packages too. To update only Lilt instead:

```sh
sudo apt update
sudo apt install --only-upgrade lilt gnome-shell-extension-lilt
```

The archive is maintained separately from GitHub releases. A newly published release becomes an APT candidate after the maintainer signs and publishes its archive. CI prepares the bundle; it does not possess a signing key or publish unauthenticated packages.

## Remove and recover

Disable Lilt to restore the standard GNOME OSD, then remove both packages:

```sh
gnome-extensions disable lilt@eggp-dev.github.io
sudo apt remove lilt gnome-shell-extension-lilt
```

To stop receiving this archive, remove only the three Lilt trust files listed above. Other sources and keys are preserved. Restore a saved user extension with Lilt disabled, then use a fresh login before enabling it. Installing a saved older `.deb` requires an explicit downgrade; do not force a global system downgrade. See [DEBIAN.md](DEBIAN.md).

## Verification record

On 2026-10-05, the **actual public HTTPS archive** passed authenticated `apt-get update`, `apt-cache policy lilt` (candidate **0.3.0**), download of both packages, and installation simulation in a disposable APT root. Simulation added two Lilt packages, with **zero removals or other upgrades**. No host trust or package state was changed by those checks. The extension payload SHA-256 is `3728922ae258154d6fe191df9551405ff5d19fcbc841c9a5f10b649ab32c9f2b`.

Eight archive tests check hash chains, exact alias dependencies, unchanged release payload, reproducible alias, output preservation, and rejection of modified package/index/by-hash content, foreign packages, and traversal. Default APT rejected an unsigned local test archive. Native functionality retains the [68 distinct isolated checks](VALIDATION.md); those are not real hardware or installation verification.

## Maintainer publishing

The `Prepare APT signing bundle` workflow uses a read-only GitHub token, verifies the published payload against release checksums, and uploads an unsigned bundle. Actions are pinned to commits. It runs on a published release or manual dispatch. No new permanent token or signing secret is registered.

For local preparation:

```sh
python3 tests/apt.test.py dist/release/lilt_0.3.0_all.deb
python3 scripts/apt_archive.py --deb dist/release/lilt_0.3.0_all.deb --site dist/apt-site
```

The output directory must be new. Use the existing approved private signing home, kept outside this repository, and the public fingerprint above:

```sh
python3 scripts/sign-apt.py --site dist/apt-site --gnupg-home "$LILT_SIGNING_HOME" --fingerprint D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E
python3 scripts/verify-apt.py --site dist/apt-site --fingerprint D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E
python3 scripts/publish-apt.py --site dist/apt-site
python3 scripts/publish-apt.py --site dist/apt-site --publish
python3 scripts/verify-apt.py --url https://eggp-dev.github.io/lilt/apt --fingerprint D1C4DFACB1DB4D2AF330E7C99676B4EB3B41F62E
```

`publish-apt.py` updates only `gh-pages` without force. It retains earlier pool and by-hash files, rejects changes to an immutable filename, and checks signatures before pushing. GitHub Pages serves that branch with HTTPS and `.nojekyll`. The signed `Release` has a **90-day Valid-Until**. Refresh and re-sign metadata before expiry, even if no new version is released; never disable APT validity checks to extend an expired archive. The signing key expires **2027-10-05**; rotation needs a separately approved trust transition. Back up the signing home privately and never upload its contents or revocation certificate.

References: [APT authentication](https://manpages.debian.org/testing/apt/apt-secure.8.en.html), [Signed-By sources](https://manpages.debian.org/testing/apt/sources.list.5.en.html), [GitHub Pages branch publishing](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
