from pathlib import Path
import subprocess,json,hashlib,shutil
rows=[]
tracked=subprocess.check_output(['git','diff','--name-only','--','docs'],text=True).splitlines()
for f in tracked:
 if f=='docs/human.html':continue
 p=Path(f);out=Path('docs/quality-reviews/build53-implementation-preserved-outputs')/p;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,out);head=subprocess.check_output(['git','show','HEAD:'+f]);rows.append({'original':f,'archive':str(out),'generatedSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'historicalSha256':hashlib.sha256(head).hexdigest()});subprocess.run(['git','restore','--',f],check=True);assert p.read_bytes()==head
for f in subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines():
 if f.startswith(('docs/media/current','docs/quality-reviews/current','docs/current')):
  p=Path(f);out=Path('docs/quality-reviews/build53-implementation-preserved-outputs')/p;out.parent.mkdir(parents=True,exist_ok=True);shutil.move(p,out);rows.append({'original':f,'archive':str(out),'newGeneric':True})
Path('docs/quality-reviews/build53-implementation-output-preservation.json').write_text(json.dumps(rows,indent=2));print('Preserved',len(rows))
