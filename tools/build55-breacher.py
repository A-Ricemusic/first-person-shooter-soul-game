"""Original SOULFALL breacher, authored in Blender in Three local Y-up coordinates. No imported art."""
import bpy,math,json,os
from mathutils import Vector

from pathlib import Path
R=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
OUT=str(R/'public/assets')
mats={}
for n,c in {'steel':(.19,.26,.30,1),'dark':(.035,.055,.065,1),'amber':(.8,.35,.06,1),'sleeve':(.08,.14,.16,1),'glove':(.17,.21,.22,1)}.items():
 m=bpy.data.materials.new(n);m.diffuse_color=c;m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=c;b.inputs['Metallic'].default_value=.7 if n=='steel' else .1;b.inputs['Roughness'].default_value=.4;mats[n]=m
def box(n,p,s,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=n;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);b=o.modifiers.new('Machined edges','BEVEL');b.width=min(s)*.14;b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name);return o
box('Receiver',[0,0,-.4],[.125,.145,.36],'steel')
box('Breech',[0,.04,-.51],[.13,.08,.2],'dark')
box('LoadingPort',[0,-.095,-.35],[.09,.012,.14],'dark')
box('Grip',[0,-.15,-.24],[.066,.17,.078],'dark')
box('Stock',[0,-.04,.03],[.12,.16,.32],'steel')
for n,y,r in [('Barrel',.035,.036),('MagazineTube',-.05,.03)]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=.66,location=(0,.83,y),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=n;o.data.materials.append(mats['steel'])
box('Pump',[0,-.085,-.73],[.093,.055,.23],'dark')
for i in range(6):box('PumpRib'+str(i),[0,-.095,-.64-i*.032],[.10,.060,.012],'steel')
for x in [-.039,.039]:box('RearSight'+str(x),[x,.15,-.31],[.012,.05,.05],'amber')
box('FrontSight',[0,.139,-1.08],[.004,.022,.012],'amber')
box('MuzzleRim',[0,.035,-1.16],[.08,.08,.025],'dark')
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.012,depth=.065,location=(0,.35,-.16),rotation=(math.pi/2,0,0));bpy.context.object.name='Shell';bpy.context.object.data.materials.append(mats['amber'])
# Shared original glove geometry and tailored sleeves, native Blender source.
with bpy.data.libraries.load(str(R/'public/assets/build55-operator-handling.blend'),link=False) as (src,dst):
 dst.objects=[n for n in src.objects if n in ['SupportHand','GripHand','SupportGlove','GripGlove','SupportWrist','GripWrist','SupportSleeve','GripSleeve','Woven forearm','Woven forearm.001']]
for o in dst.objects:
 if o:o.hide_set(False);bpy.context.collection.objects.link(o)
# The same wrist/palm proportions are translated onto the breacher's pump.
for side,delta in [('Support',(0,-.033,-.155)),('Grip',(0,0,-.015))]:
 root=bpy.data.objects.get(side+'Hand');root.location=Vector((delta[0],-delta[2],delta[1]))
# Lower loading gate frame and paired action bars visibly support the pump.
for x in [-.057,.057]:
 box('ActionBar'+str(x),[x,-.049,-.62],[.012,.016,.34],'steel')
 box('GateRail'+str(x),[x,-.079,-.35],[.013,.025,.15],'steel')
box('EjectionRecess',[.064,.008,-.38],[.003,.055,.105],'dark')
box('BoltFace',[.067,.008,-.40],[.005,.034,.057],'steel')
box('PumpStop',[0,-.05,-.59],[.10,.05,.025],'steel')
# Open trigger guard and recessed mechanical trigger.
for n,a,b,r in [('Guard upper',(0,-.064,-.265),(0,-.064,-.32),.004),('Guard front',(0,-.064,-.32),(0,-.139,-.32),.004),('Guard lower',(0,-.139,-.32),(0,-.139,-.27),.004),('Trigger',(0,-.071,-.28),(0,-.105,-.286),.003)]:
 a,b=Vector((a[0],-a[2],a[1])),Vector((b[0],-b[2],b[1]));bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(mats['steel'])
bpy.ops.object.empty_add(location=(0,.31,.15));bpy.context.object.name='SightCenter'
# Collapse static receiver pieces to reduce draw submissions; keep animated nodes.
animated=['Pump','Shell']+['PumpRib'+str(i) for i in range(6)]
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and not o.parent and o.name not in animated:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Receiver'];bpy.ops.object.join();bpy.context.object.name='Receiver'
exec(open(str(R/'tools/build55_finish.py')).read())
finish55([o for o in bpy.data.objects if o.type=='MESH' and not o.parent],'build55-breacher')
bpy.ops.object.empty_add(location=(0,1.18,.035));bpy.context.object.name='MuzzleAnchor'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(R/'public/assets/build55-pump-breacher.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/pump-breacher.glb'),export_format='GLB')
# Exact export bookkeeping; does not alter authored geometry or material output.
import struct
blob=(R/'public/assets/pump-breacher.glb').read_bytes()
gltf=json.loads(blob[20:20+struct.unpack_from('<I',blob,12)[0]])
(R/'public/assets/pump-breacher-provenance.json').write_text(json.dumps(dict(author='Original SOULFALL Build55 Blender generator',generator='tools/build55-breacher.py',nativeSource='public/assets/build55-pump-breacher.blend',meshes=len(gltf['meshes']),materials=len(gltf['materials']),textures=len(gltf.get('textures',[])),images=len(gltf.get('images',[])),triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives']),bytes=len(blob)),indent=2)+'\n')
