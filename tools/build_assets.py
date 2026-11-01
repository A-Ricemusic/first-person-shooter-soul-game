"""SOULFALL original art. Run with Blender 5+: blender -b --python tools/build_assets.py.
All authored geometry/materials are generated locally; no external source assets.
Blender coordinates: Z up. glTF exporter converts to Three.js Y up.
"""
import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets')
os.makedirs(OUT, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)

def material(name, rgb, metal=0, rough=.45, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    if emission:
        bs.inputs['Emission Color'].default_value = (*rgb, 1)
        bs.inputs['Emission Strength'].default_value = emission
    return m

steel = material('Wet graphite cerakote',(.075,.095,.105),.85,.28)
edge = material('Brushed titanium',(.30,.36,.38),.94,.23)
dark = material('Rubber and recesses',(.015,.021,.025),.2,.75)
amber = material('Safety enamel',(.62,.22,.035),.55,.36)
cyan = material('Ion conductor',(.02,.72,.83),.55,.2,4)
red = material('Hostile optic',(.95,.15,.025),.5,.22,5)
concrete = material('Reinforced slate concrete',(.19,.22,.23),.12,.83)

def finish(o,name,mat,bevel=.03):
    o.name=name
    o.data.materials.append(mat)
    if bevel:
        b=o.modifiers.new('Machined edge radii','BEVEL'); b.width=bevel; b.segments=2
        b=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o

def box(name,loc,scale,mat=steel,bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)

def cyl(name,loc,r,depth,mat=steel,vertices=24,rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=bpy.context.object
    if rot: o.rotation_euler=rot
    return finish(o,name,mat,.012)

def sphere(name,loc,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale
    for p in o.data.polygons: p.use_smooth=True
    return finish(o,name,mat,0)

def asset(name,build):
    col=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(col)
    before=set(bpy.data.objects)
    build()
    objs=set(bpy.data.objects)-before
    for o in objs:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:o.select_set(True)
    bpy.context.view_layer.objects.active=next(iter(objs))
    # Bake bevels and join the asset. glTF emits one primitive per material,
    # keeping repeated props and enemy swarms affordable in a web renderer.
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.join()
    bpy.context.object.name=name
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_apply=True)
    col.hide_viewport=True
    for o in col.objects:o.hide_set(True)

def pylon():
    box('Foundation',(0,0,.22),(2.8,2.8,.44),concrete,.12)
    box('Footplate',(0,0,.54),(2.35,2.35,.2),edge)
    box('Armored transformer base',(0,0,1.25),(1.8,1.8,1.25),steel,.12)
    for x in [-.94,.94]:
        for y in [-.94,.94]:
            box('Corner impact guard',(x,y,1.2),(.16,.16,1.4),amber)
    for i in range(8):
        box('Heat exchanger fin',(0,-.96,.85+i*.12),(1.4,.12,.045),edge,.008)
    cyl('Insulated shaft',(0,0,3.2),.38,3.5,dark)
    for z in [1.9,2.3,2.7,3.1,3.5,3.9,4.3]:
        cyl('Ceramic induction ring',(0,0,z),.64,.13,edge,32)
        cyl('Glowing core ring',(0,0,z+.08),.43,.05,cyan,32)
    for x,y in [(-.95,0),(.95,0),(0,-.95),(0,.95)]:
        box('External brace',(x,y,3.1),(.13,.13,3.2),steel)
        box('Cyan conductor',(x*1.03,y*1.03,3.2),(.055,.055,2.2),cyan,.008)
    cyl('Crown',(0,0,4.85),1.0,.35,steel,8)
    cyl('Emitter',(0,0,5.12),.6,.17,cyan,32)
    cyl('Antenna',(0,0,5.7),.075,1.1,edge,12)
    for x in [-.7,.7]:
        box('Vent bank',(x,0,4.9),(.3,1.6,.36),edge)

def barricade():
    box('Heavy concrete barrier',(0,0,.72),(3.4,1.0,1.44),concrete,.12)
    box('Wet cap',(0,0,1.46),(3.5,1.1,.12),steel)
    for x in [-1.45,1.45]:
        box('Steel foot',(x,0,.12),(.32,1.45,.24),steel)
        box('Warning stripe',(x,-.52,.85),(.16,.035,.9),amber,.002)
        box('Anchor bolt',(x,-.54,1.26),(.1,.06,.1),edge)
    for x in [-.9,-.3,.3,.9]:
        box('Vertical scoring',(x,-.51,.72),(.035,.02,.95),dark,.002)
    box('Light recess',(0,-.53,1.25),(1.8,.04,.09),dark)
    box('Status light',(0,-.56,1.25),(1.5,.02,.035),cyan,.002)

def sentinel():
    sphere('Spherical armored chassis',(0,0,0),(.68,.47,.48),steel)
    box('Armored brow',(0,-.37,.2),(1.15,.35,.24),edge,.09)
    sphere('Primary lens',(0,-.44,0),(.26,.10,.20),dark)
    sphere('Hostile eye',(0,-.526,.015),(.18,.035,.115),red)
    for x in [-.78,.78]:
        box('Lateral weapons mount',(x,0,-.02),(.24,.7,.32),steel,.07)
        cyl('Twin cannon',(x,-.5,-.02),.08,.7,edge,16,(math.pi/2,0,0))
        cyl('Muzzle',(x,-.87,-.02),.10,.12,dark,16,(math.pi/2,0,0))
        box('Flank warning',(x,-.16,.16),(.18,.24,.025),amber,.006)
        cyl('Vector turbine',(x,.12,-.3),.16,.2,cyan,24)
    cyl('Lift generator',(0,0,-.39),.32,.22,dark,24)
    cyl('Lift glow',(0,0,-.53),.25,.035,cyan,24)
    for x in [-.45,.45]:
        fin=box('Stabilizer',(x,.18,.45),(.08,.5,.55),steel)
        fin.rotation_euler[1]=x*.5
    box('Spinal vent',(0,.36,.1),(.65,.15,.3),edge)
    for x in [-.24,-.12,0,.12,.24]:box('Vent opening',(x,.45,.1),(.055,.025,.2),dark,.003)

def rifle():
    # Forward is Blender -Y, exported glTF -Z.
    box('Receiver',(0,0,0),(.24,.65,.24),steel,.04)
    box('Upper assembly',(0,-.12,.14),(.20,.78,.10),edge,.025)
    box('Foregrip',(0,-.48,-.06),(.23,.43,.20),dark,.04)
    cyl('Ion acceleration barrel',(0,-.91,.04),.065,.65,edge,20,(math.pi/2,0,0))
    cyl('Muzzle shroud',(0,-1.25,.04),.105,.23,steel,20,(math.pi/2,0,0))
    cyl('Muzzle conductor',(0,-1.38,.04),.08,.035,cyan,20,(math.pi/2,0,0))
    box('Stock',(0,.48,-.015),(.17,.4,.18),dark)
    box('Stock pad',(0,.7,-.015),(.25,.07,.28),steel)
    grip=box('Grip',(0,.16,-.25),(.15,.20,.36),dark)
    grip.rotation_euler[0]=-.22
    mag=box('Energy cell',(0,-.18,-.27),(.16,.21,.35),steel)
    mag.rotation_euler[0]=.1
    for x in [-.125,.125]:
        box('Coil window',(x,-.45,.055),(.015,.26,.05),cyan,.003)
        box('Safety selector',(x,.14,.015),(.035,.1,.035),amber,.004)
    box('Optic mount',(0,0,.235),(.12,.27,.07),dark)
    box('Optic hood',(0,0,.31),(.16,.18,.12),steel)
    box('Optic lens',(0,-.098,.31),(.11,.015,.07),cyan,.002)
    for y in [-.48,-.38,-.28,-.18,-.08,.02,.12]:
        box('Picatinny rail',(0,y,.208),(.22,.035,.02),dark,.002)
    for x in [-.125,.125]:
        for y in [-.08,.23]:cyl('Receiver fastener',(x,y,.05),.018,.015,edge,12,(0,math.pi/2,0))

asset('signal-pylon',pylon)
asset('barricade',barricade)
asset('sentinel',sentinel)
asset('coil-rifle',rifle)
for c in bpy.data.collections:
    c.hide_viewport=False
    for o in c.objects:o.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'soulfall-assets.blend'))
print('SOULFALL original asset set authored and exported:', OUT)
