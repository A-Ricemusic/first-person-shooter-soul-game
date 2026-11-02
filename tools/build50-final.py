import subprocess,os,json,re,time
from pathlib import Path
rows=[]
for name in ['combat-regressions','build40-capacitors','build40-compat-handling','build34-handbook','visible-playtest-driver-regressions','build50-breacher','build50-assets','build50-late-assets','smoke']:
 src=Path('tests/'+name+'.mjs');s=src.read_text();prefix='build50-final-'+name+'-';s=s.replace('docs/media/current-','docs/media/'+prefix).replace('docs/quality-reviews/current-','docs/quality-reviews/'+prefix).replace('docs/current-','docs/quality-reviews/'+prefix);s=re.sub(r'docs/(media|quality-reviews)/build\d+-',lambda m:'docs/'+m[1]+'/'+prefix,s);copy=Path('tests/.build50-final-'+name+'.mjs');copy.write_text(s);env=os.environ.copy();env.update({'ART_OUTPUT_PREFIX':prefix,'SOULFALL_PRODUCTION':'1' if name=='smoke' else '0'})
 try:
  r=subprocess.run(['node',str(copy)],env=env,capture_output=True,text=True);Path('docs/quality-reviews/build50-final-'+name+'.txt').write_text(r.stdout+r.stderr);rows.append({'name':name,'exit':r.returncode});print(name,r.returncode,flush=True)
 finally:copy.unlink(missing_ok=True)
 Path('docs/quality-reviews/build50-final-checks.json').write_text(json.dumps(rows,indent=2))
