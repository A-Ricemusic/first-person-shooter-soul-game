"""Original Blackwater triage architecture. Shared JSON is authoritative in meters / Y up.
Run Blender -b --python tools/build_medical.py. No downloaded geometry/materials."""
import json, os
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
layout=json.load(open(os.path.join(ROOT,'src','medical-layout.json')))
enamel=material('Triage aged ivory enamel',(.40,.49,.46),.18,.7)
roof=material('Canopy concrete',(.23,.28,.29),.05,.9)
def build():
    mats={'wall':concrete,'roof':roof,'steel':steel,'enamel':enamel}
    for p in layout['parts']:
        x,y,z=p['center'];w,h,d=p['size']
        box(p['name'],(x,-z,y),(w,d,h),mats[p['material']],0)
    # Intentional construction detail: steel roof ribs and wall expansion seams.
    for z in [-27,-22,-17,-12]:
        box('Canopy underside rib',(-25.25,-z,7.18),(22,.16,.24),steel,0)
    for x in [-35,-32,-29,-26,-23,-20,-17]:
        box('Rear panel joint',(x,28.68,3.1),(.035,.025,5.9),dark,0)
    for x in [-34.5,-33,-31.5]:
        box('Locker seam',(x,26.48,1.3),(.035,.02,2.25),dark,0)
        box('Locker pull',(x+.3,26.43,1.3),(.06,.08,.3),edge,0)
    for z in [-24,-22,-20]:
        box('Storage door seam',(-28.49,-z,1.35),(.02,.035,2.45),dark,0)
        box('Storage pull',(-28.44,-z-.4,1.4),(.08,.3,.06),edge,0)
    # Two folded stretchers stowed on back wall; empty ferry tags on desk.
    for x in [-23,-21]:
        box('Stowed stretcher canvas',(x,28.5,1.4),(.7,.23,2.4),enamel,0)
        for dx in [-.42,.42]:box('Stretcher carrying rail',(x+dx,28.5,1.4),(.08,.3,2.7),edge,0)
    desk=next(p for p in layout['parts'] if p['name']=='Intake desk')
    dx,dy,dz=desk['center'];top=dy+desk['size'][1]/2+.015
    for offset in [-.7,-.2,.3]:box('Blank ferry triage tag',(dx+offset,-dz,top),(.28,.32,.025),enamel,0)
asset('west-triage',build)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'west-triage.blend'))
