import * as T from 'three';

// Charge rays and hidden prototype bodies are presentation, not solid actors.
// Authored combat rigs already own their physical surfaces. The legacy fallback
// retains visible meshes only, excluding Line/Sprite helpers and hidden parts.
const fallbackMeshes=[];
export function actorSurfaceHit(enemy,raycaster){
 enemy.group.updateWorldMatrix(true,true);
 const model=(enemy.wardenRig||enemy.droneRig)?.model;
 if(model)return raycaster.intersectObject(model,true)[0];
 fallbackMeshes.length=0;
 enemy.group.traverseVisible(o=>{if(o.isMesh)fallbackMeshes.push(o);});
 const hit=raycaster.intersectObjects(fallbackMeshes,false)[0];
 fallbackMeshes.length=0; // Do not retain removed fallback actors between runs.
 return hit;
}

// Match the active weapon's centre-ray rules, including the rifle's existing
// fixed optic sphere and primitive-body fallback. Existing rifle precision and damage rules are retained.
export function actorOccludes(g,raycaster,distance){
 const point=new T.Vector3();
 for(const e of g.enemies){
  const h=actorSurfaceHit(e,raycaster);if(h&&h.distance<=distance)return true;
  if(g.activeWeapon==='breacher')continue;
  const optic=raycaster.ray.intersectSphere(new T.Sphere(g.enemyOpticPosition(e),.24),point);
  if(optic&&optic.distanceTo(g.player)<=distance)return true;
  if(!e.wardenRig&&!e.droneRig){
   const body=raycaster.ray.intersectSphere(new T.Sphere(e.group.position.clone().add(new T.Vector3(0,g.sentinelAsset?1.3:1.04,0)),g.sentinelAsset ? .68 : .53),point);
   if(body&&body.distanceTo(g.player)<=distance)return true;
  }
 }
 return false;
}
