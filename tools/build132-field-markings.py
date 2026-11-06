"""Refinish original Custodian's physical Roman numerals as dark safety ink.
Preserves earlier source and exports. Run with Blender --background --python.
"""
import bpy,json,hashlib,struct,copy
from pathlib import Path
R=Path(__file__).resolve().parents[1];A=R/'public/assets';source=A/'build69-custodian.blend';bpy.context.preferences.filepaths.save_version=0
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before={e:sha(A/('build69-custodian.'+e)) for e in ['blend','glb']}
bpy.ops.wm.open_mainfile(filepath=str(source));bpy.context.preferences.filepaths.save_version=0
m=bpy.data.materials.get('mark');assert m is not None
p=m.node_tree.nodes.get('Principled BSDF');prior={'color':list(p.inputs['Base Color'].default_value),'metalness':p.inputs['Metallic'].default_value,'roughness':p.inputs['Roughness'].default_value}
mark={'color':[.015,.025,.030],'metalness':.05,'roughness':.80}
m.diffuse_color=(*mark['color'],1);p.inputs['Base Color'].default_value=(*mark['color'],1);p.inputs['Metallic'].default_value=mark['metalness'];p.inputs['Roughness'].default_value=mark['roughness']
bpy.ops.wm.save_as_mainfile(filepath=str(A/'build132-custodian.blend'));bpy.ops.export_scene.gltf(filepath=str(A/'build132-custodian.glb'),export_format='GLB',export_yup=True)
def load(p):
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),raw[28+n:]
a,ab=load(A/'build69-custodian.glb');b,bb=load(A/'build132-custodian.glb');assert ab==bb,'Physical mesh buffer changed'
for old,new in zip(a['materials'],b['materials']):
 if old['name']=='mark':
  out=new['pbrMetallicRoughness'];assert all(abs(x-y)<1e-6 for x,y in zip(out['baseColorFactor'],mark['color']+[1]))
  for k in ['baseColorFactor','metallicFactor','roughnessFactor']:old['pbrMetallicRoughness'].pop(k,None);new['pbrMetallicRoughness'].pop(k,None)
assert a==b,'Non-marking data changed'
assert all(sha(A/('build69-custodian.'+e))==v for e,v in before.items())
(R/'src/build132-custodian-mark.js').write_text('export default '+json.dumps(mark,indent=2)+';\n')
report={'authoring':'Original SOULFALL Blender material revision; no external assets.','generator':'tools/build132-field-markings.py','source':str(source.relative_to(R)),'baselineHashes':before,'candidateHashes':{e:sha(A/('build132-custodian.'+e)) for e in ['blend','glb']},'onlyChangedMaterial':'mark','prior':prior,'candidateLinearRGB':mark,'geometryBufferByteIdentical':True,'allNonMarkingJsonIdentical':True,'physicalBufferBytes':len(ab),'limits':['Does not establish human label recognition, aiming, performance or enjoyment.']}
(A/'build132-custodian-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
