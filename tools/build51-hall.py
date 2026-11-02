"""Build51 original Custodian induction hall. No downloaded geometry or textures.
Shared metadata drives every authored box, fallback, collision and roof mask."""
import json,os
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
layout=json.load(open(os.path.join(ROOT,'src/induction-layout.json')))
colors={'roof':(.23,.29,.30,.5,.65),'steel':(.09,.14,.16,.75,.4),'edge':(.37,.43,.43,.8,.35),'enamel':(.33,.43,.39,.3,.7),'concrete':(.19,.22,.23,.05,.9),'ceramic':(.68,.66,.51,.05,.7),'copper':(.40,.22,.12,.7,.5),'mark':(.62,.55,.30,.15,.8),'dark':(.025,.035,.035,.1,.9)}
mats={k:material('Induction '+k,v[:3],v[3],v[4]) for k,v in colors.items()}
def build():
 for p in layout['parts']:
  x,y,z=p['center'];w,h,d=p['size'];box(p['name'],(x,-z,y),(w,d,h),mats[p['material']],0)
asset('induction-hall',build)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'induction-hall.blend'))
json.dump({'author':'SOULFALL original procedural Blender authorship','build':51,'source':'tools/build51-hall.py','layout':'src/induction-layout.json','triangles':sum(len(p.vertices)-2 for o in bpy.context.scene.objects if o.type=='MESH' for p in o.data.polygons),'objects':len(layout['parts']),'materials':len(mats),'glbBytes':os.path.getsize(os.path.join(OUT,'induction-hall.glb')),'textureBytes':0,'dependencies':'Local original helpers only. Each closed box exactly matches layout; no borrowed commercial assets.'},open(os.path.join(OUT,'induction-hall-provenance.json'),'w'),indent=2)
