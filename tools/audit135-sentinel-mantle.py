"""Audit original geometry retention, animated nodes and exact fallback payload."""
from pathlib import Path
import json,struct,hashlib,base64
R=Path(__file__).resolve().parents[1];A=R/'public/assets';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def glb(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];assert b[:4]==b'glTF';return json.loads(b[20:20+n]),b[28+n:]
def data(j,b,idx):
 a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize('<'+fmt)*components;stride=v.get('byteStride',size);offset=v.get('byteOffset',0)+a.get('byteOffset',0);return[struct.unpack_from('<'+fmt*components,b,offset+i*stride)for i in range(a['count'])]
def signature(j,b,n):
 return [{'attributes':{k:data(j,b,v)for k,v in p['attributes'].items()},'indices':data(j,b,p['indices'])if'indices'in p else None,'material':j['materials'][p['material']]['name']}for p in j['meshes'][n['mesh']]['primitives']]
o,ob=glb(A/'build104-sentinel.glb');n,nb=glb(A/'build135-sentinel.glb');on={v['name']:v for v in o['nodes']};nn={v['name']:v for v in n['nodes']};assert on.keys()==nn.keys();assert o['materials']==n['materials'];animated=['Optic','ShutterTop','ShutterBottom','VaneLeft','VaneRight']+[part+side for part in ['Upper','Lower','Knee','Foot']for side in ['Left','Right']];retained=[];static=[]
for name,a in on.items():
 z=nn[name]
 for k in ['translation','rotation','scale','matrix','children']:assert a.get(k)==z.get(k),(name,k)
 if'mesh'not in a:continue
 if name in animated:assert signature(o,ob,a)==signature(n,nb,z),name;retained.append(name)
 else:
  ov={tuple(round(x,5)for x in p)for prim in o['meshes'][a['mesh']]['primitives']for p in data(o,ob,prim['attributes']['POSITION'])};nv={tuple(round(x,5)for x in p)for prim in n['meshes'][z['mesh']]['primitives']for p in data(n,nb,prim['attributes']['POSITION'])};assert ov<=nv,(name,len(ov-nv));static.append({'name':name,'baselineUniqueVertices':len(ov),'candidateUniqueVertices':len(nv),'retainedBaselineVertices':True})
p=json.loads((A/'build135-sentinel-provenance.json').read_text());assert all(h(A/('build104-sentinel.'+e))==v for e,v in p['baselineSHA256'].items());payload=(R/'src/build135-sentinel-fallback.js').read_text();assert base64.b64decode(json.loads(payload[len('export default '):].strip().removesuffix(';')))==(A/'build135-sentinel.glb').read_bytes();assert len(o['meshes'])==len(n['meshes']);primitives=lambda j:sum(len(v['primitives'])for v in j['meshes']);assert primitives(o)==primitives(n)
r={'passed':True,'method':'Semantic GLB comparison of original and authored mantle; retained node transforms, exact animated attributes/indices, unchanged PBR materials and emission, baseline static positions retained to1e-5m; exact lazy fallback bytes. Rest movement envelope from Blender authoring checked separately at runtime poses.','animatedNodesByteEquivalent':retained,'staticAssemblies':static,'sameMaterialData':True,'baselinePrimitives':primitives(o),'candidatePrimitives':primitives(n),'baselineGlbBytes':(A/'build104-sentinel.glb').stat().st_size,'candidateGlbBytes':(A/'build135-sentinel.glb').stat().st_size,'fallbackByteIdentical':True,'restRadius':p['horizontalRestRadius'],'originalAssetBytesPreserved':True,'limits':'Added real armor changes visible shot/tap surfaces. No human acquisition, performance or quality rating is established.'};(R/'docs/quality-reviews/build135-asset-audit.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
