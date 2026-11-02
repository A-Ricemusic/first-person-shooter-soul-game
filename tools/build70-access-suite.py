import subprocess,json,re,os
from pathlib import Path
run=os.environ.get('BUILD69_RUN','build70-access-suite');rows=[]
for name in ['build70-interaction-context','build52-traversal','build68-exposure','facility-map-regressions','receiver-regressions','build44-custodian','build44-custodian-edges','build45-custodian','build45-custodian-edges','custodian-feedback-regressions','build66-custodian-readout','build66-effect-occlusion','build64-shot-feedback','phase-handling-regressions','movement-regressions','movement-browser-regressions','build67-anchor','normal-controls-playtest','smoke']:
 s=Path('tests/'+name+'.mjs').read_text();prefix=run+'-'+name+'-'
 s=re.sub(r'docs/(media|quality-reviews)/',lambda m:'docs/'+m[1]+'/'+prefix,s).replace('docs/current-','docs/quality-reviews/'+prefix).replace('/tmp/soulfall-','/tmp/'+prefix)
 # Asset identity follows the newly published model. No assertion edits.
 s=s.replace('**/custodian.glb','**/build69-custodian.glb').replace('/src/custodian-layout.json','/src/build69-custodian-layout.json')
 temp=Path('tests/.build69-'+name+'.mjs');temp.write_text(s)
 env=dict(os.environ,CONTROLS_OUTPUT='docs/quality-reviews/'+run+'-controller.json',ART_OUTPUT_PREFIX=run+'-art',EFFECT_OCCLUSION_OUTPUT='docs/quality-reviews/'+run+'-effects.json',SOULFALL_PRODUCTION='1' if name=='smoke' else '0')
 try:
  r=subprocess.run(['node',str(temp)],env=env,capture_output=True,text=True,timeout=400);Path('docs/quality-reviews/'+prefix+'run.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode})
 except subprocess.TimeoutExpired as e:
  Path('docs/quality-reviews/'+prefix+'run.txt').write_text(str(e));rows.append({'name':name,'timeout':True})
 finally:temp.unlink()
 Path('docs/quality-reviews/'+run+'.json').write_text(json.dumps(rows,indent=2));print(rows[-1],flush=True)
