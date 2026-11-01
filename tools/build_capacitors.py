"""Original SOULFALL capacitor assembly. Blender -b --python tools/build_capacitors.py.
Metadata uses game Y-up; export uses Blender Z-up. Every solid is an exact box.
"""
import bpy, os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
parts=[]
colors={'steel':[.12,.19,.22],'enamel':[.38,.46,.43],'copper':[.54,.28,.10],'dark':[.035,.06,.07],'lamp':[1,.43,.06]}
def box(name,p,s,mat,solid=False,target=False):
    parts.append(dict(name=name,position=p,size=s,color=colors[mat],emission=.8 if mat=='lamp' else 0,solid=solid,target=target))
    bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1])); o=bpy.context.object;o.name=name;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    m=bpy.data.materials.get(mat)
    if not m:
        m=bpy.data.materials.new(mat);m.diffuse_color=(*colors[mat],1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*colors[mat],1);b.inputs['Metallic'].default_value=.65;b.inputs['Roughness'].default_value=.38
        if mat=='lamp':b.inputs['Emission Color'].default_value=(*colors[mat],1);b.inputs['Emission Strength'].default_value=.8
    o.data.materials.append(m)
box('Grounded cabinet',[0,.85,0],[1.45,1.7,.9],'enamel',True,True)
box('Pressure lid',[0,1.77,0],[1.55,.14,1],'steel',True,True)
for x in [-.58,.58]:
    box('Foot bracket'+str(x),[x,.1,0],[.3,.2,1.12],'steel',True)
    box('Support'+str(x),[x,1, .5],[.12,1.8,.12],'steel',True)
for x in [-.42,.42]:
    box('Isolator'+str(x),[x,2.09,0],[.24,.5,.32],'copper',True,True)
    for y in [1.91,2.03,2.15]:box('Ceramic rib'+str(x)+str(y),[x,y,0],[.34,.045,.4],'enamel',True,True)
box('Conductor',[0,2.38,0],[1.14,.12,.18],'copper',True,True)
box('Warning strip',[0,1.36,.462],[1.25,.12,.025],'lamp')
box('Gauge rim',[.4,.97,.48],[.3,.35,.08],'steel')
box('Gauge',[.4,.97,.526],[.22,.26,.016],'lamp')
for y in [.43,.54,.65]:box('Relief slot'+str(y),[-.12,y,.46],[.8,.045,.025],'dark')
for x in [-.6,.6]:box('Ground pipe'+str(x),[x,.65,-.49],[.09,1.3,.09],'copper',True)
os.makedirs(ROOT+'/assets/source',exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/source/capacitor-bank.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/capacitor-bank.glb',export_format='GLB')
open(ROOT+'/src/capacitor-parts.json','w').write(json.dumps(parts,indent=2)+'\n')
