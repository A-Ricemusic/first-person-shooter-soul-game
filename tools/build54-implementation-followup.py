import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
jobs=[['node','tools/build54-implementation-browser.mjs'],['python3','tools/build54-implementation-rerun.py'],['python3','tools/build54-implementation-play.py']]
rows=[]
for i,cmd in enumerate(jobs):
 r=subprocess.run(cmd,cwd=root,capture_output=True,text=True)
 (root/f'docs/quality-reviews/build54-implementation-followup-{i}.txt').write_text(r.stdout+r.stderr)
 rows.append({'cmd':cmd,'exit':r.returncode});print(cmd,r.returncode,flush=True)
 (root/'docs/quality-reviews/build54-implementation-followup.json').write_text(json.dumps(rows,indent=2))
