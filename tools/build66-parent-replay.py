"""Source-informed normal-URL replay of this parent's retained ordinary inputs.
No game-state evaluation, test URL, resource changes or arrangements. Not an
independent review, continuous human handling trial or causal improvement test.
"""
import json,subprocess,sys
from pathlib import Path
prefix='docs/media/build66-parent-play-fixed'
commands=[r['command'] for r in map(json.loads,Path('docs/media/build66-parent-play/actions.jsonl').read_text().splitlines()) if r['type']=='command' and r.get('sequence',100)<=20]
p=subprocess.Popen(['node','tools/visible-playtest.mjs','--out',prefix],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
records=[]
def receive():
 while True:
  line=p.stdout.readline()
  if not line:raise RuntimeError('Driver ended before result')
  print(line.strip(),flush=True)
  try:r=json.loads(line)
  except json.JSONDecodeError:continue
  records.append(r)
  if r.get('type') in ['ready','result','command-error','closed']:return r
try:
 ready=receive()
 for c in commands:
  p.stdin.write(json.dumps(c)+'\n');p.stdin.flush();r=receive()
  if r.get('type')=='command-error' or r.get('beforePause',{}).get('phase')=='end':break
finally:
 if p.poll() is None:
  p.stdin.write('{"op":"close"}\n');p.stdin.flush();receive();p.stdin.close();p.wait(timeout=30)
 ready=next((r for r in records if r.get('type')=='ready'),{})
 checked=subprocess.run(['ps','-p',str(ready.get('driverPid',-1))+','+str(ready.get('chromePid',-1)),'-o','pid=,comm='],capture_output=True,text=True)
 Path('docs/quality-reviews/build66-parent-normal-replay.json').write_text(json.dumps({'method':__doc__,'source':'../media/build66-parent-play/actions.jsonl','records':records,'driverExit':p.returncode,'exactPidCheck':{'exitCode':checked.returncode,'output':checked.stdout},'limits':'Known route/aim input replay, pause-assisted synthetic screenshots; no independent discovery, causation or human-enjoyment claim.'},indent=2)+'\n')
 if p.returncode or checked.stdout:raise RuntimeError('Owned driver/browser cleanup failed')
