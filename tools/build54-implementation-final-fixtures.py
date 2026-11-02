import subprocess,os,re,json
from pathlib import Path
rows=[]
for name in ['medical-regressions','build32-roles']:
 s=Path('tests/'+name+'.mjs').read_text();prefix='build54-implementation-final-'+name+'-';s=s.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix);s=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,s);p=Path('tests/.build54-final-'+name+'.mjs');p.write_text(s);env=os.environ.copy();env.update({'MEDICAL_OUTPUT':'docs/quality-reviews/'+prefix+'.json','MEDICAL_CAPTURE_PREFIX':prefix,'ROLE_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ROLE_CAPTURE_PREFIX':prefix})
 try:
  r=subprocess.run(['node',str(p)],env=env,capture_output=True,text=True);Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode});print(name,r.returncode,flush=True)
 finally:p.unlink()
Path('docs/quality-reviews/build54-implementation-final-fixtures.json').write_text(json.dumps(rows,indent=2))
r=subprocess.run(['node','tools/build54-implementation-browser.mjs'],capture_output=True,text=True);Path('docs/quality-reviews/build54-implementation-browser-final.txt').write_text(r.stdout+r.stderr);print('focused browser',r.returncode,flush=True)
