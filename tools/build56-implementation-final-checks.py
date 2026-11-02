from pathlib import Path
import subprocess,json,os,re
rows=[]
for name in ['combat-regressions','phase-handling-regressions','build47-contact','normal-controls-playtest','smoke']:
 s=Path('tests/'+name+'.mjs').read_text();prefix='build56-implementation-final-'+name
 s=s.replace('docs/current-','docs/quality-reviews/'+prefix+'-').replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix+'-').replace('docs/media/current-','docs/media/'+prefix+'-')
 s=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix+'-',s)
 p=Path('tests/.'+prefix+'.mjs');p.write_text(s);env=os.environ.copy();env['CONTROLS_OUTPUT']=str(Path('docs/quality-reviews/build56-implementation-final-privileged.json').resolve())
 if name=='smoke':
  r=subprocess.run(['npm','run','build'],capture_output=True,text=True);Path('docs/quality-reviews/build56-implementation-final-build.txt').write_text(r.stdout+r.stderr);assert r.returncode==0;env['SOULFALL_PRODUCTION']='1'
 try:r=subprocess.run(['node',str(p)],env=env,capture_output=True,text=True)
 finally:p.unlink()
 Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode});print(name,r.returncode,flush=True);Path('docs/quality-reviews/build56-implementation-final-checks.json').write_text(json.dumps(rows,indent=2))
