"""Original SOULFALL perimeter discharge cartridge; no imported assets or textures.
Blender Z up, glTF Y up. Six guarded electrodes surround the lower sight carriage.
Runtime slides the six shutters vertically; static supports are material-batched.
"""
import bpy, math, json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,emit=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=.75;p.inputs['Roughness'].default_value=.4;p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit;return m
steel=mat('DischargeSteel',(.22,.30,.32));dark=mat('DischargeInsulator',(.025,.04,.045));amber=mat('DischargeAmber',(.9,.34,.035),.25)
def box(name,x,y,z,s,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y+.3));o=bpy.context.object;o.name=name;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);return o
bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,major_radius=.35,minor_radius=.025,location=(0,0,1.28));bpy.context.object.name='SupportRing';bpy.context.object.data.materials.append(steel)
for i in range(6):
 a=i*math.tau/6+math.pi/6;x,z=math.sin(a),math.cos(a)
 for name,r,y,s,m in [('Support',.25,.98,(.25,.045,.07),steel),('Guide',.405,1.16,(.025,.34,.025),steel),('Insulator',.365,1.015,(.09,.13,.07),dark),('Electrode',.408,1.035,(.07,.11,.045),amber),('Shutter',.43,1.035,(.115,.14,.035),steel)]:
  o=box(f'{name}{i}',x*r,y,z*r,s,m);o.rotation_euler[2]=a-(math.pi/2 if name=='Support' else 0)
for m in [steel,dark,amber]:
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and not o.name.startswith('Shutter') and o.active_material==m]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=m.name
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'public/assets/contact-discharge.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/assets/contact-discharge.glb'),export_format='GLB',export_yup=True)
tris=0
for o in bpy.context.scene.objects:
 o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
report={'original':True,'externalAssets':False,'source':'tools/build_contact.py','triangles':tris,'meshes':len(bpy.context.scene.objects),'textures':0,'drawCallsPerActor':9,'variants':'shared sight-carriage mount; Warden x/z scale 1.5, others 1','motion':'six guarded shutters lift .16m; electrodes energize, release once, cool .22s; cyan cancellation .22s','costs':{ext:{'bytes':(ROOT/f'public/assets/contact-discharge.{ext}').stat().st_size,'sha256':hashlib.sha256((ROOT/f'public/assets/contact-discharge.{ext}').read_bytes()).hexdigest()} for ext in ['blend','glb']},'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(ROOT/'public/assets/contact-discharge-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
