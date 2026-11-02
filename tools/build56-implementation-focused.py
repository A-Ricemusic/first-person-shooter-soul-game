"""Sequential focused checks, output paths in temporary sibling copies only."""
from pathlib import Path
import subprocess,os,json
rows=[]
for name in ['build56-browser','build55-contracts','normal-controls-playtest']:
 for fallback in ([False,True] if name=='build56-browser' else [False]):
  prefix='build56-implementation-focused-'+name+('-fallback' if fallback else '')
  body=Path('tests/'+name+'.mjs').read_text().replace('build55-implementation-contracts.json',prefix+'.json')
  p=Path('tests/.'+prefix+'.mjs');p.write_text(body)
  env=os.environ.copy();env['POSTURE_FALLBACK']='1' if fallback else '0';env['CONTROLS_OUTPUT']=str(Path('docs/quality-reviews/build56-implementation-privileged.json').resolve())
  try:
   r=subprocess.run(['node',str(p)],env=env,text=True,capture_output=True);Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'fallback':fallback,'exit':r.returncode});print(prefix,r.returncode,flush=True)
  finally:p.unlink()
  Path('docs/quality-reviews/build56-implementation-focused.json').write_text(json.dumps(rows,indent=2))
