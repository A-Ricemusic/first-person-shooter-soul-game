"""Original Build45 Custodian. Blender is the sole mesh author; Y-up mesh payload is also the exact fallback."""
import bpy,json,math
from pathlib import Path
R=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
colors={'dark':(.035,.052,.064,1),'steel':(.23,.30,.34,1),'ceramic':(.72,.67,.48,1),'copper':(.48,.16,.045,1),'mark':(.85,.72,.34,1)}
mats={}
for name,color in colors.items():
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=color;b.inputs['Metallic'].default_value=.1 if name in ['ceramic','mark'] else .75;b.inputs['Roughness'].default_value=.38;mats[name]=m
parts=[]
def part(name,p,s,mat,coil=-1,shutter=False,solid=False,form='box',head=False):
 if form=='ring':bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=.43,minor_radius=.065,location=(0,0,0))
 elif form=='cylinder':bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.5,depth=1)
 else:bpy.ops.mesh.primitive_cube_add(size=1)
 o=bpy.context.object;o.name=name
 # Blender Z-up -> Three Y-up. Cylinders and rings stand vertically.
 o.scale=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if form=='box':
  mod=o.modifiers.new('Machined edge radii','BEVEL');mod.width=min(s)*.12;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(mats[mat]);o.location=(p[0],-p[2],p[1]);o.data.calc_loop_triangles()
 verts=[v for v in o.data.vertices];pos=[];norm=[]
 for tri in o.data.loop_triangles:
  for idx in tri.vertices:
   v=verts[idx];pos.extend([v.co.x,v.co.z,-v.co.y]);n=tri.normal;norm.extend([n.x,n.z,-n.y])
 parts.append(dict(name=name,p=p,s=s,mat=mat,coil=coil,shutter=shutter,solid=solid,form=form,head=head,positions=pos,normals=norm))
part('Foundation',[0,.25,0],[5,.5,2.8],'dark',solid=True)
part('Cast_power_housing',[0,1,0],[4.7,1,2.3],'steel',solid=True)
for side,x in enumerate([-2.25,2.25]):
 part(f'Outrigger_{side}',[x,.12,1.7],[.5,.24,1.6],'steel',solid=True)
 part(f'Bearing_{side}',[x,1.95,0],[.18,1.9,.3],'dark',solid=True)
for i,x in enumerate([-1.65,0,1.65]):
 z=[-.2,.2,-.2][i]
 part(f'Insulator_{i}',[x,1.65,z],[1.12,.3,1.12],'ceramic',form='cylinder')
 part(f'Coil{i}',[x,2.18,z],[.67,.82,.67],'copper',i,form='cylinder')
 for j in range(8):part(f'Winding_{i}_{j}',[x,1.83+j*.1,z],[1,.75,1],'copper',i,form='ring')
 for j,y in enumerate([1.76,2.62]):part(f'Collar_{i}_{j}',[x,y,z],[1.13,.13,1.13],'ceramic',form='cylinder')
 for face,sign in enumerate([-1,1]):
  part(f'Shutter_{i}_{face}',[x,2.18,z+sign*.57],[1.16,.85,.14],'steel',i,True)
  part(f'Rail_{i}_{face}',[x+.64,2.46,z+sign*.57],[.1,1.65,.12],'dark')
  part(f'Piston_{i}_{face}',[x-.64,2.65,z+sign*.57],[.07,.9,.07],'ceramic',form='cylinder')
  # physical Roman I/II/III identities on both shutter faces; order follows coil, not view.
  for j in range(i+1):part(f'Identifier_{i}_{face}_{j}',[x+(j-i/2)*.16,2.18,z+sign*.65],[.06,.36,.025],'mark',i,True)
 part(f'Yaw_bearing_{i}',[x,2.79,z],[.46,.18,.46],'dark',form='cylinder')
 part(f'Head_{i}',[x,2.85,z+.55],[.36,.3,.48],'ceramic',i,head=True)
 part(f'Barrel_{i}',[x,2.85,z+.91],[.17,.17,.4],'dark',i,head=True)
 part(f'Muzzle_{i}',[x,2.85,z+1.13],[.22,.22,.06],'copper',i,head=True)
 for face,sign in enumerate([-1,1]):
  part(f'Conduit_{i}_{face}',[x+.56,1.86,z+sign*.3],[.07,.68,.07],'dark',form='cylinder')
for j in range(9):part(f'Heat_sink_{j}',[-1.6+j*.4,.95,1.2],[.06,.7,.25],'dark')
manifest=dict(version=45,origin=[11,0,16],parts=parts,coils=[dict(id=i,x=x,z=[-.2,.2,-.2][i],pivot=[x,2.85,[.35,.75,.35][i]],muzzle=[0,0,.61],target=[x,2.18,[-.2,.2,-.2][i]]) for i,x in enumerate([-1.65,0,1.65])],provenance='Original procedural Blender mesh construction by Codex; no external meshes, textures or fonts.',ownership='Static mission-owned shared resources; persistent spent cover')
assert len({p['name'] for p in parts})==len(parts)
(R/'src/custodian-layout.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(R/'public/assets/custodian.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'public/assets/custodian.glb'),export_format='GLB',export_yup=True)
cost=dict(version=45,provenance=manifest['provenance'],generator='tools/build45-custodian.py',triangles=sum(len(p['positions'])//9 for p in parts),meshCount=len(parts),materialCount=len(mats),textureCount=0,estimatedDrawCalls=len(parts),glbBytes=(R/'public/assets/custodian.glb').stat().st_size,limits='Measured asset counts only; no hardware performance certification. Flat machined surfaces and simple procedural material colors; world and player remain stylized.')
(R/'public/assets/custodian-provenance.json').write_text(json.dumps(cost,indent=2)+'\n')
