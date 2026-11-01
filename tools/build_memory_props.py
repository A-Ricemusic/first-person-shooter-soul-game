"""Original memory dioramas, meters / Z up. No borrowed geometry.
Blender -b --python tools/build_memory_props.py. Export separate props, preserve sources.
"""
import bpy, os
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
linen=material('Evacuation canvas',(.53,.65,.59),0,.94)
medical=material('Medical ivory enamel',(.66,.73,.68),.2,.5)
green=material('Last ferry lamp',(.08,.8,.4),.2,.4,2)
def medical_bay():
    box('Folded evacuation cot',(0,0,.85),(2.5,.85,.17),linen)
    for x in [-1,1]:
        for y in [-.32,.32]:box('Cot folding leg',(x,y,.4),(.08,.08,.8),edge)
    box('Empty pillow',(.8,0,1.02),(.55,.7,.17),medical)
    box('Medic case',(-.6,1,.35),(.8,.6,.7),medical)
    box('Cross vertical',(-.6,.69,.4),(.09,.025,.34),green)
    box('Cross horizontal',(-.6,.68,.4),(.32,.025,.09),green)
    cyl('Lamp stand',(-1,1.2,.625),.035,1.25,edge)
    cyl('Lamp foot',(-1,1.2,.04),.2,.08,steel)
    cyl('Ferry lamp',(-1,1.2,1.4),.13,.35,green)
def engineering():
    box('Repair bench',(0,0,1.05),(3,1,.18),edge)
    for x in [-1.2,1.2]:box('Bench support',(x,0,.5),(.12,.8,1),steel)
    for x in [-.8,0,.8]:
        cyl('Removed induction coil',(x,0,1.4),.24,.5,amber)
        cyl('Exposed conductor',(x,0,1.7),.13,.1,cyan)
    box('Cutoff bracket',(-1,.15,1.7),(.12,.16,1),steel)
    box('Emergency cutoff',(-1,0,2.1),(.6,.25,.5),amber)
    box('Cut cable tray',(0,.6,.18),(3,.15,.2),dark)
def relay():
    for x in [-1.2,0,1.2]:
        box('Console pedestal',(x,.1,.5),(.65,.6,1),steel)
        box('Display support',(x,.25,1.3),(.12,.12,.6),edge)
        box('Operator console',(x,0,1.05),(1,.8,.18),steel)
        o=box('Signal display',(x,.2,1.6),(.85,.12,.7),cyan);o.rotation_euler.x=-.28
        for i in range(4):box('Signal key',(x-.25+i*.16,-.2,1.17),(.08,.12,.04),edge)
    cyl('Empty operator stool',(0,-1,.65),.38,.14,dark)
    cyl('Stool stem',(0,-1,.3),.07,.6,edge)
    cyl('Stool base',(0,-1,.05),.32,.1,steel)
asset('memory-medical',medical_bay)
asset('memory-engineering',engineering)
asset('memory-relay',relay)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'memory-stories.blend'))
