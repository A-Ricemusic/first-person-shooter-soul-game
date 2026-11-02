# Build app/assets without copying the multi-GB historical dossier or changing live config.
from pathlib import Path
import subprocess
r=subprocess.run(['node','node_modules/vite/bin/vite.js','build','--config','tools/build69-vite.config.mjs'],capture_output=True,text=True)
Path('docs/quality-reviews/build69-build-final.txt').write_text(r.stdout+r.stderr)
raise SystemExit(r.returncode)
