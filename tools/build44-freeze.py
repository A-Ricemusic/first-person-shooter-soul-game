import hashlib,json,sys
from pathlib import Path
paths=[Path('package.json'),Path('package-lock.json'),Path('vite.config.js'),*Path('tests').glob('*.mjs'),*Path('tools').glob('build44*.py'),Path('index.html'),Path('tools/visible-playtest.mjs'),*Path('src').rglob('*'),*Path('public/assets').rglob('*')]
files=[{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(paths) if p.is_file()]
Path('docs/quality-reviews/build44-implementation-freeze-'+sys.argv[1]+'.json').write_text(json.dumps({'digest':hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest(),'files':files},indent=2)+'\n')
