"""Original SOULFALL seamless PBR materials, authored and baked in Blender.

Run: blender --background --python tools/build_materials.py
No third-party source images. Bake passes: diffuse/albedo via emission,
roughness via emission, and true tangent-space Cycles NORMAL baking.
The toroidal 4-D noise coordinate mapping makes all noise layers tile seamlessly.
"""
import bpy, math, os, json, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'assets', 'textures')
os.makedirs(OUT, exist_ok=True)
RES = int(os.environ.get('SOULFALL_TEXTURE_RES', '1024'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8
scene.render.bake.use_clear = True
scene.render.bake.margin = 4
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'

def new_material(name, wall=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    def node(kind, label, x=0,y=0):
        n=nt.nodes.new(kind); n.label=label; n.location=(x,y);return n
    def link(a, b): nt.links.new(a,b)
    def math_node(op, a, b=None, label=''):
        n=node('ShaderNodeMath',label);n.operation=op
        if isinstance(a,(int,float)):n.inputs[0].default_value=a
        else:link(a,n.inputs[0])
        if b is not None:
            if isinstance(b,(int,float)):n.inputs[1].default_value=b
            else:link(b,n.inputs[1])
        return n.outputs[0]
    def ramp(inp, points, label):
        n=node('ShaderNodeValToRGB',label)
        cr=n.color_ramp
        cr.elements.remove(cr.elements[1])
        for i,(p,c) in enumerate(points):
            e=cr.elements[0] if i==0 else cr.elements.new(p)
            e.position=p;e.color=(*c,1)
        link(inp,n.inputs[0]);return n.outputs[0]
    def mix(factor,a,b,label):
        n=node('ShaderNodeMixRGB',label)
        if isinstance(factor,(float,int)):n.inputs[0].default_value=factor
        else:link(factor,n.inputs[0])
        if isinstance(a,tuple):n.inputs[1].default_value=(*a,1)
        else:link(a,n.inputs[1])
        if isinstance(b,tuple):n.inputs[2].default_value=(*b,1)
        else:link(b,n.inputs[2])
        return n.outputs[0]

    tex=node('ShaderNodeTexCoord','Explicit UV mapping',-1500,100)
    sep=node('ShaderNodeSeparateXYZ','U / V',-1300,100);link(tex.outputs['UV'],sep.inputs[0])
    u=math_node('MULTIPLY',sep.outputs['X'],math.tau)
    v=math_node('MULTIPLY',sep.outputs['Y'],math.tau)
    cx=math_node('COSINE',u);sx=math_node('SINE',u)
    cy=math_node('COSINE',v);sy=math_node('SINE',v)
    combine=node('ShaderNodeCombineXYZ','Toroidal coordinates: cos U, sin U, cos V',-1000,100)
    for a,b in zip([cx,sx,cy],combine.inputs):link(a,b)
    coords=combine.outputs[0]
    def noise(scale, detail, label, rough=.65):
        n=node('ShaderNodeTexNoise',label);n.noise_dimensions='4D'
        link(coords,n.inputs['Vector']);link(sy,n.inputs['W'])
        n.inputs['Scale'].default_value=scale;n.inputs['Detail'].default_value=detail;n.inputs['Roughness'].default_value=rough
        return n.outputs['Fac']

    broad=noise(.58,3.0,'Broad capillary damp patches')
    mottled=noise(2.8,4.5,'Mineral staining / weathered cement')
    aggregate=noise(48,2,'Fine concrete aggregate',.8)
    pores=noise(112,1,'Microscopic pitting',.74)
    # Distinct broad patches instead of noisy TV-static color across the surface.
    wet=ramp(broad,[(.35,(0,0,0)),(.48,(.12,.12,.12)),(.62,(.75,.75,.75)),(.71,(1,1,1))],'Damp-area mask')
    if wall:
        dry=ramp(mottled,[(.20,(.20,.215,.205)),(.43,(.33,.34,.315)),(.68,(.43,.44,.40)),(.86,(.30,.33,.32))],'Weathered wall cement albedo')
        damp=(.095,.125,.118)
    else:
        dry=ramp(mottled,[(.20,(.125,.14,.145)),(.43,(.22,.235,.235)),(.7,(.32,.325,.30)),(.88,(.20,.22,.215))],'Aggregate slab albedo')
        damp=(.055,.073,.077)
    color=mix(wet,dry,damp,'Darken absorbed rainwater')
    grain=ramp(aggregate,[(.30,(.30,.31,.30)),(.43,(.70,.70,.67)),(.60,(.89,.89,.85)),(.75,(.95,.95,.92))],'Aggregate tonal variance')
    multiply=node('ShaderNodeMixRGB','Subtle aggregate in color');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=.23
    link(color,multiply.inputs[1]);link(grain,multiply.inputs[2]);color=multiply.outputs[0]

    # Fine fractured channels: sparse interrupted Voronoi edges, never a regular grid.
    vor=node('ShaderNodeTexVoronoi','Weathered hairline fissures');vor.feature='DISTANCE_TO_EDGE'
    link(coords,vor.inputs['Vector']);vor.inputs['Scale'].default_value=3.6
    fissure=ramp(vor.outputs['Distance'],[(0,(1,1,1)),(.003,(.9,.9,.9)),(.015,(0,0,0))],'Hairline edge width')
    fracture_break=ramp(noise(1.7,2,'Fissure continuity breakup'),[(.45,(0,0,0)),(.63,(1,1,1))],'Keep fractures sparse')
    fissure=math_node('MULTIPLY',fissure,fracture_break)
    fissure=math_node('MULTIPLY',fissure,.46 if wall else .65)
    color=mix(fissure,color,(.025,.034,.035),'Fine dark weathered fissures')
    rough=mix(wet,(.82,.82,.82) if wall else (.74,.74,.74),(.43,.43,.43) if wall else (.23,.23,.23),'Variable wet roughness')
    rough=mix(.16,rough,aggregate,'Micro roughness variation')

    bs=node('ShaderNodeBsdfPrincipled','Physically plausible dielectric concrete',1100,100)
    link(color,bs.inputs['Base Color']);link(rough,bs.inputs['Roughness'])
    bs.inputs['Metallic'].default_value=0
    bump1=node('ShaderNodeBump','Small gravel / pitting',800,-100)
    bump1.inputs['Strength'].default_value=.36;bump1.inputs['Distance'].default_value=.009 if wall else .012
    link(aggregate,bump1.inputs['Height'])
    height=math_node('SUBTRACT',mottled,fissure)
    bump2=node('ShaderNodeBump','Subtle cement relief and fracture depression',1000,-200)
    bump2.inputs['Strength'].default_value=.3;bump2.inputs['Distance'].default_value=.012 if wall else .018
    link(height,bump2.inputs['Height']);link(bump1.outputs['Normal'],bump2.inputs['Normal'])
    bump3=node('ShaderNodeBump','Micropores',1100,-350)
    bump3.inputs['Strength'].default_value=.15;bump3.inputs['Distance'].default_value=.002
    link(pores,bump3.inputs['Height']);link(bump2.outputs['Normal'],bump3.inputs['Normal']);link(bump3.outputs['Normal'],bs.inputs['Normal'])
    output=node('ShaderNodeOutputMaterial','Surface',1450,100);link(bs.outputs[0],output.inputs['Surface'])
    emission=node('ShaderNodeEmission','Unlit data baking only',1250,-450)
    target=node('ShaderNodeTexImage','Active baked texture destination',1450,-300)
    return mat, color, rough, bs, output, emission, target

manifest={'authoring':'Original Blender shader graphs, Cycles CPU baking; no external textures.','tool':bpy.app.version_string,'resolution':[RES,RES],'seamless':True,'materials':[]}
started=time.time()
for name,wall,size in [('floor-concrete',False,4.0),('wall-concrete',True,3.0)]:
    bpy.ops.mesh.primitive_plane_add(size=size)
    plane=bpy.context.object;plane.name=name+' / 1 UV tile'
    mat,color,rough,bs,output,emission,target=new_material(name,wall)
    plane.data.materials.append(mat)
    nt=mat.node_tree
    records=[]
    for suffix,source,space in [('color',color,'sRGB'),('roughness',rough,'Non-Color'),('normal',None,'Non-Color')]:
        image=bpy.data.images.new(name+'-'+suffix,width=RES,height=RES,alpha=False)
        image.colorspace_settings.name=space
        image.filepath_raw=os.path.join(OUT,name+'-'+suffix+'.png');image.file_format='PNG'
        target.image=image;nt.nodes.active=target;target.select=True
        if suffix=='normal':
            nt.links.new(bs.outputs[0],output.inputs['Surface'])
            scene.render.bake.normal_space='TANGENT'
            bpy.ops.object.bake(type='NORMAL')
        else:
            nt.links.new(source,emission.inputs['Color']);nt.links.new(emission.outputs[0],output.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT')
        image.save();image.pack()
        records.append({'file':name+'-'+suffix+'.png','colorSpace':space,'pass':'TANGENT_NORMAL' if suffix=='normal' else 'EMIT_'+suffix.upper(),'bytes':os.path.getsize(image.filepath_raw)})
        print('BAKED',name,suffix,os.path.getsize(image.filepath_raw),'bytes',flush=True)
    nt.links.new(bs.outputs[0],output.inputs['Surface'])
    plane.location.x=6 if wall else 0
    manifest['materials'].append({'name':name,'tileMeters':size,'normalConvention':'OpenGL +Y tangent space','recommendedNormalScale':.5 if wall else .45,'maps':records})
manifest['seconds']=round(time.time()-started,2)
with open(os.path.join(OUT,'materials-manifest.json'),'w')as f:json.dump(manifest,f,indent=2);f.write('\n')
scene.camera=None
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'public','assets','station-materials.blend'))
print('SOULFALL_MATERIAL_BAKE_COMPLETE',json.dumps(manifest),flush=True)
