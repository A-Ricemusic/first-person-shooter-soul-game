import subprocess,json,re,os
from pathlib import Path
rows=[]
for name in ['build51-induction','movement-regressions','movement-browser-regressions','build48-route','facility-map-regressions','custodian-feedback-regressions','build66-custodian-readout','build66-effect-occlusion','build67-anchor','normal-controls-playtest','smoke']:
 s=Path('tests/'+name+'.mjs').read_text();prefix='build68-suite-'+name+'-'
 s=re.sub(r'docs/(media|quality-reviews)/',lambda m:'docs/'+m[1]+'/'+prefix,s).replace('docs/current-','docs/quality-reviews/'+prefix).replace('/tmp/soulfall-','/tmp/'+prefix)
 if name=='build51-induction':s=s.replace('**/induction-hall.glb','**/induction-hall-build68.glb').replace('[[11,1.7,8],[11,1.7,12],false]','[[11,1.7,8],[11,1.7,12],true]')
 temp=Path('tests/.build68-'+name+'.mjs');temp.write_text(s)
 env=dict(os.environ);env['CONTROLS_OUTPUT']='docs/quality-reviews/build68-controller.json';env['SOULFALL_PRODUCTION']='1' if name=='smoke' else '0';env['EFFECT_OCCLUSION_OUTPUT']='docs/quality-reviews/build68-effects.json'
 if name=='smoke':
  r=subprocess.run(['npm','run','build'],capture_output=True,text=True);Path('docs/quality-reviews/build68-build.txt').write_text(r.stdout+r.stderr);rows.append({'name':'build','exit':r.returncode})
 try:
  r=subprocess.run(['node',str(temp)],env=env,capture_output=True,text=True,timeout=400);Path('docs/quality-reviews/'+prefix+'run.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode})
 except subprocess.TimeoutExpired:rows.append({'name':name,'timeout':True})
 finally:temp.unlink()
 Path('docs/quality-reviews/build68-suite.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
