"""Original SOULFALL compact patrol machines. Meter scale; no imported assets.
Dedicated authoring preserves unrelated assets. Blender Z up/-Y front -> glTF Y up/+Z.
Rigid optic at (0,1.3,.43); shutters translate vertically, propulsion vanes follow resolved travel.
"""
import bpy, math, json, hashlib
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
 def cylinder(name,p,r,depth,m):
  bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=depth,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
 def ring(name,p,major,minor,m):
  bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=6,location=(p[0],-p[2],p[1]),major_radius=major,minor_radius=minor);o=bpy.context.object;o.name=name;o.data.materials.append(m);return o
 # Common stabilized sight/gun cradle: exact legacy precision centre.
 box('SightCradle',(0,1.3,.11),(.40,.30,.49),armor,.065)
 box('OpticHousing',(0,1.3,.32),(.30,.24,.14),black,.035)
 box('Optic',(0,1.3,.418),(.22,.16,.024),warm,.025)
 box('ShutterTop',(0,1.51,.23),(.38,.10,.14),steel)
 box('ShutterBottom',(0,1.09,.23),(.38,.10,.14),steel)
 if variant=='sentinel':
  box('SpinalDrive',(0,.95,-.06),(.26,.50,.30),black,.04)
  box('ChestPlate',(0,1.0,.13),(.34,.28,.10),enamel,.035)
  cylinder('HipCrossmember',(0,.77,0),.12,.42,steel).rotation_euler[1]=math.pi/2
  for side,label in [(-1,'Left'),(1,'Right')]:
   x=side*.23
   cylinder('Hip'+label,(x,.77,0),.10,.11,black).rotation_euler[1]=math.pi/2
   # Unit-length linkage, posed by the runtime from hip/knee/ankle endpoints.
   box('Upper'+label,(x,.57,.09),(.115,1,.12),armor,.025)
   box('Lower'+label,(x,.25,0),(.075,1,.08),steel,.018)
   cylinder('Knee'+label,(x,.43,.13),.085,.12,enamel).rotation_euler[1]=math.pi/2
   box('Foot'+label,(x,.065,0),(.15,.10,.23),black,.025)
   box('Vane'+label,(side*.16,1.02,-.17),(.08,.18,.05),steel,.01)
 else:
  box('AftTurbineSpine',(0,1.3,-.18),(.19,.25,.40),black,.045)
  box('Keel',(0,.99,-.04),(.10,.42,.30),enamel,.035)
  for side,label in [(-1,'Left'),(1,'Right')]:
   x=side*.255
   box('EnginePylon',(side*.16,1.22,-.06),(.23,.10,.14),steel,.02)
   ring('Duct'+label,(x,1.21,-.06),.135,.035,armor)
   ring('Exhaust'+label,(x,1.18,-.06),.106,.015,cool)
   cylinder('Hub'+label,(x,1.21,-.06),.037,.12,black)
   box('Vane'+label,(x,1.21,-.06),(.22,.025,.055),steel,.009)
   box('EngineBrow',(x,1.32,-.06),(.20,.07,.22),enamel,.025)
 # Join static surfaces by material; retain only mechanically animated parts.
 animated={'Optic','ShutterTop','ShutterBottom','VaneLeft','VaneRight'}
 if variant=='sentinel':
  animated.update(part+side for part in ['Upper','Lower','Knee','Foot'] for side in ['Left','Right'])
 for material in [armor,steel,black,warm,cool,enamel]:
  bpy.ops.object.select_all(action='DESELECT')
  objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in animated and o.active_material==material]
  if objects:
   for o in objects:o.select_set(True)
   bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Assembly_'+material.name
 if variant=='sentinel':
  for side in ['Left','Right']:
   bpy.data.objects['Upper'+side].scale.z=.40
   bpy.data.objects['Lower'+side].scale.z=.38
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public/assets'/f'{variant}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets'/f'{variant}.glb'),export_format='GLB',export_yup=True)
 tris=0;rad=0
 for o in bpy.context.scene.objects:
  if o.type=='MESH':
   o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
   for v in o.data.vertices:
    p=o.matrix_world@v.co;rad=max(rad,math.hypot(p.x,p.y))
 report={'asset':variant,'source':'tools/build_drones.py','original':True,'externalAssets':False,'triangles':tris,'meshes':len(bpy.context.scene.objects),'materials':len({slot.material for o in bpy.context.scene.objects if o.type=='MESH' for slot in o.material_slots}),'horizontalRadius':rad,'movementRadius':.45,'navigationRadius':.55,'optic':[0,1.3,.43],'precisionRadius':.24,'emission':{'optic':.65,'propulsion':.35},'textures':0}
 report['sha256']={ext:hashlib.sha256((ROOT/'public/assets'/f'{variant}.{ext}').read_bytes()).hexdigest() for ext in ['blend','glb']}
 report['sourceSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 (ROOT/'public/assets'/f'{variant}-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
