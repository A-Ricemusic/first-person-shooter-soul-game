from pathlib import Path
import hashlib,json,sys,subprocess,re
root=Path.cwd();out=Path('docs/quality-reviews');mode=sys.argv[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if mode=='freeze':
 paths=[]
 for folder in ['src','public','tests','tools','docs']:
  paths += [p for p in Path(folder).rglob('*') if p.is_file() and not (folder=='docs' and ('build67' in str(p) and str(p)!='docs/quality-reviews/build67-parent-design.json'))]
 paths += [Path(p) for p in ['package.json','package-lock.json','index.html','vite.config.js']]
 data={'sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':{str(p):digest(p) for p in sorted(set(paths))}}
 (out/'build67-review-freeze.json').write_text(json.dumps(data,indent=2))
elif mode=='verify':
 data=json.loads((out/'build67-review-freeze.json').read_text());bad=[f for f,h in data['files'].items() if not Path(f).is_file() or digest(Path(f))!=h]
 result={'frozenSHA':data['sha'],'count':len(data['files']),'mismatches':bad};(out/f'build67-review-{sys.argv[2]}.json').write_text(json.dumps(result,indent=2));assert not bad,bad
elif mode=='preserve':
 data=json.loads((out/'build67-preservation-before.json').read_text());bad=[f for f,h in data.items() if digest(Path(f))!=h]
 old=subprocess.check_output(['git','show','2d73fe42ca1adc742898c158f692f41d0746b478:docs/human.html'],text=True);new=Path('docs/human.html').read_text();marker='<section id="quality-build67-parent-design">';same=old[old.index(marker):]==new[new.index(marker):]
 result={'count':len(data),'mismatches':bad,'allHistoricalHumanSectionsByteIdentical':same};(out/'build67-preservation-after.json').write_text(json.dumps(result,indent=2));assert not bad and same,result
elif mode=='links':
 results=[]
 for f in [Path('docs/human.html'),Path('dist/docs/human.html')]:
  missing=[];n=0
  for target in re.findall(r'(?:href|src)=["\']([^"\']+)',f.read_text()):
   if target.startswith(('http','data:','#','mailto:')):continue
   target=target.split('#')[0].split('?')[0];p=f.parent/target
   if str(f)=='docs/human.html' and target.startswith('../assets/'):p=Path('public/assets')/target[len('../assets/'):]
   n+=1
   if not p.exists():missing.append(str(p))
  results.append({'file':str(f),'checked':n,'missing':missing})
 (out/'build67-links.json').write_text(json.dumps(results,indent=2));assert all(not r['missing'] for r in results),results
