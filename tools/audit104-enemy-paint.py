"""Audit material-only Blender exports against preserved production GLBs."""
from pathlib import Path
import json,struct,hashlib,base64,copy
R=Path(__file__).resolve().parents[1];A=R/'public/assets';palette=json.loads((A/'build104-enemy-paint-palette.json').read_text());provenance=json.loads((A/'build104-enemy-paint-provenance.json').read_text());report={'method':'Byte and semantic GLB audit. Does not certify on-screen contrast or human acquisition.','assets':[]}
module=(R/'src/build104-enemy-paint.js').read_text();assert json.loads(module[len('export default '):].strip().removesuffix(';'))==palette;report['fallbackPaletteModuleMatchesBlenderData']=True
def load(p):
 raw=p.read_bytes();assert raw[:4]==b'glTF'and struct.unpack_from('<I',raw,8)[0]==len(raw);n=struct.unpack_from('<I',raw,12)[0];assert raw[16:20]==b'JSON';return raw,json.loads(raw[20:20+n]),raw[28+n:]
for row in provenance['assets']:
 kind=row['kind'];old=A/(Path(row['source']).stem+'.glb');new=R/row['newAsset'];ob,oj,obin=load(old);nb,nj,nbin=load(new);assert obin==nbin,kind+' physical mesh buffer changed'
 expected=palette[kind];assert [m['name']for m in oj['materials']]==[m['name']for m in nj['materials']]
 changes=[]
 for om,nm in zip(oj['materials'],nj['materials']):
  name=om['name']
  if name in expected:
   v=expected[name];p=nm['pbrMetallicRoughness'];assert all(abs(a-b)<1e-6 for a,b in zip(p['baseColorFactor'],v['color']+[1]));assert abs(p['metallicFactor']-v['metallic'])<1e-6 and abs(p['roughnessFactor']-v['roughness'])<1e-6
   changes.append({'name':name,'before':copy.deepcopy(om['pbrMetallicRoughness']),'after':copy.deepcopy(p)})
   for m in [om,nm]:
    for k in ['baseColorFactor','metallicFactor','roughnessFactor']:m['pbrMetallicRoughness'].pop(k,None)
  assert om==nm,kind+' unintended material/emission/texture change: '+name
 assert oj==nj,kind+' nonmaterial JSON changed'
 assert all(hashlib.sha256((A/(Path(row['source']).stem+'.'+e)).read_bytes()).hexdigest()==h for e,h in row['baselineSHA256'].items())
 report['assets'].append({'kind':kind,'baseline':str(old.relative_to(R)),'candidate':str(new.relative_to(R)),'physicalBufferBytes':len(obin),'physicalBufferSHA256':hashlib.sha256(obin).hexdigest(),'geometryNodesAndAllNonPaintDataIdentical':True,'changes':changes})
payload=(R/'src/build104-sentinel-fallback.js').read_text();b64=json.loads(payload[len('export default '):].strip().removesuffix(';'));assert base64.b64decode(b64)==(A/'build104-sentinel.glb').read_bytes();report['sentinelFallbackByteIdentical']=True;report['passed']=True
(R/'docs/quality-reviews/build104-material-audit.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'assets':len(report['assets']),'sentinelFallbackByteIdentical':True}))
