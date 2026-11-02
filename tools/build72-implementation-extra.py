import os,re,json,subprocess
from pathlib import Path
rows=[]
for mode,n in [('glb','build51-coordination'),('glb','build67-anchor')]+[(m,n) for m in ['glb','fallback'] for n in ['drone-alignment-regressions','build65-sentinel-cycle','build47-contact','build50-breacher']]:
 tag='build72-implementation-extra-'+mode+'-'+n;s=Path('tests/'+n+'.mjs').read_text()
 s=re.sub(r'docs/(media|quality-reviews)/(?:current-|build\d+[-/])',lambda m:'docs/'+m[1]+'/'+tag+'-',s).replace('docs/current-','docs/quality-reviews/'+tag+'-')
 if mode=='fallback':s=s.replace("await p.goto(","await p.route('**/assets/build72-implementation-sentinel.glb',r=>r.abort());await p.goto(")
 p=Path('tests/.'+tag+'.mjs');p.write_text(s)
 env={**os.environ,**{k:'docs/quality-reviews/'+tag+'.json' for k in ['DRONE_OBSERVATIONS','SENTINEL_CYCLE_OUTPUT','CONTACT_CHECK_OUTPUT']}}
 try:
  with open('docs/quality-reviews/'+tag+'.txt','w') as out:r=subprocess.run(['node',str(p)],env=env,stdout=out,stderr=subprocess.STDOUT,timeout=360)
  rows.append({'mode':mode,'name':n,'exit':r.returncode});print(tag,r.returncode,flush=True)
 finally:p.unlink(missing_ok=True)
 Path('docs/quality-reviews/build72-implementation-extra.json').write_text(json.dumps(rows,indent=2)+'\n')
