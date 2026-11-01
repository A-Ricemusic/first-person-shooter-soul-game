"""Sequential Build43 checks; sibling test copies change output paths only."""
import hashlib,json,os,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SPECS=[('development', 'smoke.mjs'), ('combat-regressions', 'combat-regressions.mjs'), ('mission-regressions', 'mission-regressions.mjs'), ('encounter-regressions', 'encounter-regressions.mjs'), ('movement-regressions', 'movement-regressions.mjs'), ('movement-browser-regressions', 'movement-browser-regressions.mjs'), ('phase-handling-regressions', 'phase-handling-regressions.mjs'), ('phase-usability-regressions', 'phase-usability-regressions.mjs'), ('medical-regressions', 'medical-regressions.mjs'), ('build32-role-contracts', 'build32-role-contracts.mjs'), ('build32-roles', 'build32-roles.mjs'), ('ranged-spacing-regressions', 'ranged-spacing-regressions.mjs'), ('recovery-readability-regressions', 'recovery-readability-regressions.mjs'), ('receiver-regressions', 'receiver-regressions.mjs'), ('receiver-composition', 'receiver-composition.mjs'), ('marker-composition', 'marker-composition.mjs'), ('ending-regressions', 'ending-regressions.mjs'), ('extraction-readability-regressions', 'extraction-readability-regressions.mjs'), ('build34-buffer', 'build34-buffer.mjs'), ('facility-map-regressions', 'facility-map-regressions.mjs'), ('build38-planning', 'build38-planning.mjs'), ('build23-batching', 'build23-batching.mjs'), ('build23-render-idle', 'build23-render-idle.mjs'), ('build34-handbook', 'build34-handbook.mjs'), ('visible-playtest-driver-regressions', 'visible-playtest-driver-regressions.mjs'), ('threat-visor-regressions', 'threat-visor-regressions.mjs'), ('custodian','build44-custodian.mjs'),('viewmodel','build40-compat-viewmodel.mjs'),('handling','build39-handling.mjs'),('capacitors','build40-capacitors.mjs'),('workshop','build43-workshop.mjs'),('workshop-edges','build43-workshop-edges.mjs'),('controls', 'normal-controls-playtest.mjs'), ('production', 'smoke.mjs')]
SPECS=[('custodian','build44-custodian.mjs'),('edges','build44-custodian-edges.mjs'),('map','facility-map-regressions.mjs'),('visor','threat-visor-regressions.mjs'),('drone-alignment','drone-alignment-regressions.mjs'),('drone-edges','drone-lifecycle-edges.mjs'),('production','smoke.mjs')]
report={'method':'Original check logic in temporary sibling copies; only report/capture output locations changed. Sequential processes; no concurrent test browsers. Controls are privileged exact-information gameplay, not ordinary discovery.','rows':[],'sources':[]}
copies={}
try:
 for name,filename in SPECS:
  src=ROOT/'tests'/filename;body=src.read_text();copy=ROOT/'tests'/('.build44-freeze-check-'+name+'.mjs');prefix='build44-freeze-check-'+name+'-'
  updated=body.replace('build44-implementation','build44-freeze-check-'+name).replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix)
  import re
  updated=re.sub(r'docs/(media|quality-reviews)/build(?:34|38|39|40|41|43)-',lambda m:'docs/'+m[1]+'/'+prefix,updated)
  copy.write_text(updated);copies[name]=copy
  report['sources'].append({'name':name,'original':str(src.relative_to(ROOT)),'sha256':hashlib.sha256(body.encode()).hexdigest(),'outputCopySha256':hashlib.sha256(updated.encode()).hexdigest()})
 for name,_ in SPECS:
  if name=='production':
   start=time.monotonic();r=subprocess.run(['npm','run','build'],cwd=ROOT,text=True,capture_output=True)
   (ROOT/'docs/quality-reviews/build44-freeze-check-build.txt').write_text(r.stdout+r.stderr)
   report['rows'].append({'name':'production-build','exit':r.returncode,'seconds':time.monotonic()-start})
   # retain failures and continue independent regressions
  env=os.environ.copy();prefix='build44-freeze-check-'+name
  env.update({'MEDICAL_OUTPUT':'docs/quality-reviews/'+prefix+'.json','MEDICAL_CAPTURE_PREFIX':prefix,'WARDEN_OBSERVATIONS':'docs/quality-reviews/'+prefix+'.json','WARDEN_CAPTURE_PREFIX':prefix,'ROLE_OUTPUT':'docs/quality-reviews/'+prefix+'.json','ROLE_CAPTURE_PREFIX':prefix,'SPACING_OBSERVATIONS':'docs/quality-reviews/build44-freeze-check-spacing.json','CONTROLS_OUTPUT':str(ROOT/'docs/quality-reviews/build44-freeze-check-controls.json')})
  if name=='production':env['SOULFALL_PRODUCTION']='1'
  start=time.monotonic();r=subprocess.run(['node',str(copies[name].relative_to(ROOT))],cwd=ROOT,env=env,text=True,capture_output=True)
  log='docs/quality-reviews/'+prefix+'.txt';(ROOT/log).write_text(r.stdout+r.stderr)
  report['rows'].append({'name':name,'exit':r.returncode,'seconds':round(time.monotonic()-start,2),'log':log})
  (ROOT/'docs/quality-reviews/build44-freeze-check-suite.json').write_text(json.dumps(report,indent=2)+'\n')
  print(name,'PASS' if not r.returncode else 'FAIL',flush=True)
  # retain failures and continue independent regressions
finally:
 for p in copies.values():p.unlink(missing_ok=True)
 (ROOT/'docs/quality-reviews/build44-freeze-check-suite.json').write_text(json.dumps(report,indent=2)+'\n')
if any(r['exit'] for r in report['rows']):raise SystemExit(1)
