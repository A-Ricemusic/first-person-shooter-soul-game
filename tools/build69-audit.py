from pathlib import Path
import hashlib,json,subprocess,sys
out=Path('docs/quality-reviews');mode=sys.argv[1]
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if mode=='freeze':
 files={str(p):h(p) for d in ['src','public','tests','tools'] for p in Path(d).rglob('*') if p.is_file() and not p.name.startswith('.build69')}
 (out/'build69-freeze.json').write_text(json.dumps({'sha':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':files},indent=2))
else:
 history=json.loads((out/'build69-history-manifest.json').read_text());history={f:v for f,v in history.items() if 'build69' not in f}
 bad=[f for f,v in history.items() if not Path(f).exists() or h(Path(f))!=v]
 old=subprocess.check_output(['git','show','0594029326679dfa3091c5b0ae21d4a25ef16e9a:docs/human.html'],text=True);new=Path('docs/human.html').read_text();mark='<section id="quality-build69-parent-design">';same=old[old.index(mark):]==new[new.index(mark):]
 freeze=json.loads((out/'build69-freeze.json').read_text()) if (out/'build69-freeze.json').exists() else {'files':{}}
 changed=[f for f,v in freeze['files'].items() if not Path(f).exists() or h(Path(f))!=v]
 result={'historicalFiles':len(history),'historicalMismatches':bad,'priorDossierSectionsIdentical':same,'frozenFiles':len(freeze['files']),'frozenChanges':changed}
 (out/f'build69-audit-{mode}.json').write_text(json.dumps(result,indent=2));print(result);assert not bad and same and not changed
