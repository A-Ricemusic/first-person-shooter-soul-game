"""Original Blender additions to the existing Sentinel load frame.
Retains legacy assets. Adds connected fairings within the existing .45m movement
radius. Actual extra armor is shootable; this is a deliberate body exposure change.
"""
import bpy,math,json,hashlib,base64
from pathlib import Path
R=Path(__file__).resolve().parents[1];A=R/'public/assets';source=A/'build104-sentinel.blend';stem='build135-sentinel';bpy.ops.wm.open_mainfile(filepath=str(source));bpy.context.preferences.filepaths.save_version=0
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();original={ext:h(A/('build104-sentinel.'+ext))for ext in ['blend','glb']}
materials={k:bpy.data.materials[k]for k in ['Service ivory enamel','Protected graphite recess','Safety ochre']};original_objects=list(bpy.context.scene.objects);added=[]
def box(name,p,s,material,bevel=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(materials[material]);mod=o.modifiers.new('Rolled fairing edge','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name);added.append({'name':name,'centerYUp':p,'dimensionsYUp':s,'material':material});return o
# A load yoke bridges both existing shoulders; broad fairings overlap it and the
# retained .225m load rails rather than floating beyond the mechanism.
box('Mantle_LoadYoke',(0,1.49,-.015),(.70,.10,.22),'Service ivory enamel',.025)
for side in [-1,1]:
 box('Mantle_ShoulderFairing',(side*.335,1.445,0),(.18,.29,.24),'Service ivory enamel',.028)
 box('Mantle_TopWearCap',(side*.335,1.575,0),(.16,.025,.19),'Safety ochre',.006)
 for y in [1.35,1.43]:box('Mantle_PassiveStripe',(side*.335,y,.122),(.12,.025,.004),'Protected graphite recess',.001)
box('Mantle_BreastFairing',(0,1.01,.175),(.54,.30,.06),'Service ivory enamel',.022)
# Join by the existing materials into the original static assemblies. Animation
# nodes, optic and shutters are neither joined nor moved; no new draw primitive.
for name,material in materials.items():
 candidates=[o for o in original_objects if o.type=='MESH'and o.name.startswith('LoadFrame_')and o.active_material==material];assert len(candidates)==1,(name,[o.name for o in candidates]);active=candidates[0];new=[o for o in bpy.context.scene.objects if o not in original_objects and o.type=='MESH'and o.active_material==material];assert new
 bpy.ops.object.select_all(action='DESELECT');active.select_set(True)
 for o in new:o.select_set(True)
 bpy.context.view_layer.objects.active=active;bpy.ops.object.join();active['build135_readability']='Connected mantle and wider passive armor; same optic and gait'
tris=0;radius=0
for o in bpy.context.scene.objects:
 if o.type!='MESH':continue
 o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
 for v in o.data.vertices:
  p=o.matrix_world@v.co;radius=max(radius,math.hypot(p.x,p.y))
assert radius<=.45001,radius
bpy.ops.wm.save_as_mainfile(filepath=str(A/(stem+'.blend')));bpy.ops.export_scene.gltf(filepath=str(A/(stem+'.glb')),export_format='GLB',export_yup=True,export_extras=True)
data=(A/(stem+'.glb')).read_bytes();(R/'src/build135-sentinel-fallback.js').write_text('export default '+json.dumps(base64.b64encode(data).decode())+';\n');assert all(h(A/('build104-sentinel.'+e))==v for e,v in original.items())
r={'original':True,'generator':'tools/build135-sentinel-mantle.py','source':'public/assets/build104-sentinel.blend','baselineSHA256':original,'newSource':'public/assets/'+stem+'.blend','newAsset':'public/assets/'+stem+'.glb','newAssetSHA256':{e:h(A/(stem+'.'+e))for e in ['blend','glb']},'addedForms':added,'triangles':tris,'meshObjects':len([o for o in bpy.context.scene.objects if o.type=='MESH']),'horizontalRestRadius':radius,'movementRadius':.45,'externalAssets':False,'newMaterials':False,'emissionChanged':False,'extraLights':False,'opticAndGaitIntent':'Retain original optic and separately animated links/shutters. Separate GLB audit verifies this.','balance':'Wider actual body surfaces can receive ordinary body hits and tap selection. Health, weapon values and precision sphere are unchanged; do not claim unchanged target exposure.','limits':'No human acquisition, comfort, performance or enjoyment conclusion from authoring metrics.'};(A/'build135-sentinel-provenance.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
