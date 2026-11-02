import json,struct,hashlib
from pathlib import Path
rows=[]
for name in ['coil-rifle-handling','operator-hands','pump-breacher']:
 p=Path('public/assets/'+name+'.glb');b=p.read_bytes();j=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
 primitives=[p for m in j['meshes'] for p in m['primitives']]
 rows.append(dict(name=name,bytes=len(b),sha256=hashlib.sha256(b).hexdigest(),triangles=sum(j['accessors'][p['indices']]['count']//3 for p in primitives),drawPrimitives=len(primitives),materials=len(j['materials']),images=len(j.get('images',[])),uvPrimitives=sum('TEXCOORD_0'in p['attributes'] for p in primitives),normalMappedMaterials=sum('normalTexture'in m for m in j['materials']),roughnessMappedMaterials=sum('metallicRoughnessTexture'in m.get('pbrMetallicRoughness',{}) for m in j['materials']),nodes=[n.get('name')for n in j['nodes']],estimatedTextureGPUBytesWithMipmaps=len(j.get('images',[]))*1024*1024*4*4//3))
Path('docs/quality-reviews/build55-implementation-assets.json').write_text(json.dumps(dict(author='Original local procedural Blender geometry and images',generators=['tools/build55-viewmodel.py','tools/build55-breacher.py','tools/build55_finish.py'],rows=rows,limits='RGBA8 uncompressed estimate with mipmaps, not hardware measurement; glTF exporter may pack roughness/metalness. No borrowed artwork.'),indent=2))
print(json.dumps(rows,indent=2))
