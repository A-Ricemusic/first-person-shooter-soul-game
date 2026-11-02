from pathlib import Path
from html.parser import HTMLParser
import json,urllib.parse
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.refs=[];self.ids=set()
 def handle_starttag(self,t,a):
  for k,v in a:
   if k=='id':self.ids.add(v)
   if k in ('href','src') and v and not v.startswith(('http:','https:','data:','mailto:')):self.refs.append(v)
rows=[];missing=[]
for label,root in [('source',Path('.')),('production dist',Path('dist'))]:
 p=Parser();p.feed((root/'docs/human.html').read_text());mapped=0
 for v in p.refs:
  if v.startswith('#'):
   if v[1:] not in p.ids:missing.append([label,v])
   continue
  path=root/'docs'/urllib.parse.unquote(v.split('#')[0])
  if not path.exists() and label=='source' and v.startswith('../assets/'):
   path=Path('public')/v[3:];mapped+=1
  if not path.exists():missing.append([label,v])
 rows.append({'root':label,'localResources':len([v for v in p.refs if not v.startswith('#')]),'vitePublicMappings':mapped})
result={'method':'Offline local href/src and same-page anchors. Vite public assets map at URL root; production dist checked directly. First naive source mapping failure retained, corrected without changing historical links.','rows':rows,'missing':missing}
Path('docs/quality-reviews/build52-summary-links.json').write_text(json.dumps(result,indent=2)+'\n');print(result);assert not missing
