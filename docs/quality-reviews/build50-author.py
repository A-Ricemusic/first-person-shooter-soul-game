"""Original SOULFALL breacher, authored in Blender in Three local Y-up coordinates. No imported art."""
import bpy,math,json
from pathlib import Path
R=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mats={}
for n,c in {'steel':(.19,.26,.30,1),'dark':(.035,.055,.065,1),'amber':(.8,.35,.06,1),'sleeve':(.08,.14,.16,1),'glove':(.17,.21,.22,1)}.items():
 m=bpy.data.materials.new(n);m.diffuse_color=c;m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=c;b.inputs['Metallic'].default_value=.7 if n=='steel' else .1;b.inputs['Roughness'].default_value=.4;mats[n]=m
def box(n,p,s,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=n;o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[mat]);b=o.modifiers.new('Machined edges','BEVEL');b.width=min(s)*.14;b.segments=2;bpy.ops.object.modifier_apply(modifier=b.name);return o
box('Receiver',[0,0,-.4],[.17,.18,.4],'steel')
box('Breech',[0,.04,-.51],[.13,.08,.2],'dark')
box('LoadingPort',[0,-.095,-.35],[.09,.012,.14],'dark')
box('Grip',[0,-.16,-.24],[.095,.26,.12],'dark')
box('Stock',[0,-.04,.03],[.12,.16,.32],'steel')
for n,y,r in [('Barrel',.035,.036),('MagazineTube',-.05,.03)]:
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=.66,location=(0,.83,y),rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=n;o.data.materials.append(mats['steel'])
box('Pump',[0,-.085,-.73],[.14,.105,.23],'dark')
for i in range(6):box('PumpRib'+str(i),[0,-.095,-.64-i*.032],[.15,.09,.012],'steel')
for x in [-.039,.039]:box('RearSight'+str(x),[x,.122,-.31],[.015,.06,.05],'amber')
box('FrontSight',[0,.09,-1.08],[.012,.045,.025],'amber')
box('MuzzleRim',[0,.035,-1.16],[.08,.08,.025],'dark')
box('Shell',[0,-.16,-.35],[.035,.035,.095],'amber')
box('SupportHand',[-.045,-.135,-.72],[.12,.095,.17],'glove')
box('GripHand',[.035,-.17,-.24],[.12,.13,.12],'glove')
box('SupportSleeve',[-.12,-.23,-.38],[.13,.15,.62],'sleeve')
box('GripSleeve',[.14,-.27,.02],[.14,.15,.5],'sleeve')
bpy.ops.object.empty_add(location=(0,1.18,.035));bpy.context.object.name='MuzzleAnchor'
bpy.ops.wm.save_as_mainfile(filepath=str(R/'public/assets/pump-breacher.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/pump-breacher.glb'),export_format='GLB')
tri=sum(len(o.data.polygons)*2 for o in bpy.data.objects if o.type=='MESH')
(R/'public/assets/pump-breacher-provenance.json').write_text(json.dumps(dict(author='Original SOULFALL Build50 Blender generator',generator='tools/build50-breacher.py',meshes=sum(o.type=='MESH' for o in bpy.data.objects),materials=len(mats),textures=0,approxTriangles=tri,bytes=(R/'public/assets/pump-breacher.glb').stat().st_size),indent=2))
