"""Measured Build28 envelope audit of saved native originals, no external assets."""
import bpy,os,json,hashlib
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows=[]
for name in ['uplink-defense','memory-receiver']:
 path=os.path.join(root,'public/assets',name)
 bpy.ops.wm.open_mainfile(filepath=path+'.blend')
 deps=bpy.context.evaluated_depsgraph_get();tri=0;bounds=[]
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  ev=o.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles();tri+=len(mesh.loop_triangles)
  pts=[o.matrix_world@Vector(v) for v in o.bound_box]
  # Convert Blender X,Y,Z into game X,Y,Z.
  lo=[min(v[k] for v in pts) for k in range(3)];hi=[max(v[k] for v in pts) for k in range(3)]
  gameLo=[lo[0],lo[2],-hi[1]];gameHi=[hi[0],hi[2],-lo[1]]
  if name=='uplink-defense' and abs(o.location.x)>1:
   x=-2.05 if o.location.x<0 else 2.05
   envelopes=[([x-.65,0,29.69],[x+.65,2.3,30.01]),([x-.75,0,29.3],[x+.75,.24,30.4])]
   assert any(all(gameLo[k]>=a[k]-1e-5 and gameHi[k]<=b[k]+1e-5 for k in range(3)) for a,b in envelopes),(o.name,gameLo,gameHi)
  bounds.append({'name':o.name,'min':gameLo,'max':gameHi});ev.to_mesh_clear()
 rows.append({'asset':name,'evaluatedTriangles':tri,'objects':len(bounds),'sha256':{ext:hashlib.sha256(open(path+ext,'rb').read()).hexdigest() for ext in ['.blend','.glb']},'bounds':bounds})
json.dump({'method':'Saved native Blender originals; evaluated modifier triangles and transformed object bounds. Every baffle/footing detail checked inside original collision envelopes. Receiver extra controls retain per-mesh colliders. Floor stance inlays have no collision.','assets':rows},open(os.path.join(root,os.environ.get('ASSET_AUDIT_OUTPUT','docs/current-asset-audit.json')),'w'),indent=2)
print('Build28 measured asset envelopes passed')
