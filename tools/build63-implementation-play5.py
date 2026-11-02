"""Source-informed normal URL obstruction trial; ordinary visible controls only."""
import subprocess,json
from pathlib import Path
p=subprocess.Popen(['node','tools/visible-playtest.mjs','--out','docs/media/build63-implementation-play5'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
def read():
 while True:
  line=p.stdout.readline()
  if not line:return None
  print(line,flush=True)
  try:r=json.loads(line)
  except:continue
  if r.get('type') in ['ready','result','error','closed','command-error']:return r
read()
cmds=[{'op':'click','selector':'#deploy','capture':'deploy','pauseAfter':True},
 {'op':'act','resume':True,'steps':[{'type':'down','key':'KeyD'},{'type':'wait','ms':1450},{'type':'up','key':'KeyD'}],'capture':'forward-obstruction'},
 {'op':'act','resume':True,'steps':[{'type':'down','key':'KeyW'},{'type':'wait','ms':4000},{'type':'up','key':'KeyW'}],'capture':'held-obstruction'},
 {'op':'act','resume':True,'steps':[{'type':'down','key':'KeyA'},{'type':'wait','ms':1000},{'type':'up','key':'KeyA'},{'type':'down','key':'KeyW'},{'type':'wait','ms':1000},{'type':'up','key':'KeyW'}],'capture':'side-correction'},
 {'op':'close'}]
try:
 for c in cmds:
  p.stdin.write(json.dumps(c)+'\n');p.stdin.flush();read()
finally:
 p.stdin.close();p.wait(timeout=30);print('exit',p.returncode)
