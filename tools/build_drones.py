"""Original SOULFALL compact patrol machines. Meter scale; no imported assets.
Dedicated authoring preserves unrelated assets. Blender Z up/-Y front -> glTF Y up/+Z.
Rigid optic at (0,1.3,.43); shutters translate vertically, propulsion vanes follow resolved travel.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.context.preferences.filepaths.save_version=0
for variant in ['sentinel','interceptor']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 def mat(name,c,metal=.65,rough=.45,emit=0):
  m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit;return m
 armor=mat('Ceramic graphite',(.15,.21,.24));steel=mat('Exposed machined edges',(.32,.38,.39),.8,.36);black=mat('Recessed induction hardware',(.025,.035,.04),.35,.7);warm=mat('Optic',(.8,.12,.025),.3,.38,.65);cool=mat('Low energy induction',(.035,.27,.32),.4,.42,.35);enamel=mat('Service enamel',(.42,.24,.09),.4,.56)
 def box(name,p,s,m,bevel=.025):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
  b=o.modifiers.new('Machined corner radius','BEVEL');b.width=bevel;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
  n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name);return o
 box('PressureHull',(0,1.3,0),(.64,.56,.46),armor,.09)
 box('RearHeatSink',(0,1.3,-.265),(.44,.38,.07),black)
 for y in [1.17,1.26,1.35,1.44]:box('CoolingRib',(0,y,-.31),(.42,.025,.045),steel,.005)
 # Front optic is authored, not an unrelated runtime light sphere.
 box('OpticHousing',(0,1.3,.29),(.32,.28,.16),black,.05)
 box('Optic',(0,1.3,.418),(.22,.16,.024),warm,.035)
 for side in [-1,1]:
  x=side*.29
  box('Inductor',(x,1.05,-.02),(.14,.22,.30),black,.035)
  box('Exhaust',(x,.94,-.02),(.10,.025,.20),cool,.009)
  box('VaneLeft' if side<0 else 'VaneRight',(x,1.12,-.05),(.10,.055,.34),steel,.012)
 if variant=='sentinel':
  box('ShutterTop',(0,1.55,.21),(.57,.14,.16),armor)
  box('ShutterBottom',(0,1.05,.21),(.57,.14,.16),armor)
  box('IdentificationBridge',(0,1.66,0),(.48,.06,.28),enamel,.012)
 else:
  # Tall fork and split jaws, visibly different from broad patrol brow.
  for x in [-.21,.21]:
   box('InterceptorFin',(x,1.68,-.07),(.09,.48,.24),enamel,.035)
  box('ShutterTop',(0,1.51,.23),(.36,.12,.14),steel)
  box('ShutterBottom',(0,1.09,.23),(.36,.12,.14),steel)
  box('Keel',(0,.92,-.08),(.15,.29,.30),armor,.045)
 # Purposeful service scoring: paired nonemissive witness marks on removable brow.
 for x in [-.09,0,.09]:box('InspectionMark',(x,1.61,.14),(.025,.018,.025),steel,.003)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public/assets'/f'{variant}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets'/f'{variant}.glb'),export_format='GLB',export_yup=True)
 tris=0;rad=0
 for o in bpy.context.scene.objects:
  if o.type=='MESH':
   o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
   for v in o.data.vertices:
    p=o.matrix_world@v.co;rad=max(rad,math.hypot(p.x,p.y))
 report={'asset':variant,'source':'tools/build_drones.py','original':True,'externalAssets':False,'triangles':tris,'meshes':len(bpy.context.scene.objects),'materials':len({slot.material for o in bpy.context.scene.objects if o.type=='MESH' for slot in o.material_slots}),'horizontalRadius':rad,'navigationRadius':.45,'optic':[0,1.3,.43],'precisionRadius':.24,'emission':{'optic':.65,'propulsion':.35},'textures':0}
 (ROOT/'public/assets'/f'{variant}-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
