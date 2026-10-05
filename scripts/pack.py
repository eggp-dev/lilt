#!/usr/bin/env python3
"""Build only. Never installs or enables the extension."""
from pathlib import Path
import subprocess, zipfile
root=Path(__file__).resolve().parent.parent
subprocess.run(['glib-compile-schemas','--strict',str(root/'extension/schemas')],check=True)
out=root/'dist/lilt@eggp-dev.github.io.shell-extension.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
    for file in sorted((root/'extension').rglob('*')):
        if file.is_file(): archive.write(file,file.relative_to(root/'extension'))
print(out)
