"""Source-informed ordinary-input low-cover attempt; no state reads or pose grants."""
import subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=subprocess.Popen(['node','tools/visible-playtest.mjs','--out','docs/media/build56-implementation-cover-play'],cwd=root,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
def read():
 while True:
  line=p.stdout.readline()
  if not line:return None
  print(line,flush=True)
  try:r=json.loads(line)
  except:continue
  if r.get('type') in ['ready','result','error','closed','command-error']:return r
read()
def act(steps,capture):return {'op':'act','resume':True,'steps':steps,'capture':capture,'pauseAfter':True}
def down(k):return {'type':'down','key':k}
def up(k):return {'type':'up','key':k}
def press(k):return {'type':'press','key':k}
def wait(ms):return {'type':'wait','ms':ms}
cmds=[{'op':'click','selector':'#deploy','capture':'deploy','pauseAfter':True},act([down('KeyD'),wait(2500),up('KeyD'),down('KeyW'),wait(1250)],'shield-approach'),act([press('KeyC'),wait(250),{'type':'mouseDown','button':'right'},wait(200)],'low-shield-view'),act([{'type':'mouseDown','button':'right'},{'type':'mouseDown','button':'left'},wait(350)],'low-fire-obstruction'),act([press('KeyC'),wait(250),{'type':'mouseDown','button':'right'},{'type':'mouseDown','button':'left'},wait(550)],'stand-fire'),act([press('KeyC'),press('KeyR'),wait(1800)],'low-reload'),act([press('Digit2'),{'type':'mouseDown','button':'right'},{'type':'mouseDown','button':'left'},wait(900)],'low-breacher')]
try:
 for c in cmds+[act([wait(10000)],'hold-'+str(i)) for i in range(16)]:
  p.stdin.write(json.dumps(c)+'\n');p.stdin.flush();r=read()
  if r and r.get('beforePause',{}).get('phase')=='end':break
finally:
 p.stdin.write('{"op":"close"}\n');p.stdin.flush();read();p.stdin.close();p.wait();print('EXIT',p.returncode)
