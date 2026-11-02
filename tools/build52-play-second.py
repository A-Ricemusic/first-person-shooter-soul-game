"""Source-informed replay of retained ordinary input commands, not discovery."""
import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
rows=[json.loads(x) for x in (root/'docs/media/build51-implementation-play/actions.jsonl').read_text().splitlines()]
commands=[x['command'] for x in rows if x['type']=='command']
# Retain the successful three-memory second approach, then actual finale actions.
start=next(i for i,c in enumerate(commands) if c.get('capture')=='18-retry')
chosen=[{'op':'click','selector':'#deploy','capture':'deploy','pauseAfter':True}]+commands[start+1:]
p=subprocess.Popen(['node','tools/visible-playtest.mjs','--out','docs/media/build52-implementation-play2'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
def read():
 while True:
  line=p.stdout.readline()
  if not line:return None
  print(line,flush=True)
  try:r=json.loads(line)
  except:continue
  if r.get('type') in ['ready','result','error','closed','command-error']:return r
read()
for i,c in enumerate(chosen):
 if c['op'] not in ['act','click']:continue
 c['capture']='replay-'+str(i)+'-'+c.get('capture','step');c['pauseAfter']=True
 if '21-retry-east' in c.get('capture',''):
  c['steps'] += [{'type':'down','key':'KeyA'},{'type':'wait','ms':350},{'type':'up','key':'KeyA'},{'type':'down','key':'KeyW'},{'type':'press','key':'Space'},{'type':'wait','ms':650},{'type':'up','key':'KeyW'},{'type':'down','key':'KeyE'},{'type':'wait','ms':1100}]
 p.stdin.write(json.dumps(c)+'\n');p.stdin.flush();r=read()
 if r and r.get('beforePause',{}).get('phase') in ['lost','won','end']:break
p.stdin.write('{"op":"close"}\n');p.stdin.flush();read();p.stdin.close();p.wait();print('EXIT',p.returncode)
