"""Original SOULFALL handling assets. Blender -b --python tools/build_viewmodel.py.
Reuses authored rifle definitions without modifying the original asset set.
Hands are segmented padded gloves, not scanned anatomy. Units match camera meters.
"""
import bpy, os, math
from mathutils import Vector
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
rifle()
# Preserve the reload cell as a separate node; bake all other rifle parts together.
cell=bpy.data.objects.get('Energy cell')
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o!=cell:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.context.selected_objects[0]
bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='RifleBody'
cell.name='ReloadCell'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'coil-rifle-handling.glb'),export_format='GLB',use_selection=True,export_apply=True)
# Hide rifle in source while authoring hands; export only hands below.
for o in list(bpy.data.objects):o.hide_set(True)
cloth=material('Operator storm sleeve',(.055,.085,.095),.05,.94)
glove=material('Graphite glove leather',(.10,.12,.125),.05,.86)
pad=material('Knuckle armor',(.22,.27,.28),.32,.55)
stitch=material('Cuff signal thread',(.035,.36,.40),.1,.72)
def cv(p):return Vector((p[0],-p[2],p[1]))
def segment(name,a,b,r,mat,parent):
    a,b=cv(a),cv(b)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=(a+b)/2)
    o=bpy.context.object;o.name=name;o.scale=(r,r,(b-a).length/2+r*.3);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(mat);o.parent=parent
    for p in o.data.polygons:p.use_smooth=True
for side,palm,wrist,elbow in [('Support',(-.045,-.08,-.54),(-.18,-.19,-.38),(-.31,-.36,-.10)),('Grip',(.035,-.135,-.22),(.12,-.22,-.06),(.21,-.38,.16))]:
    root=bpy.data.objects.new(side+'Hand',None);bpy.context.collection.objects.link(root)
    segment('Storm sleeve',elbow,wrist,.052,cloth,root)
    segment('Sealed cuff',wrist,tuple(wrist[i]+(palm[i]-wrist[i])*.22 for i in range(3)),.056,pad,root)
    segment('Glove palm',wrist,palm,.043,glove,root)
    # Four visibly articulated fingers curl across the grip/fore-end.
    for i in range(4):
        z=palm[2]+(i-1.5)*.022
        a=(palm[0]-.025,palm[1]+.012,z);b=(palm[0]+.026,palm[1]+.025,z);c=(palm[0]+.046,palm[1]-.012,z)
        segment('Finger proximal',a,b,.011,glove,root);segment('Finger curled tip',b,c,.010,glove,root)
        segment('Knuckle pad',a,(a[0]+.015,a[1]+.008,z),.012,pad,root)
    segment('Thumb', (palm[0]-.03,palm[1]-.025,palm[2]+.035),(palm[0]+.025,palm[1]-.022,palm[2]+.045),.014,glove,root)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if not o.hide_get():o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'operator-hands.glb'),export_format='GLB',use_selection=True,export_apply=True)
for o in bpy.data.objects:o.hide_set(False)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'operator-handling.blend'))
