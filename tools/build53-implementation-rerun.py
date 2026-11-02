import subprocess,os,json,re
from pathlib import Path
rows=[]
for name in ['warden-art-regressions','warden-locomotion-regressions','build50-breacher','build53-feedback','attacker-readability-regressions']:
 src=Path('tests/'+name+'.mjs');body=src.read_text();prefix='build53-implementation-rerun-'+name+'-';body=body.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix);body=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,body);copy=Path('tests/.build53-rerun-'+name+'.mjs');copy.write_text(body);env=os.environ.copy();env.update({'WARDEN_OBSERVATIONS':'docs/quality-reviews/'+prefix+'.json','WARDEN_CAPTURE_PREFIX':prefix,'ATTACKER_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ATTACKER_CAPTURE_PREFIX':prefix})
 try:
  r=subprocess.run(['node',str(copy)],env=env,capture_output=True,text=True);Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode});print(name,r.returncode,flush=True)
 finally:copy.unlink(missing_ok=True)
 Path('docs/quality-reviews/build53-implementation-reruns.json').write_text(json.dumps(rows,indent=2))
