"""Original SOULFALL Custodian. Shared box manifest uses Three Y-up coordinates."""
import bpy,json,math
from pathlib import Path
R=Path(__file__).resolve().parent.parent
parts=[]
def box(name,p,s,mat,coil=-1,shutter=False,solid=False):parts.append(dict(name=name,p=p,s=s,mat=mat,coil=coil,shutter=shutter,solid=solid))
box('Foundation',[0,.25,0],[5,.5,2.8],'dark',solid=True)
box('Cast power housing',[0,1,0],[4.7,1,2.3],'steel',solid=True)
box('Rear distribution spine',[0,1.9,-.72],[4.6,.5,.5],'dark')
for x in [-2,2]:
 box('Outrigger foot',[x,.12,1.7],[.65,.24,1.6],'steel',solid=True)
 box('Load bearing brace',[x,1.3,0],[.25,2.2,.4],'steel')
for i,x in enumerate([-1.65,0,1.65]):
 box('Insulator pedestal'+str(i),[x,1.62,0],[1.15,.3,1.1],'ceramic')
 box('Coil'+str(i),[x,2.18,0],[.88,.85,.58],'copper',i)
 for y in [1.8,2.57]:box('Ferrite collar'+str(i)+str(y),[x,y,0],[1.13,.12,.9],'dark')
 for z in [-.55,.55]:
  box('Shutter'+str(i)+str(z),[x,2.18,z],[1.16,.85,.18],'steel',i,True)
  box('Actuator'+str(i)+str(z),[x+.66,2.1,z],[.13,1.45,.18],'ceramic')
 for y in [1.97,2.17,2.37]:box('Winding'+str(i)+str(y),[x,y,0],[1.0,.055,.72],'copper',i)
 box('Emitter'+str(i),[x,2.85,0],[.48,.22,.55],'ceramic')
 box('EmitterTip'+str(i),[x,2.85,.32],[.32,.12,.12],'copper',i)
box('Central transformer',[0,.95,-1.35],[1.6,1.3,.45],'ceramic')
for x in [-1.5,-.75,0,.75,1.5]:box('Cooling rib'+str(x),[x,.9,1.18],[.1,.65,.1],'dark')
manifest=dict(origin=[11,0,16],parts=parts,provenance='Original procedural hard-surface construction by Codex, no external meshes/textures',ownership='Static mission device, never generic enemy disposal')
(R/'src/custodian-layout.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
colors={'dark':(.045,.065,.075,1),'steel':(.24,.29,.30,1),'ceramic':(.66,.64,.51,1),'copper':(.55,.22,.065,1)}
mats={}
for n,c in colors.items():
 m=bpy.data.materials.new(n);m.diffuse_color=c;m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=c;bs.inputs['Metallic'].default_value=.7 if n!='ceramic' else .15;bs.inputs['Roughness'].default_value=.42;mats[n]=m
for p in parts:
 x,y,z=p['p'];sx,sy,sz=p['s'];bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=bpy.context.object;o.name=p['name'];o.scale=(sx,sz,sy);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mats[p['mat']])
bpy.ops.wm.save_as_mainfile(filepath=str(R/'public/assets/custodian.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/custodian.glb'),export_format='GLB',export_yup=True)
(R/'public/assets/custodian-provenance.json').write_text(json.dumps(dict(**manifest,triangles=len(parts)*12,materialCount=4),indent=2)+'\n')
