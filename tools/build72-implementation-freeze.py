from pathlib import Path
import hashlib,json,sys,subprocess
root=Path('.')
manifest=Path('docs/quality-reviews/build72-implementation-freeze.json')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if sys.argv[1]=='create':
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
 files={p:sha(Path(p)) for p in paths if p and Path(p).is_file() and not p.startswith('dist/') and p!=str(manifest)}
 manifest.write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'files':files},indent=2)+'\n')
else:
 m=json.loads(manifest.read_text());changed=[p for p,h in m['files'].items() if not Path(p).is_file() or sha(Path(p))!=h]
 Path('docs/quality-reviews/build72-implementation-freeze-'+sys.argv[1]+'.json').write_text(json.dumps({'head':m['head'],'files':len(m['files']),'changed':changed},indent=2)+'\n');print(len(m['files']),changed);assert not changed
