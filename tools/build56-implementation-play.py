"""Source-informed normal-URL replay, with actual crouch recovery inputs. Not discovery."""
import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
rows=[json.loads(x) for x in (root/'docs/media/build55-parent-play/actions.jsonl').read_text().splitlines()]
cmds=[x['command'] for x in rows if x['type']=='command']
start=next(i for i,c in enumerate(cmds) if c.get('capture')=='a2-mara')
chosen=[{'op':'click','selector':'#deploy','capture':'deploy','pauseAfter':True}]+cmds[start:-1]
p=subprocess.Popen(['node','tools/visible-playtest.mjs','--out','docs/media/build56-implementation-play'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
def read():
 while True:
  line=p.stdout.readline()
  if not line:return None
  print(line,flush=True)
  try:r=json.loads(line)
  except:continue
  if r.get('type') in ['ready','result','error','closed','command-error']:return r
read();low=False
try:
 for c in chosen:
  c=json.loads(json.dumps(c));c['pauseAfter']=True
  if c['op']=='act':
   if low:c['steps']=[{'type':'press','key':'KeyC'},{'type':'wait','ms':250}]+c['steps'];low=False
   for i,a in enumerate(c['steps']):
    if a.get('type')=='down' and a.get('key')=='KeyE':c['steps'][i:i]=[{'type':'press','key':'KeyC'},{'type':'wait','ms':250}];low=True;break
  p.stdin.write(json.dumps(c)+'\n');p.stdin.flush();r=read()
  if r and r.get('beforePause',{}).get('phase')=='end':break
finally:
 p.stdin.write('{"op":"close"}\n');p.stdin.flush();read();p.stdin.close();p.wait();print('EXIT',p.returncode)
