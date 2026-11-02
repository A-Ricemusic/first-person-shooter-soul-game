"""Sequential Build43 checks; sibling test copies change output paths only."""
import hashlib,json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SPECS=[('ending','ending-regressions.mjs'),('movement','movement-browser-regressions.mjs'),('roles','build32-roles.mjs'),('route','build48-route.mjs'),('production','smoke.mjs')]
report={'method':'Original check logic in temporary sibling copies; only report/capture output locations changed. Sequential processes; no concurrent test browsers. Controls are privileged exact-information gameplay, not ordinary discovery.','rows':[],'sources':[]}
copies={}
try:
 for name,filename in SPECS:
  src=ROOT/'tests'/filename;body=src.read_text();copy=ROOT/'tests'/('.build51-implementation-final-layout-'+name+'.mjs');prefix='build51-implementation-final-layout-'+name+'-'
  updated=body.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix)
  import re
  updated=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,updated)
  copy.write_text(updated);copies[name]=copy
  report['sources'].append({'name':name,'original':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(body.encode()).hexdigest(),'outputCopySha256':hashlib.sha256(updated.encode()).hexdigest()})
 for name,_ in SPECS:
  if name=='production':
   start=time.monotonic();r=subprocess.run(['npm','run','build'],cwd=ROOT,text=True,capture_output=True)
   (ROOT/'docs/quality-reviews/build51-implementation-final-layout-build.txt').write_text(r.stdout+r.stderr)
   report['rows'].append({'name':'production-build','exit':r.returncode,'seconds':time.monotonic()-start})
   if r.returncode:break
  env=os.environ.copy();prefix='build51-implementation-final-layout-'+name
  env.update({'MEDICAL_OUTPUT':'docs/quality-reviews/'+prefix+'.json','MEDICAL_CAPTURE_PREFIX':prefix,'WARDEN_OBSERVATIONS':'docs/quality-reviews/'+prefix+'.json','WARDEN_CAPTURE_PREFIX':prefix,'ROLE_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ROLE_CAPTURE_PREFIX':prefix,'SPACING_OBSERVATIONS':'docs/quality-reviews/build51-implementation-final-layout-spacing.json','ART_OUTPUT_PREFIX':prefix,'CUSTODIAN_FEEDBACK_OUTPUT':'docs/quality-reviews/'+prefix+'.json','CONTROLS_OUTPUT':str(ROOT/'docs/quality-reviews/build51-implementation-final-layout-controls.json')})
  if name=='production':env['SOULFALL_PRODUCTION']='1'
  start=time.monotonic();r=subprocess.run(['node',str(copies[name].relative_to(ROOT))],cwd=ROOT,env=env,text=True,capture_output=True)
  log='docs/quality-reviews/'+prefix+'.txt';(ROOT/log).write_text(r.stdout+r.stderr)
  report['rows'].append({'name':name,'exit':r.returncode,'seconds':round(time.monotonic()-start,2),'log':log})
  (ROOT/'docs/quality-reviews/build51-implementation-final-layout-suite.json').write_text(json.dumps(report,indent=2)+'\n')
  print(name,'PASS' if not r.returncode else 'FAIL',flush=True)
finally:
 for p in copies.values():p.unlink(missing_ok=True)
 (ROOT/'docs/quality-reviews/build51-implementation-final-layout-suite.json').write_text(json.dumps(report,indent=2)+'\n')
if any(r['exit'] for r in report['rows']):raise SystemExit(1)
