"""SOULFALL original induction Warden. Meter scale, Blender Z-up/-Y forward.
All geometry authored here; no imported assets. Seven material primitives, rigid nodes.
Run from repository root with Blender --background --python tools/build_warden.py.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0

def material(name,color,metal,rough,emission=False):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(.6,.2,.025,1); p.inputs['Emission Strength'].default_value=.7
 return m
mats={
 'Frame':material('Warden_Frame',(.055,.071,.08),.7,.48),
 'Steel':material('Warden_MachinedSteel',(.25,.3,.33),.8,.34),
 'Brass':material('Warden_Brass',(.34,.23,.105),.75,.43),
 'ArmorLeft':material('Warden_Armor',(.11,.145,.17),.78,.38),
 'Emitter':material('Warden_Emitter',(.23,.12,.04),.55,.3,True),
 'Fan':material('Warden_Fan',(.09,.11,.12),.7,.46)}
mats['ArmorRight']=mats['ArmorLeft']
groups={k:[] for k in mats}
def pos(v):return (v[0],-v[2],v[1])
def finish(o,key,name):
 o.name=name; o.data.materials.append(mats[key]); groups[key].append(o)
 return o
def box(name,p,s,key,bevel=.025,rot=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos(p));o=bpy.context.object;o.name=name;o.dimensions=(s[0],s[2],s[1]);o.rotation_euler[1]=rot
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  b=o.modifiers.new('Manufactured edge radii','BEVEL');b.width=bevel;b.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
  n=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=n.name)
 return finish(o,key,name)
def cyl(name,p,r,depth,key,axis=(0,0,1),vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=pos(p));o=bpy.context.object
 direction=Vector(pos(axis));o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 b=o.modifiers.new('Turned edges','BEVEL');b.width=.009;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name)
 return finish(o,key,name)
def ring(name,p,r,t,key):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=40,minor_segments=8,location=pos(p),rotation=(math.pi/2,0,0));return finish(bpy.context.object,key,name)
# Weight-bearing central frame and skids: broadest old shoulder span was 1.74m.
box('InductionBlock',(0,1.27,-.04),(.78,.82,.58),'Frame',.09)
box('RearHeatSink',(0,1.38,-.37),(.67,.68,.12),'Frame')
for x in [-.26,.26]:
 box('LowerStrut',(x,.5,-.03),(.13,.75,.16),'Steel')
 box('LandingShoe',(x,.08,.02),(.24,.13,.59),'Frame',.04)
 cyl('LowerActuator',(x,.76,.06),.09,.27,'Brass',(0,1,0))
for y in [.99,1.11,1.23,1.35,1.47,1.59]:box('CoolingFin',(0,y,-.47),(.66,.035,.14),'Steel',.006)
# Paired guided armor shutters leave optic and frontal induction core clear.
for sign,key in [(-1,'ArmorLeft'),(1,'ArmorRight')]:
 x=sign*.49
 box('ChamferedPauldron',(x,1.32,.02),(.4,.87,.56),key,.075,sign*.12)
 box('OverlappingBrow',(x,1.73,.01),(.41,.16,.5),key,.035)
 box('EdgeInset',(sign*.64,1.3,.31),(.045,.57,.035),key,.008)
 cyl('ArmorHinge',(sign*.42,1.32,-.18),.105,.24,'Steel',(1,0,0))
 for y in [1.08,1.32,1.56]:cyl('Fastener',(sign*.56,y,.322),.027,.023,key)
 box('GuideRail',(sign*.31,1.42,.0),(.065,.64,.13),'Steel',.015)
# Fixed precision target exactly local Three (0,2,.3), radius unchanged .24.
box('OpticNeck',(0,1.82,-.01),(.24,.43,.22),'Frame')
cyl('GimbalAxle',(0,2,.15),.13,.61,'Steel',(1,0,0))
ring('ProtectiveOpticBezel',(0,2,.3),.254,.043,'Steel')
cyl('RecessedOptic',(0,2,.3),.225,.07,'Emitter')
ring('OpticalIrisOuter',(0,2,.339),.17,.012,'Brass')
ring('OpticalIrisInner',(0,2,.344),.09,.012,'Steel')
cyl('OpticalPupil',(0,2,.35),.047,.012,'Frame')
box('OpticBrow',(0,2.29,.25),(.53,.065,.31),'Frame',.02)
# Functional frontal coil stack / emitter, not a floating ornamental halo.
cyl('CoilHousing',(0,1.27,.27),.30,.22,'Steel')
ring('InductionWinding',(0,1.27,.39),.238,.025,'Brass')
cyl('ChargeEmitter',(0,1.27,.407),.19,.025,'Emitter')
for x in [-.115,0,.115]:box('ProtectiveCoreRib',(x,1.27,.435),(.018,.3,.028),'Frame',.006)
# Rear fan: real hub + attached blades, rotates around Three Z only.
cyl('FanHub',(0,1.38,-.57),.075,.08,'Fan')
for i in range(8):
 a=i*math.tau/8
 box('FanBlade',(math.cos(a)*.145,1.38+math.sin(a)*.145,-.57),(.18,.05,.025),'Fan',.012,-a)
ring('FanGuard',(0,1.38,-.59),.25,.025,'Steel')
# Join by rigid node/material: 7 draw primitives per cloned asset.
for key,objects in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object;o.name=key
 pivot=pos(((-.49 if key=='ArmorLeft' else .49),1.32,.02)) if key in ['ArmorLeft','ArmorRight'] else pos((0,1.38,-.57)) if key=='Fan' else (0,0,0)
 bpy.context.scene.cursor.location=pivot;bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
for name,p in [('WeakpointAnchor',(0,2,.3)),('BodyAnchor',(0,1.3,0)),('FeetAnchor',(0,0,0))]:
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=pos(p)
bpy.context.scene.world.color=(.18,.18,.18)
path=ROOT/'public/assets'
bpy.ops.wm.save_as_mainfile(filepath=str(path/'induction-warden.blend'))
bpy.ops.export_scene.gltf(filepath=str(path/'induction-warden.glb'),export_format='GLB',export_yup=True)
triangles=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
report={'asset':'induction-warden.glb','author':'Original SOULFALL code-authored Blender geometry','source':'tools/build_warden.py','externalAssets':False,'triangles':triangles,'materialPrimitives':len(groups),'materials':len(set(mats.values())),'coordinates':'meters, Blender Z-up/-Y forward exports Three Y-up/+Z','weakpoint':[0,2,.3],'rig':'Fixed optic; paired sliding shutters; rear fan','textures':'No external textures or maps; restrained PBR material separation'}
(path/'induction-warden-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
