from pathlib import Path
import hashlib,json,subprocess,sys,re
out=Path('docs/quality-reviews');mode=sys.argv[1]
def h(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if mode=='freeze':
 paths=[p for d in ['src','public','tools','tests','docs'] for p in Path(d).rglob('*') if p.is_file() and 'build70-review' not in str(p) and 'build70-access-freeze' not in str(p)]
 paths+=[Path(p) for p in ['package.json','package-lock.json','index.html','vite.config.js']]
 (out/'build70-access-freeze.json').write_text(json.dumps({'sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':{str(p):h(p) for p in paths}},indent=2))
elif mode=='links':
 rows=[]
 for f in ['docs/human.html','dist/docs/human.html']:
  missing=[];n=0
  for t in re.findall(r'(?:href|src)=["\']([^"\']+)',Path(f).read_text()):
   if t.startswith(('http','data:','#','mailto:')):continue
   t=t.split('#')[0].split('?')[0];p=Path(f).parent/t
   if f=='docs/human.html' and t.startswith('../assets/'):p=Path('public/assets')/t[len('../assets/'):]
   n+=1
   if not p.exists():missing.append(str(p))
  rows.append(dict(file=f,references=n,missing=missing))
 (out/'build70-access-links.json').write_text(json.dumps(rows,indent=2));assert all(not r['missing'] for r in rows),rows
else:
 history=json.loads((out/'build70-access-history.json').read_text());bad=[p for p,v in history.items() if h(p)!=v]
 old=subprocess.check_output(['git','show','1e9c17ee841ef496169e2284f6f4fa930ea3fbf9:docs/human.html'],text=True);new=Path('docs/human.html').read_text();marker='<section id="quality-build70-parent">';same=old[old.index(marker):]==new[new.index(marker):]
 freeze=json.loads((out/'build70-access-freeze.json').read_text()) if (out/'build70-access-freeze.json').exists() else {'files':{},'sha':None}
 changed=[p for p,v in freeze['files'].items() if h(p)!=v]
 result=dict(historicalFiles=len(history),historicalChanges=bad,oldHumanSectionsIdentical=same,frozenSHA=freeze['sha'],frozenFiles=len(freeze['files']),frozenChanges=changed)
 (out/f'build70-access-audit-{mode}.json').write_text(json.dumps(result,indent=2));print(result);assert not bad and same and not changed
