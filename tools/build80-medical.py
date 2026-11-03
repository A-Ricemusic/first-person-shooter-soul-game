"""Original Blackwater triage architecture. Shared JSON is authoritative in meters / Y up.
Run Blender -b --python tools/build80-medical.py. No downloaded geometry/materials."""
import json, os
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
layout=json.load(open(os.path.join(ROOT,'src','build80-medical-layout.json')))
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
    # Evacuation green belongs to manufactured egress fittings, never memory cyan.
    green=material('Evacuation green enamel',(.12,.32,.19),.15,.72,.12)
    pale=material('Worn evacuation infill',(.55,.68,.49),.1,.85,.22)
    stain=material('Flood sediment',(.13,.16,.13),.05,.95)
    w=layout['wayfinding']
    # Paint films: millimetres above the wet slab, no physical collision lips.
    for a,b in w['aisles']:
        x,z=a;xx,zz=b
        box('Continuous evacuation floor stripe',((x+xx)/2,-(z+zz)/2,.009),(abs(xx-x)+.12,abs(zz-z)+.12,.006),green,0)
    for x in [-22,-18,-15]:
        # Paired diagonal strokes form arrows pointing east along both aisles.
        for z in [-16.7,-13.3]:
            for side in [-1,1]:
                o=box('Egress directional chevron',(x,-z+side*.16,.014),(.48,.08,.006),pale,0)
                o.rotation_euler.z=-side*.7
    for z in w['jambs']:
        # Recessed plates lie inside the authoritative wall return envelopes.
        box('Service jamb steel backing',(-14.27,-z,2.85),(.055,.24,5.7),steel,0)
        box('Green jamb identity',(-14.305,-z,2.85),(.014,.15,5.6),green,0)
        for h in [.4,2.8,5.3]:box('Jamb captive anchor',(-14.317,-z,h),(.01,.07,.07),edge,0)
    # Sign hangs directly from the existing lintel; short rods do not enter headroom.
    for z in [-15.45,-12.55]:box('Lintel sign hanger',(-14.34,-z,5.57),(.06,.06,.26),steel,0)
    box('Service sign steel tray',(-14,14,5.2),(.68,4.1,.9),steel,0)
    box('Return wall sign tray',(-14.31,28,2.3),(.035,2.0,.85),steel,0)
    box('Intake sign tray',(-25,9,5.2),(7,.68,1.1),steel,0)
    for x in [-27.5,-22.5]:box('Intake sign hanger',(x,9,5.57),(.06,.06,.26),steel,0)
    # Replace featureless wall planes with purpose: washable crash rail, drainage
    # band, modular liner joints and local tide marks, all on existing wall faces.
    for x in [-35,-32,-29,-26,-23,-20,-17]:
        box('Rear washable liner',(x,28.684,1.05),(2.86,.018,1.8),enamel,0)
        box('Rear sediment tide', (x,28.67,.36),(2.86,.014,.15),stain,0)
        box('Rear crash rail',(x,28.65,1.42),(2.86,.05,.12),steel,0)
    for z in [-28]:
        box('Service wall washable liner',(-14.313,-z,1.05),(.02,1.6,1.8),enamel,0)
        box('Service wall crash rail',(-14.34,-z,1.4),(.04,1.6,.12),steel,0)
        box('Service wall tide mark',(-14.33,-z,.38),(.02,1.6,.12),stain,0)
    # Connected frame, original manufactured egress fittings and a flush
    # painted aisle. No decorative box crosses the 7m x3.6m clear opening.
    for z in [-26.765,-19.735]:
        box('North service green jamb',(-14,-z,1.8),(.77,.025,3.6),green,0)
    box('North service sign tray',(-14,23.25,4.25),(.72,6.9,.82),steel,0)
    box('Rear relay turn sign tray',(-26,28.64,2),(4.15,.08,.88),steel,0)
    for a,b in zip(layout['wayfinding']['northAisle'],layout['wayfinding']['northAisle'][1:]):
        x,z=a;xx,zz=b;dx=xx-x;dz=zz-z;length=math.hypot(dx,dz);angle=math.atan2(-dx,-dz)
        o=box('North service painted aisle',((x+xx)/2,-(z+zz)/2,.012),(.12,length,.006),green,0)
        o.rotation_euler.z=angle
        for distance in range(2,int(length),3):
            px=x+dx*distance/length;pz=z+dz*distance/length
            for side in [-1,1]:
                o=box('North service directional chevron',(px+side*.16*math.cos(angle),-pz+side*.16*math.sin(angle),.017),(.48,.08,.006),pale,0)
                o.rotation_euler.z=angle-side*.7
    # Record original boxes before export joins them. Fallback shares exact
    # positions, local dimensions, rotations and linear PBR material values.
    surfaces=[];palette={}
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        assert abs(o.rotation_euler.x)<1e-7 and abs(o.rotation_euler.y)<1e-7
        xyz=list(zip(*(v.co[:] for v in o.data.vertices)));local=[max(a)-min(a) for a in xyz]
        m=o.data.materials[0];bs=m.node_tree.nodes.get('Principled BSDF')
        palette[m.name]={'color':list(bs.inputs['Base Color'].default_value)[:3],'metalness':bs.inputs['Metallic'].default_value,'roughness':bs.inputs['Roughness'].default_value,'emissive':list(bs.inputs['Emission Color'].default_value)[:3],'emissiveIntensity':bs.inputs['Emission Strength'].default_value}
        surfaces.append({'name':o.name,'center':[o.location.x,o.location.z,-o.location.y],'size':[local[0],local[2],local[1]],'rotationY':o.rotation_euler.z,'material':m.name})
    json.dump({'version':80,'surfaces':surfaces,'materials':palette,'provenance':'Exact original Blender boxes before join; no external content.'},open(os.path.join(ROOT,'src','build80-medical-surfaces.json'),'w'),indent=2)

asset('west-triage-build80',build)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'west-triage-build80.blend'))

tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
json.dump({'asset':'west-triage-build80','author':'SOULFALL original procedural Blender authorship','source':'tools/build80-medical.py','layout':'src/build80-medical-layout.json','units':'metres; layout Y up / Blender Z up / GLB Y up','triangles':tri,'glbBytes':os.path.getsize(os.path.join(OUT,'west-triage-build80.glb')),'collision':'Build80 authoritative structure. Northeast north-service aperture clear7m x3.6m, flush floor. Existing furniture retained; connected cheek walls/header/frame. Exact pre-join surface fallback.','dependencies':'Original local helpers; no downloaded or branded assets'},open(os.path.join(OUT,'west-triage-build80-provenance.json'),'w'),indent=2)
