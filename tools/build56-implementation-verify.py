from pathlib import Path
import re,json,subprocess,urllib.request,hashlib
refs=[];missing=[]
for base,html in [(Path('.'),Path('docs/human.html')),(Path('dist'),Path('dist/docs/human.html'))]:
 for url in re.findall(r'(?:src|href)=["\']([^"\']+)',html.read_text()):
  if re.match(r'(?:[a-z]+:|#|/)',url):continue
  target=url.split('#')[0].split('?')[0]
  p=(base/'public/assets'/target[len('../assets/'):]) if base==Path('.') and target.startswith('../assets/') else html.parent/target
  refs.append({'document':str(html),'url':url,'path':str(p)})
  if not p.exists():missing.append(refs[-1])
old=[]
for f in subprocess.check_output(['git','ls-files','docs','tools/build56-parent-cover-baseline.mjs'],text=True).splitlines():
 if f=='docs/human.html':continue
 original=subprocess.check_output(['git','show','HEAD:'+f]);current=Path(f).read_bytes()
 if original!=current:old.append(f)
source=subprocess.check_output(['git','show','HEAD:docs/human.html'],text=True);current=Path('docs/human.html').read_text()
sections={key:re.search('<section id="'+key+'".*?</section>',source,re.S)[0]==re.search('<section id="'+key+'".*?</section>',current,re.S)[0] for key in ['quality-build56-parent','quality-build55','quality-build55-parent','quality-build54']}
http=[]
for url in ['http://127.0.0.1:5173/','http://127.0.0.1:61467/','http://bonnies-macbook-air.tail21e865.ts.net:5173/']:
 with urllib.request.urlopen(url,timeout=20) as r:http.append({'url':url,'status':r.status})
report={'references':len(refs),'missing':missing,'changedHistoricalEvidence':old,'protectedSectionsIdentical':sections,'http':http,'assetChanges':subprocess.check_output(['git','diff','--name-only','--','public/assets'],text=True).splitlines()}
Path('docs/quality-reviews/build56-implementation-final-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));assert not missing and not old and all(sections.values()) and not report['assetChanges']
