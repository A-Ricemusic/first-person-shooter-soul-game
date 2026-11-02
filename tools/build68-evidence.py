from pathlib import Path
import hashlib,json,sys,subprocess,re
out=Path('docs/quality-reviews');mode=sys.argv[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if mode in ['preserve','freeze']:
 paths=[p for f in (['docs','dist/docs','public/assets'] if mode=='preserve' else ['src','public','tests','tools','docs']) for p in Path(f).rglob('*') if p.is_file() and (mode=='preserve' or 'build68-review' not in str(p)) and p.name!='human.html']
 if mode=='freeze':paths+=[Path('docs/human.html')]
 data={'sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':{str(p):digest(p) for p in paths}}
 (out/f'build68-{mode}-manifest.json').write_text(json.dumps(data,indent=2))
elif mode=='verify':
 kind,label=sys.argv[2:4];d=json.loads((out/f'build68-{kind}-manifest.json').read_text());bad=[f for f,h in d['files'].items() if not Path(f).exists() or digest(Path(f))!=h]
 old=subprocess.check_output(['git','show','16eb0301:docs/human.html'],text=True);new=Path('docs/human.html').read_text();mark='<section id="quality-build68-parent-design">';same=old[old.index(mark):]==new[new.index(mark):]
 (out/f'build68-{kind}-{label}.json').write_text(json.dumps({'sha':d['sha'],'count':len(d['files']),'mismatches':bad,'historicalSectionsIdentical':same},indent=2));assert not bad and same,(bad,same)
