"""Original SOULFALL material-only refinishing of existing Blender-authored enemies.
Run: /Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build104-enemy-paint.py
Keeps old sources/exports. No geometry, transforms, optics, emission, lights or animation edits.
"""
import bpy,json,hashlib,base64
from pathlib import Path
R=Path(__file__).resolve().parents[1];A=R/'public/assets';bpy.context.preferences.filepaths.save_version=0
palette={
 'sentinel':{'Service ivory enamel':{'color':[.78,.84,.82],'metallic':.12,'roughness':.60}},
 'warden':{'Warden_Armor':{'color':[.74,.63,.40],'metallic':.22,'roughness':.56}},
 'interceptor':{'Ceramic graphite.001':{'color':[.62,.34,.09],'metallic':.20,'roughness':.58},'Service enamel.001':{'color':[.78,.72,.50],'metallic':.18,'roughness':.58}}
}
reports=[]
for kind,old in [('sentinel','build72-implementation-sentinel'),('warden','induction-warden'),('interceptor','interceptor')]:
 source=A/(old+'.blend');before={ext:hashlib.sha256((A/(old+'.'+ext)).read_bytes()).hexdigest()for ext in ['blend','glb']}
 bpy.ops.wm.open_mainfile(filepath=str(source));bpy.context.preferences.filepaths.save_version=0;changes=[]
 for name,values in palette[kind].items():
  m=bpy.data.materials.get(name);assert m is not None,name;p=m.node_tree.nodes.get('Principled BSDF');assert p is not None
  prior={'color':list(p.inputs['Base Color'].default_value),'metallic':p.inputs['Metallic'].default_value,'roughness':p.inputs['Roughness'].default_value,'emissionColor':list(p.inputs['Emission Color'].default_value),'emissionStrength':p.inputs['Emission Strength'].default_value}
  m.diffuse_color=(*values['color'],1);p.inputs['Base Color'].default_value=(*values['color'],1);p.inputs['Metallic'].default_value=values['metallic'];p.inputs['Roughness'].default_value=values['roughness'];changes.append({'material':name,'before':prior,'after':values})
 stem='build104-'+kind;bpy.ops.wm.save_as_mainfile(filepath=str(A/(stem+'.blend')));bpy.ops.export_scene.gltf(filepath=str(A/(stem+'.glb')),export_format='GLB',export_yup=True,export_extras=kind=='sentinel')
 assert all(hashlib.sha256((A/(old+'.'+ext)).read_bytes()).hexdigest()==h for ext,h in before.items())
 if kind=='sentinel':(R/'src/build104-sentinel-fallback.js').write_text('export default '+json.dumps(base64.b64encode((A/(stem+'.glb')).read_bytes()).decode())+';\n')
 reports.append({'kind':kind,'source':str(source.relative_to(R)),'baselineSHA256':before,'newSource':str((A/(stem+'.blend')).relative_to(R)),'newAsset':str((A/(stem+'.glb')).relative_to(R)),'sha256':{ext:hashlib.sha256((A/(stem+'.'+ext)).read_bytes()).hexdigest()for ext in ['blend','glb']},'changes':changes})
(A/'build104-enemy-paint-palette.json').write_text(json.dumps(palette,indent=2)+'\n')
(R/'src/build104-enemy-paint.js').write_text('export default '+json.dumps(palette,indent=2)+';\n')
report={'authoring':'Original material-only Blender refinishing of existing original SOULFALL assets.','generator':'tools/build104-enemy-paint.py','original':True,'externalAssets':False,'newGeometry':False,'emissionChanged':False,'lightsChanged':False,'paletteSpace':'Linear RGB, Principled BSDF base color. Lower metalness models enamel paint rather than bare metal.','assets':reports,'limits':['Material values alone do not certify on-screen contrast, human target acquisition or performance.','Exact geometry/node equivalence requires the separate GLB audit.']}
(A/'build104-enemy-paint-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
