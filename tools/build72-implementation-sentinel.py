"""Original Build72 load-frame Sentinel. All geometry authored here; no external assets.
Blender Z-up/-Y front exports glTF Y-up/+Z. Meter scale. Never writes legacy assets.
"""
import bpy, math, json, hashlib, base64
from pathlib import Path
R=Path(__file__).resolve().parents[1]; A=R/'public/assets'; stem='build72-implementation-sentinel'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,m,r):
 a=bpy.data.materials.new(n);a.diffuse_color=(*c,1);a.use_nodes=True;p=a.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=m;p.inputs['Roughness'].default_value=r;return a
ivory=mat('Service ivory enamel',(.57,.61,.52),.42,.48);steel=mat('Exposed bearing steel',(.23,.30,.32),.85,.32);dark=mat('Protected graphite recess',(.025,.045,.05),.5,.65);amber=mat('Safety ochre',(.64,.30,.055),.4,.54);optic=mat('Optic',(.8,.12,.025),.3,.38)
p=optic.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(.8,.12,.025,1);p.inputs['Emission Strength'].default_value=.65
animated={'Optic','ShutterTop','ShutterBottom','VaneLeft','VaneRight'}|{p+s for p in ['Upper','Lower','Knee','Foot'] for s in ['Left','Right']}
def box(n,p,s,m,b=.012):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(p[0],-p[2],p[1]));o=bpy.context.object;o.name=n;o.dimensions=(s[0],s[2],s[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:
  mod=o.modifiers.new('Cast machined edge','BEVEL');mod.width=b;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def axle(n,p,r,d,m):
 bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=d,location=(p[0],-p[2],p[1]),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=n;o.data.materials.append(m);return o
# Two full-height load rails enclose a protected central transmission.
box('Transmission',(0,.98,-.07),(.25,.55,.26),dark)
for s in [-1,1]:
 box('LoadRail',(s*.18,1.13,-.065),(.075,.76,.25),steel)
 box('ShoulderEnamel',(s*.225,1.47,.015),(.17,.23,.34),ivory,.035)
 box('CheekPlate',(s*.23,1.28,.13),(.10,.19,.25),amber)
 box('EmitterFork',(s*.105,1.3,.265),(.065,.25,.26),steel)
 box('RearServiceCover',(s*.10,1.24,-.23),(.17,.40,.045),ivory)
 for y in [.88,1.05,1.22,1.39]:box('CoolingRecess',(s*.20,y,-.205),(.028,.025,.07),dark,.002)
 for y in [1.4,1.53]:axle('ShoulderFastener',(s*.315,y,.03),.022,.014,steel)
box('Pelvis',(0,.77,0),(.47,.16,.23),steel,.03)
box('BreastEnamel',(0,1.01,.115),(.34,.30,.075),ivory,.025)
# Authored exposed-edge chips remain flush with enamel; no stock wear map.
for i in range(9):
 x=-.145+i*.034
 box('EnamelEdgeWear',(x,1.145 if i%2 else .875,.152),(.012+(i%3)*.006,.004,.003),steel,.001)
box('BellyWarning',(0,.86,.125),(.28,.055,.025),amber,.004)
# Supported optic/emitter face remains exactly at legacy anchor. Open central channel.
box('EmitterRecess',(0,1.3,.31),(.22,.18,.18),dark)
box('Optic',(0,1.3,.418),(.22,.16,.024),optic,.012)
box('ShutterTop',(0,1.465,.25),(.31,.065,.22),ivory)
box('ShutterBottom',(0,1.135,.25),(.31,.065,.22),steel)
for sign,side in [(-1,'Left'),(1,'Right')]:
 x=sign*.23
 axle('HipBearing',(x,.77,0),.095,.13,dark)
 # Detail joined to unit link before solver scales its length. Bearings remain on endpoints.
 box('Upper'+side,(x,.57,0),(.13,1,.14),ivory,.02)
 box('Lower'+side,(x,.25,0),(.085,1,.10),steel,.016)
 axle('Knee'+side,(x,.43,.13),.085,.145,amber)
 box('Foot'+side,(x,.065,0),(.17,.13,.24),dark,.018)
 box('Vane'+side,(sign*.15,.98,-.22),(.10,.24,.045),steel,.008)
for material in [ivory,steel,dark,amber]:
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in animated and o.active_material==material]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='LoadFrame_'+material.name
for side in ['Left','Right']:
 bpy.data.objects['Upper'+side].scale.z=.40;bpy.data.objects['Lower'+side].scale.z=.38
for o in bpy.context.scene.objects:o['build72']='Fixed optic; independent bearing links; brace shutters and rear dampers'
bpy.ops.wm.save_as_mainfile(filepath=str(A/(stem+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(A/(stem+'.glb')),export_format='GLB',export_yup=True,export_extras=True)
data=(A/(stem+'.glb')).read_bytes()
# Byte-identical geometry fallback is lazy imported ONLY on new URL load failure.
(R/'src/build72-sentinel-fallback.js').write_text('export default '+json.dumps(base64.b64encode(data).decode())+';\n')
tri=0
for o in bpy.context.scene.objects:
 o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
report={'original':True,'generator':'tools/build72-implementation-sentinel.py','externalAssets':False,'textures':0,'materialDetail':'Modeled bevels, bearing caps, fasteners, cooling recesses; no claim of baked wear textures.','triangles':tri,'meshPrimitives':len(bpy.context.scene.objects),'glbBytes':len(data),'optic':[0,1.3,.418],'fallback':'Lazy imported byte-identical GLB payload; shared template, actor-local materials.','sha256':{e:hashlib.sha256((A/(stem+'.'+e)).read_bytes()).hexdigest() for e in ['blend','glb']}}
(A/(stem+'-provenance.json')).write_text(json.dumps(report,indent=2)+'\n');print(report)
