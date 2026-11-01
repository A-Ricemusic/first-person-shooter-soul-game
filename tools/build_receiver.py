"""Original SOULFALL receiver, meters/Z-up. No external assets.
Run Blender -b --python tools/build_receiver.py; glTF exports Y-up.
All controls sit within a continuous 1.2 x .8 x .96 cabinet envelope.
"""
import bpy, os, json
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
enamel=material('Receiver sea-grey enamel',(.20,.31,.32),.48,.52)
insert=material('Bounded cyan phosphor',(.025,.32,.36),.25,.48,.65)
def part(n,p,s,m):return box(n,p,s,m,0)
part('Cabinet',(0,0,.48),(1.2,.8,.96),enamel)
part('Inset front service panel',(0,-.402,.43),(1.02,.008,.62),steel)
for x in [-.48,.48]:
 for z in [.16,.70]:part('Captive fastener',(x,-.409,z),(.025,.008,.025),edge)
for z in [.29,.34,.39]:part('Cooling slit',( .30,-.410,z),(.25,.006,.012),dark)
part('Cassette dock',(-.25,-.413,.79),(.44,.015,.20),dark)
part('MemoryCassette',(-.25,-.425,.79),(.33,.025,.13),edge)
for x in [-.36,-.29,-.22,-.15]:part('Lattice contact',(x,-.440,.79),(.018,.006,.085),insert)
part('Screen',( .25,-.414,.79),(.30,.012,.16),dark)
part('Progress',( .25,-.423,.79),(.26,.006,.035),insert)
for x in [.15,.25,.35]:part('Sealed key',(x,-.416,.64),(.055,.014,.04),edge)
for x in [-.57,.57]:part('Corner wear',(x,-.406,.48),(.015,.008,.73),edge)
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
