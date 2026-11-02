"""Sequential affected checks; temporary sibling copies change output destinations ONLY."""
import os,re,json,subprocess,hashlib
from pathlib import Path
names=['drone-alignment-regressions','drone-lifecycle-edges','attacker-readability-regressions','build47-contact','build50-breacher','build65-sentinel-cycle','build46-coordination','build51-steering','build32-role-contracts','build32-roles','movement-browser-regressions','phase-handling-regressions','build38-planning','build67-anchor','normal-controls-playtest']
names=[n for n in names if Path('tests/'+n+'.mjs').exists()]
rows=[]
for n in names:
 src=Path('tests/'+n+'.mjs');s=src.read_text();tag='build72-implementation-'+n
 # Replace only quoted capture/report destinations, never asset or test logic.
 s=re.sub(r'docs/(media|quality-reviews)/(?:current-|build\d+[-/])',lambda m:'docs/'+m[1]+'/'+tag+'-',s)
 s=s.replace('docs/current-','docs/quality-reviews/'+tag+'-')
 p=Path('tests/.'+tag+'.mjs');p.write_text(s)
 env={**os.environ}
 for key in ['DRONE_OBSERVATIONS','DRONE_EDGE_OBSERVATIONS','ATTACKER_OBSERVATIONS','CONTACT_CHECK_OUTPUT','SENTINEL_CYCLE_OUTPUT','ROLE_OUTPUT','CONTROLS_OUTPUT','WARDEN_OBSERVATIONS'] :env[key]='docs/quality-reviews/'+tag+'.json'
 for key in ['ATTACKER_CAPTURE_PREFIX','ROLE_CAPTURE_PREFIX','WARDEN_CAPTURE_PREFIX']:env[key]=tag
 try:
  with open('docs/quality-reviews/'+tag+'.txt','w') as out:r=subprocess.run(['node',str(p)],env=env,stdout=out,stderr=subprocess.STDOUT,timeout=400)
  rows.append({'name':n,'exit':r.returncode,'sourceSHA256':hashlib.sha256(src.read_bytes()).hexdigest()});print(n,r.returncode,flush=True)
 finally:p.unlink(missing_ok=True)
 Path('docs/quality-reviews/build72-implementation-suite.json').write_text(json.dumps(rows,indent=2)+'\n')
