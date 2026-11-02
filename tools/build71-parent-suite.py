from pathlib import Path
import os,subprocess,json,hashlib
prefix=os.environ.get('BUILD71_SUITE_TAG','build71-parent')
specs=[
 ('recovery-feedback','build59-recovery-feedback.mjs',{'build59-parent-recovery':prefix+'-recovery-feedback'},{}),
 ('recovery-readability','recovery-readability-regressions.mjs',{}, {'RECOVERY_CAPTURE_PREFIX':prefix+'-reach','RECOVERY_OBSERVATIONS':f'docs/quality-reviews/{prefix}-reach.json'}),
 ('objective-notice','objective-notice-regressions.mjs',{}, {'OBJECTIVE_NOTICE_CAPTURE':f'docs/media/{prefix}-objective.jpg','OBJECTIVE_NOTICE_OUTPUT':f'docs/quality-reviews/{prefix}-objective.json'}),
 ('marker-composition','marker-composition.mjs',{}, {'MARKER_CAPTURE_PREFIX':prefix+'-markers','MARKER_OBSERVATIONS':f'docs/quality-reviews/{prefix}-markers.json'}),
 ('receiver-composition','receiver-composition.mjs',{}, {'COMPOSITION_CAPTURE_PREFIX':prefix+'-composition','COMPOSITION_OBSERVATIONS':f'docs/quality-reviews/{prefix}-composition.json'}),
 ('access','build70-access.mjs',{'docs/quality-reviews/build70-access-fixtures.json':f'docs/quality-reviews/{prefix}-access.json'},{}),
 ('interaction','build70-interaction-context.mjs',{'docs/quality-reviews/build70-parent-interaction-':f'docs/quality-reviews/{prefix}-interaction-'},{}),
 ('controls','normal-controls-playtest.mjs',{}, {'CONTROLS_OUTPUT':f'docs/quality-reviews/{prefix}-privileged.json'}),
]
rows=[]
for name,file,replacements,extra in specs:
 source=Path('tests')/file;text=source.read_text();modified=text
 for a,b in replacements.items():
  assert a in modified,(file,a)
  modified=modified.replace(a,b)
 path=Path('tests')/('.'+prefix+'-'+name+'.mjs')
 try:
  path.write_text(modified)
  with open(f'docs/quality-reviews/{prefix}-suite-{name}.txt','w') as log:
   result=subprocess.run(['node',str(path)],env={**os.environ,**extra},stdout=log,stderr=subprocess.STDOUT,timeout=360)
  rows.append({'name':name,'exit':result.returncode,'source':str(source),'sourceSHA256':hashlib.sha256(text.encode()).hexdigest(),'outputOnlyReplacements':replacements})
 finally:path.unlink(missing_ok=True)
 Path(f'docs/quality-reviews/{prefix}-suite.json').write_text(json.dumps({'method':'Sequential actual-browser regressions. Temporary sibling copies replace output paths only. No ordinary driver running. Privileged exact-information controls are separate from ordinary play.', 'rows':rows},indent=2)+'\n')
 print(name,result.returncode,flush=True)
raise SystemExit(any(r['exit'] for r in rows))
