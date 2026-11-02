import subprocess,os,json,re
from pathlib import Path
rows=[]
for name in ['build54-perception','ending-regressions','ranged-spacing-regressions','medical-regressions','warden-art-regressions','build50-breacher','build32-role-contracts','build32-roles','warden-steering-regressions','build46-coordination','build53-feedback','attacker-readability-regressions','normal-controls-playtest']:
 src=Path('tests/'+name+'.mjs');body=src.read_text();prefix='build54-implementation-rerun-'+name+'-';body=body.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix);body=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,body);copy=Path('tests/.build54-rerun-'+name+'.mjs');copy.write_text(body);env=os.environ.copy();env.update({'WARDEN_OBSERVATIONS':'docs/quality-reviews/'+prefix+'.json','WARDEN_CAPTURE_PREFIX':prefix,'ATTACKER_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ATTACKER_CAPTURE_PREFIX':prefix,'SPACING_OBSERVATIONS':'docs/quality-reviews/'+prefix+'.json','MEDICAL_OUTPUT':'docs/quality-reviews/'+prefix+'.json','MEDICAL_CAPTURE_PREFIX':prefix,'ROLE_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ROLE_CAPTURE_PREFIX':prefix,'CONTROLS_OUTPUT':str(Path('docs/quality-reviews/build54-implementation-privileged.json').resolve())})
 try:
  r=subprocess.run(['node',str(copy)],env=env,capture_output=True,text=True);Path('docs/quality-reviews/'+prefix+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode});print(name,r.returncode,flush=True)
 finally:copy.unlink(missing_ok=True)
 Path('docs/quality-reviews/build54-implementation-reruns.json').write_text(json.dumps(rows,indent=2))
