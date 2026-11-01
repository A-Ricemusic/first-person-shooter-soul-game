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
# Layered armor stays entirely inside the existing collision envelopes.
armor=material('Ceramic sacrificial armor',(.29,.36,.34),.28,.72)
scuff=material('Exposed impact ceramic',(.47,.49,.43),.12,.86)
for p in layout['parts']:
 if 'blast plate' not in p['name']:part(p['name'],p['center'],p['size'],green if p['name']=='Beacon' else paint)
for x in [-2.05,2.05]:
 part('Continuous armor backing',(x,1.15,29.86),(1.3,2.3,.19),steel)
 for y,h in [(.48,.84),(1.29,.68),(2.00,.5)]:
  o=part('Replaceable ceramic course',(x,y,29.741),(1.22,h,.09),armor)
  mod=o.modifiers.new('Pressed edge radius','BEVEL');mod.width=.018;mod.segments=2
 for dx in [-.53,.53]:
  part('Rear structural channel',(x+dx,1.16,29.975),(.12,2.12,.05),edge)
  part('Bolted anchor shoe',(x+dx,.16,30.15),(.22,.16,.42),steel)
  for y in [.27,1.12,2.09]:
   part('Recessed bolt socket',(x+dx,y,29.696),(.09,.09,.012),dark)
   part('Hex captive head',(x+dx,y,29.694),(.045,.045,.008),edge)
 for y in [.5,1.22,1.94]:part('Rear horizontal stiffener',(x,y,29.978),(1.02,.09,.05),steel)
 # Non-emissive cream grip marks identify the inward edge at first-person scale.
 side=1 if x<0 else -1
 for y in [.72,.89,1.06]:part('Inward edge enamel',(x+side*.61,y,29.84),(.06,.07,.24),scuff)
 for j in range(9):
  part('Lower impact abrasion',(x-.43+j*.103,.18+(j%3)*.035,29.692),(.05+(j%2)*.025,.014,.004),scuff)
part('Console face',(0,.89,34.2),(1.3,.01,.54),dark)
for i in range(12):part('UplinkCell%02d'%i,(-.55+i*.1,.92,34.2),(.075,.025,.25),green)
# Flush inlay: all tops <= 0.004m; no new collision or raised dash obstacles.
f=layout['footprint'];cx,cz=layout['center']
x0,x1=cx+f['xMin'],cx+f['xMax'];z0,z1=cz+f['zMin'],cz+f['zMax']
deck=material('Uplink deck brushed steel',(.115,.17,.18),.7,.65)
seam=material('Recessed cable channel',(.025,.045,.05),.6,.8)
mark=material('Deck inward enamel',(.48,.53,.39),.2,.8)
for ix in range(10):
 for iz in range(6):
  x=x0+(ix+.5)*(x1-x0)/10;z=z0+(iz+.5)*(z1-z0)/6
  part('Flush deck cassette',(x,-.008,z),((x1-x0)/10-.025,.02,(z1-z0)/6-.025),deck)
  for dx in [-.62,.62]:
   for dz in [-.61,.61]:part('Countersunk deck fastener',(x+dx,.003,z+dz),(.045,.002,.045),edge)
  for j in [-.32,0,.32]:part('Inset traction slat',(x+j,.002,z),(.035,.002,.75),seam)
for x in [x0+.12,x1-.12]:
 part('Perimeter cable channel',(x,.001,(z0+z1)/2),(.10,.002,z1-z0-.2),seam)
 for z in [z0+.5,z0+2.5,z0+4.5,z0+6.5,z1-.5]:
  part('Inward deck marker',(x+(.18 if x<cx else -.18),.004,z),(.27,.002,.09),mark)
for z in [z0+.12,z1-.12]:part('Transverse cable channel',((x0+x1)/2,.001,z),(x1-x0-.2,.002,.10),seam)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'uplink-defense.glb'),export_format='GLB',use_selection=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'uplink-defense.blend'))
json.dump({'author':'SOULFALL original Blender authorship','source':'tools/build_uplink.py','layout':'src/uplink-layout.json','triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'),'objects':len(bpy.context.scene.objects),'glbBytes':os.path.getsize(os.path.join(OUT,'uplink-defense.glb')),'footprint':layout['footprint'],'deck':'Flush metal inlay, no added colliders','collision':'Shared exact solid envelopes; inset trim; fixed geometry in every power state'},open(os.path.join(ROOT,os.environ.get('UPLINK_PROVENANCE','docs/current-uplink-provenance.json')),'w'),indent=2)
