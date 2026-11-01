"""Original SOULFALL receiver, meters/Z-up. No external assets.
Run Blender -b --python tools/build_receiver.py; glTF exports Y-up.
The 1.2 x .8 x .88 cabinet supports a .96m deck; cassette contacts reach .974m.
Per-mesh controls retain exact physical bounds, including front/rear grasp rails.
"""
import bpy, os, json
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
enamel=material('Receiver sea-grey enamel',(.20,.31,.32),.48,.52)
insert=material('Bounded cyan phosphor',(.025,.32,.36),.25,.48,.65)
def part(n,p,s,m):return box(n,p,s,m,0)
ivory=material('Human archive ivory enamel',(.58,.62,.55),.15,.63)
label=material('Archive index paper',(.72,.68,.51),0,.9)
# Narrow plinth, recessed middle, broad pale dock: a human-use object, not a pylon.
part('Cabinet',(0,0,.44),(1.2,.8,.88),enamel)
part('Rubber plinth',(0,0,.06),(1.18,.78,.12),dark)
part('Top docking rim',(0,0,.91),(1.18,.78,.10),ivory)
for side in [-1,1]:
 y=side*.402
 part('Inset service panel',(0,y,.43),(1.02,.008,.60),steel)
 for x in [-.48,.48]:
  for z in [.17,.69]:part('Captive fastener',(x,y+side*.007,z),(.03,.008,.03),edge)
 part('Hand recess',(0,side*.409,.78),(.70,.012,.12),dark)
 for x in [-.40,.40]:part('Grasp rail',(x,side*.414,.79),(.10,.018,.20),ivory)
 for z in [.24,.29,.34]:part('Cooling slit',(.32,side*.410,z),(.20,.006,.012),dark)
 part('Index card',(-.26,side*.414,.64),(.31,.008,.11),label)
 for i in range(3):part('Printed index',(-.27,side*.420,.66-i*.025),(.23-i*.035,.003,.007),dark)
part('Cassette socket',(0,0,.962),(.72,.48,.004),dark)
part('MemoryCassette',(0,0,.968),(.52,.32,.008),edge)
for x in [-.17,-.06,.06,.17]:part('Recessed contact',(x,0,.973),(.035,.21,.002),insert)
part('Progress',(.0,-.423,.79),(.28,.006,.035),insert)
for x in [-.574,.574]:
 part('Folded side armor',(x,0,.48),(.04,.75,.72),ivory)
 for j in range(5):part('Edge abrasion',(x,-.28+j*.12,.17),(.043,.035,.014),edge)
# Grounded cable in flush protective raceway, exactly five metres to rear landmark.
part('Cable raceway',(0,2.7,-.026),(.12,4.6,.05),dark)
part('Cable spine',(0,2.7,-.004),(.035,4.6,.008),edge)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'memory-receiver.glb'),export_format='GLB',use_selection=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'memory-receiver.blend'))
tri=0
for o in bpy.context.scene.objects:
 if o.type=='MESH':tri+=sum(len(p.vertices)-2 for p in o.data.polygons)
json.dump({'author':'SOULFALL original procedural Blender authorship','source':'tools/build_receiver.py','units':'meters; Blender Z up; glTF Y up','triangles':tri,'objects':len(bpy.context.scene.objects),'glbBytes':os.path.getsize(os.path.join(OUT,'memory-receiver.glb')),'collision':'Continuous cabinet bounds; flush grounded cable at/below floor; controls use matching mesh AABBs.'},open(os.path.join(ROOT,os.environ.get('RECEIVER_PROVENANCE','docs/current-receiver-provenance.json')),'w'),indent=2)
