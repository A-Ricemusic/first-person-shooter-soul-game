import subprocess,json,re
from pathlib import Path
rows=[]
for name in ['build48-route','movement-regressions','build38-planning','build63-compass','normal-controls-playtest','smoke']:
 src=Path('tests/'+name+'.mjs');s=src.read_text();prefix='build63-implementation-'+name+'-'
 s=re.sub(r'docs/(media|quality-reviews)/build\d+-(?:parent-)?',lambda m:'docs/'+m[1]+'/'+prefix,s)
 s=s.replace('docs/current-','docs/quality-reviews/'+prefix).replace('/tmp/soulfall-','/tmp/'+prefix)
 temp=Path('tests/.build63-implementation-'+name+'.mjs');temp.write_text(s)
 env=dict(__import__('os').environ);env['CONTROLS_OUTPUT']=str(Path('docs/quality-reviews/build63-implementation-controls.json').resolve());env['SOULFALL_PRODUCTION']='1' if name=='smoke' else '0'
 if name=='smoke':
  r=subprocess.run(['npm','run','build'],capture_output=True,text=True);Path('docs/quality-reviews/build63-implementation-build.txt').write_text(r.stdout+r.stderr);rows.append({'name':'build','exit':r.returncode})
 try:
  r=subprocess.run(['node',str(temp)],env=env,capture_output=True,text=True,timeout=360);Path('docs/quality-reviews/'+prefix+'ship.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode})
 except subprocess.TimeoutExpired as e:rows.append({'name':name,'timeout':True})
 finally:temp.unlink()
 Path('docs/quality-reviews/build63-implementation-checks.json').write_text(json.dumps(rows,indent=2))
 print(rows[-1],flush=True)
