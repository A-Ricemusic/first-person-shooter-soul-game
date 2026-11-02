"""Original deterministic UV finish; Blender generated maps, no external imagery."""
import bpy, numpy as np, os

def finish55(objects, label):
 objects=[o for o in objects if o.type=='MESH']
 used=list(dict.fromkeys(m for o in objects for m in o.data.materials if m))
 # Separate material strips in one 1024-square atlas. Physical material values
 # remain bounded; microstructure is directional and material-specific.
 N=1024;y,x=np.mgrid[0:N,0:N];bands=max(1,len(used))
 color=np.ones((N,N,4),dtype=np.float32);rough=color.copy();normal=color.copy();normal[:,:,:3]=(.5,.5,1)
 for i,m in enumerate(used):
  mask=(y>=i*N/bands)&(y<(i+1)*N/bands);bs=m.node_tree.nodes.get('Principled BSDF');rgb=np.array(bs.inputs['Base Color'].default_value[:3]);name=m.name.lower()
  woven='cloth' in name or 'sleeve' in name;leather='leather' in name or 'glove' in name;rubber='rubber' in name or name=='dark'
  grain=np.sin(x*(1.2 if woven else .21))*np.sin(y*(1.2 if woven else .43));brush=np.sin(y*2.1)*.018
  value=.92+(grain*.045 if woven or leather else brush)
  # Linear authored base colors converted to sRGB for glTF color texture.
  linear=np.clip(rgb[None,None,:]*value[:,:,None],0,1);srgb=np.where(linear<=.0031308,linear*12.92,1.055*linear**(1/2.4)-.055)
  color[mask,:3]=srgb[mask];r=.9 if woven else .73 if leather else .82 if rubber else .38 if bs.inputs['Metallic'].default_value>.8 else .49
  rough[mask,:3]=np.repeat(np.clip(r+grain*.025,.2,.96)[:,:,None],3,axis=2)[mask]
  strength=.035 if woven else .018 if leather else .006
  normal[mask,0]=(.5+strength*np.cos(x*1.2))[mask];normal[mask,1]=(.5+strength*np.cos(y*1.2))[mask]
 images=[]
 for suffix,data,space in [('basecolor',color,'sRGB'),('roughness',rough,'Non-Color'),('normal',normal,'Non-Color')]:
  im=bpy.data.images.new(label+'-'+suffix,width=N,height=N);im.colorspace_settings.name=space;im.pixels.foreach_set(data.ravel());im.filepath_raw=os.path.join(OUT,label+'-'+suffix+'.png');im.file_format='PNG';im.save();im.pack();images.append(im)
 for i,m in enumerate(used):
  nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
  for input in ['Base Color','Roughness','Normal']:
   for link in list(bs.inputs[input].links):links.remove(link)
  for im,input in zip(images,['Base Color','Roughness','Normal']):
   t=nodes.new('ShaderNodeTexImage');t.image=im
   if input=='Normal':
    n=nodes.new('ShaderNodeNormalMap');links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bs.inputs[input])
   else:links.new(t.outputs['Color'],bs.inputs[input])
 for o in objects:
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
  for p in o.data.polygons:
   mat=o.data.materials[p.material_index];i=used.index(mat)
   for li in p.loop_indices:
    uv=o.data.uv_layers.active.data[li].uv;uv.y=(i+.04+uv.y*.92)/bands
 return {'atlas':1024,'materials':len(used),'source':'Original deterministic Blender-authored UV maps'}
