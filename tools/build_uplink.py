"""Original split-baffle uplink terminal. Shared meter/Y-up layout converted to Blender.
No external assets. Solids exactly match layout envelopes; trim is inset.
"""
import bpy, os, json
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
layout=json.load(open(os.path.join(ROOT,'src/uplink-layout.json')))
paint=material('Uplink ceramic enamel',(.21,.31,.29),.5,.48)
green=material('Uplink phosphor',(.04,.32,.16),.3,.4,1)
def part(n,p,s,m):return box(n,(p[0],-p[2],p[1]),(s[0],s[2],s[1]),m,0)
for p in layout['parts']:part(p['name'],p['center'],p['size'],green if p['name']=='Beacon' else paint)
for x in [-2.05,2.05]:
 for dx in [-.52,.52]:
  part('Load-bearing rear rib',(x+dx,1.08,29.94),(.09,2.16,.12),steel)
  part('Anchor shoe',(x+dx,.12,30.22),(.18,.18,.25),edge)
 for y in [.22,2.08]:part('Captured plate edge',(x,y,30.0),(1.24,.08,.01),edge)
 for dx in [-.48,.48]:
  for y in [.32,1.98]:part('Plate rivet',(x+dx,y,30.005),(.05,.05,.01),edge)
part('Console face',(0,.89,34.2),(1.3,.01,.54),dark)
for i in range(12):part('UplinkCell%02d'%i,(-.55+i*.1,.92,34.2),(.075,.025,.25),green)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'uplink-defense.glb'),export_format='GLB',use_selection=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'uplink-defense.blend'))
json.dump({'author':'SOULFALL original Blender authorship','source':'tools/build_uplink.py','layout':'src/uplink-layout.json','triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'objects':len(bpy.context.scene.objects),'glbBytes':os.path.getsize(os.path.join(OUT,'uplink-defense.glb')),'collision':'Shared exact solid envelopes; inset trim; fixed geometry in every power state'},open(os.path.join(ROOT,'docs/quality-reviews/build21-uplink-provenance.json'),'w'),indent=2)
