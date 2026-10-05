#!/usr/bin/env python3
"""Reviewable, user-only installer. Dry run by default; never enables or logs out."""
import argparse, ast, datetime, json, os, shutil, subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--apply',action='store_true',help='Copy into the user extension directory')
args=p.parse_args()
root=Path(__file__).resolve().parent.parent
data=Path(os.environ.get('XDG_DATA_HOME',Path.home()/'.local/share'))
target=data/'gnome-shell/extensions/lilt@eggp-dev.github.io'
stamp=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
backup=root/'backups'/stamp
print(f'Target: {target}\nBackup: {backup}\nEnable: NO\nLogout/restart: NO')
if not args.apply:
    print('Dry run only. To install: python3 scripts/install.py --apply')
    raise SystemExit(0)
enabled=subprocess.check_output(['gsettings','get','org.gnome.shell','enabled-extensions'],text=True).strip()
if 'lilt@eggp-dev.github.io' in ast.literal_eval(enabled.removeprefix('@as ')):
    raise SystemExit('Disable lilt@eggp-dev.github.io first. Refusing to replace an enabled extension.')
if target.is_symlink(): raise SystemExit('Refusing to replace a symlink.')
backup.mkdir(parents=True,exist_ok=False)
(backup/'state.json').write_text(json.dumps({'target':str(target),'enabled_extensions_before':enabled,'previous_install_existed':target.exists()},indent=2))
if target.exists(): shutil.copytree(target,backup/'extension')
subprocess.run(['glib-compile-schemas','--strict',str(root/'extension/schemas')],check=True)
staging=data/f'lilt-staging-{stamp}'
shutil.copytree(root/'extension',staging)
target.parent.mkdir(parents=True,exist_ok=True)
if target.exists(): shutil.rmtree(target)
try: staging.rename(target)
except Exception:
    if (backup/'extension').exists(): shutil.copytree(backup/'extension',target,dirs_exist_ok=True)
    raise
print('Installed on disk only. Enable separately when ready; a new Wayland login may be required for discovery.')
