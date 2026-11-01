"""Build39 original parametric hero prop; Blender -b --python tools/build_viewmodel.py.
No external meshes, scans, textures or copyrighted firearm references. Coordinates
below are camera-local meters; rifle export preserves the existing .5/Y-pi mount.
"""
import bpy, os, math, json
from mathutils import Vector
exec(open(os.path.join(os.path.dirname(__file__),'build_assets.py')).read().split("asset('signal-pylon'")[0])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# A bounded original finish map: directional tool marks and sparse worn grain.
image=bpy.data.images.new('Original brushed finish',width=256,height=256)
pixels=[]
for y in range(256):
 for x in range(256):
  v=.46+.06*math.sin(y*2.3)+.025*math.sin(x*17+y*31)
  pixels.extend((v,v,v,1))
image.pixels=pixels;image.filepath_raw=os.path.join(OUT,'operator-finish.png');image.file_format='PNG';image.save();image.pack()
steel=material('Graphite ceramic coating',(.105,.14,.16),.65,.46)
edge=material('Bead blasted titanium',(.34,.40,.42),.85,.4)
dark=material('Moulded grip rubber',(.025,.034,.038),.02,.83)
cyan=material('Recessed coil status',(.025,.31,.34),.35,.4,.65)
amber=material('Latch enamel',(.48,.19,.055),.45,.49)
cloth=material('Storm woven sleeve',(.065,.095,.105),0,.92)
leather=material('Glove leather',(.13,.16,.17),0,.72)
for mat in [steel,edge,leather,cloth]:
 nodes=mat.node_tree.nodes;tex=nodes.new('ShaderNodeTexImage');tex.image=image
 mat.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Roughness'])
# Author all parts in final weapon-local space; converted at export, not runtime.
def cv(p):return Vector((p[0],-p[2],p[1]))
def part(name,p,size,mat,bevel=.005):
 return box(name,cv(p),(size[0],size[2],size[1]),mat,bevel)
def tube(name,a,b,r,mat,vertices=16):
 a,b=cv(a),cv(b);o=cyl(name,(a+b)/2,r,(b-a).length,mat,vertices);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.modifiers['Machined edge radii'].width=r*.16
 return o
def anchor(name,p):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=cv(p);return o
def taper(name,sections,mat):
 verts=[]
 for z,w,lo,hi in sections:
  verts += [cv((-w,lo,z)),cv((w,lo,z)),cv((w,hi,z)),cv((-w,hi,z))]
 faces=[(3,2,1,0)]
 for j in range(len(sections)-1):
  for i in range(4):faces.append((4*j+i,4*j+(i+1)%4,4*(j+1)+(i+1)%4,4*(j+1)+i))
 faces.append(tuple(range(len(verts)-4,len(verts))));me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,mat,.006)
taper('Forged receiver', [(-.16,.052,-.06,.06),(-.27,.067,-.074,.085),(-.48,.059,-.065,.073),(-.57,.045,-.04,.047)],steel)
part('Receiver cover',(0,.079,-.34),(.105,.028,.28),edge)
part('Cell socket',(0,-.073,-.39),(.10,.045,.13),dark)
cell=part('ReloadCell',(0,-.14,-.39),(.078,.13,.10),steel,.009)
# Cell decorations joined into one owned animated mesh.
cellparts=[cell,part('Cell grip base',(0,-.212,-.39),(.09,.018,.112),dark),part('Charge indicator',(.041,-.14,-.39),(.003,.042,.027),cyan)]
bpy.ops.object.select_all(action='DESELECT')
for o in cellparts:o.select_set(True)
bpy.context.view_layer.objects.active=cell;bpy.ops.object.convert(target='MESH');bpy.ops.object.join();cell.name='ReloadCell'
part('Release latch',(.058,-.066,-.365),(.016,.022,.043),amber)
# Open trigger guard around actual grip contact, not a solid slab.
g=part('Angled pistol grip',(0,-.145,-.235),(.066,.155,.078),dark,.01);g.rotation_euler.x=-.20
for a,b in [((0,-.07,-.235),(0,-.07,-.31)),((0,-.07,-.31),(0,-.15,-.31)),((0,-.15,-.31),(0,-.17,-.255))]:tube('Trigger guard',a,b,.006,edge)
tube('Trigger',(0,-.076,-.272),(0,-.112,-.28),.005,dark)
for i in range(5):part('Grip traction',(0,-.11-i*.019,-.194),(.058,.006,.004),steel,.001)
taper('Stock spar',[(-.16,.026,-.025,.025),(-.06,.019,-.02,.02),(.035,.032,-.055,.025)],steel)
part('Shoulder pad',(0,-.025,.055),(.08,.12,.03),dark,.012)
# Nested axial barrel/insulators, mechanically connected by longitudinal rails.
tube('Acceleration tube',(0,.017,-.51),(0,.017,-.91),.027,edge,24)
for z in [-.57,-.625,-.68,-.735]:
 tube('Insulating collar',(0,.017,z-.014),(0,.017,z+.014),.044,dark,24)
 tube('Induction winding',(0,.017,z-.006),(0,.017,z+.006),.046,edge,24)
for x in [-.047,.047]:
 part('Coil spine',(x,.016,-.655),(.014,.068,.25),steel)
 part('Status inset',(x*1.17,.019,-.66),(.003,.008,.105),cyan,.001)
part('Fore-end',(0,-.052,-.575),(.093,.055,.20),dark,.01)
for z in [-.51,-.54,-.57,-.60,-.63]:part('Fore-end rib',(0,-.082,z),(.087,.008,.009),steel,.002)
tube('Muzzle crown',(0,.017,-.87),(0,.017,-.945),.045,steel,24)
tube('Bore recess',(0,.017,-.946),(0,.017,-.949),.024,dark,24)
anchor('MuzzleAnchor',(0,.017,-.95))
for z in [-.46,-.43,-.40,-.37,-.34,-.31,-.28,-.25,-.22]:part('Top rail lug',(0,.102,z),(.082,.014,.016),dark,.002)
# Same .155m sight height as old stable ADS; aperture has no glass or reticle plane.
part('Sight shoe',(0,.117,-.30),(.075,.025,.104),steel)
for x in [-.043,.043]:part('Sight wing',(x,.157,-.30),(.01,.077,.07),steel,.004)
part('Sight arch',(0,.197,-.30),(.09,.009,.07),edge,.003)
anchor('SightCenter',(0,.155,-.30))
for x in [-.064,.064]:
 for z in [-.28,-.46]:tube('Captive receiver screw',(x-.003,.035,z),(x+.003,.035,z),.008,edge,12)
 part('Receiver seam',(x,.006,-.37),(.002,.004,.13),dark,.001)
# Join static geometry only. Anchors and cell remain independently named.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if o.type=='MESH' and o!=cell:o.select_set(True)
bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='RifleBody'
rifle=list(bpy.data.objects)
# Transform rifle to original glTF mounting coordinate frame: inverse Y-pi, .5, -.3z.
for o in rifle:
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o;o.select_set(True)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.select_set(False)
  for v in o.data.vertices:v.co.x*=-2;v.co.y*=-2;v.co.z*=2
 o.location=Vector((-2*o.location.x,-2*o.location.y+.6,2*o.location.z))
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'coil-rifle-handling.glb'),export_format='GLB',use_selection=True,export_apply=True)
for o in rifle:o.hide_set(True)
# Glove panels and tapered sleeve are distinct volumes. Hand roots sit at contact.
def ellipsoid(name,p,size,mat,parent):
 o=sphere(name,cv(p),(size[0],size[2],size[1]),mat);o.parent=parent;return o
def finger(name,points,r,parent):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=4;curve.bevel_depth=r;curve.bevel_resolution=2
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for i,(v,p) in enumerate(zip(spline.bezier_points,points)):
  v.co=cv(p);v.handle_left_type='AUTO';v.handle_right_type='AUTO';v.radius=1-i*.07
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(leather);o.parent=parent
for side,center in [('Support',(-.012,-.103,-.565)),('Grip',(.018,-.16,-.225))]:
 root=anchor(side+'Hand',(0,0,0))
 # Palm lies against underside of fore-end / side of grip.
 x,y,z=center
 ellipsoid('Shaped palm',(x,y,z),(.041,.025,.052),leather,root)
 ellipsoid('Thenar thumb pad',(x-.026,y+.005,z+.025),(.022,.021,.031),leather,root)
 for i in range(4):
  zz=z-.035+i*.022
  finger('Curled finger',[(x-.03,y,zz),(x-.045,y+.025,zz),(x-.024,y+.044,zz),(x+.015,y+.04,zz)],.009,root)
  ellipsoid('Knuckle leather reinforcement',(x-.038,y+.006,zz),(.012,.012,.009),dark,root)
 finger('Opposing thumb',[(x+.022,y-.006,z+.037),(x+.047,y+.01,z+.025),(x+.035,y+.033,z+.002)],.013,root)
 o=part('Backhand panel',(x,y-.022,z),(.056,.009,.067),steel,.008);o.parent=root
 for dx in [-.025,.025]:
  o=tube('Glove stitched seam',(x+dx,y-.023,z-.027),(x+dx,y-.023,z+.025),.0015,edge,8);o.parent=root
 # Sleeve authored along local Y, runtime bridges elbow to moving wrist.
 sleeve=anchor(side+'Sleeve',(0,0,0))
 # Tapered cloth rings keep an actual elbow-to-cuff silhouette.
 # unit-length tapered cylinder converted to glTF Y axis; scale/pose handled once.
 verts=[];faces=[]
 for j in range(13):
  sy=j/12;r=.058-.019*sy+.002*math.sin(j*2.2)
  for k in range(16):
   a=k*math.tau/16;verts.append(cv((r*math.cos(a),sy,r*math.sin(a))))
 for j in range(12):
  for k in range(16):faces.append((j*16+k,j*16+(k+1)%16,(j+1)*16+(k+1)%16,(j+1)*16+k))
 me=bpy.data.meshes.new('Tailored cloth');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Woven forearm',me);bpy.context.collection.objects.link(o);o.data.materials.append(cloth);o.parent=sleeve
 for poly in me.polygons:poly.use_smooth=True
 # Cuff belongs to glove, so always follows wrist, not the forearm midpoint.
 wrist=(x,y-.035,z+.055)
 o=tube('Sealed cuff',(wrist[0],wrist[1]-.018,wrist[2]+.035),wrist,.041,dark,16);o.parent=root
 anchor(side+'Wrist',wrist).parent=root
for side in ['Support','Grip']:
 root=bpy.data.objects.get(side+'Hand');bpy.ops.object.select_all(action='DESELECT')
 for o in list(root.children):
  if o.type in ['MESH','CURVE']:o.select_set(True)
 bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name=side+'Glove'
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
 if not o.hide_get():o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'operator-hands.glb'),export_format='GLB',use_selection=True,export_apply=True)
for o in bpy.data.objects:o.hide_set(False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'operator-handling.blend'))
