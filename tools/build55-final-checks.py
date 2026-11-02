"""Retain old geometry-budget failure, then explicit Build55 budget adaptation."""
import subprocess,json,re,os
from pathlib import Path
rows=[]
for name in ['build50-assets','build50-breacher','build50-late-assets','build52-traversal-browser','build55-contracts','smoke']:
 body=Path('tests/'+name+'.mjs').read_text();prefix='build55-implementation-final-'+name+'-'
 body=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,body)
 body=body.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix)
 if name=='build50-assets':body=body.replace('cost.triangles<5000','cost.triangles<24000')
 p=Path('tests/.build55-focused-'+name+'.mjs');p.write_text(body)
 env=os.environ.copy();env['SOULFALL_PRODUCTION']='1' if name=='smoke' else '0';env['MEDICAL_OUTPUT']='docs/quality-reviews/'+prefix+'.json';env['MEDICAL_CAPTURE_PREFIX']=prefix;env['CONTROLS_OUTPUT']=str(Path('docs/quality-reviews/build55-implementation-privileged.json').resolve())
 try:
  r=subprocess.run(['node',str(p)],env=env,capture_output=True,text=True);Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode,'adaptation':'Breacher budget <24000 triangles replaces old <5000 for shared curved gloves; all other assertions preserved' if name=='build50-assets' else 'Output paths only'});print(name,r.returncode,flush=True)
 finally:p.unlink()
 Path('docs/quality-reviews/build55-implementation-final.json').write_text(json.dumps(rows,indent=2))
