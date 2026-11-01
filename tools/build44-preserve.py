from pathlib import Path
import subprocess,shutil
root=Path.cwd();changed=subprocess.check_output(['git','diff','--name-only','--','docs'],text=True).splitlines()
for name in changed:
 if not (name.startswith('docs/media/current-') or name.startswith('docs/current-') or name.startswith('docs/quality-reviews/current-')):continue
 p=Path(name)
 if p.is_file():
  dest=Path('docs/quality-reviews/build44-implementation-preserved')/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
  p.write_bytes(subprocess.check_output(['git','show','HEAD:'+name]))
