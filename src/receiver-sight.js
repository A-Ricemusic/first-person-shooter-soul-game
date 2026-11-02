import {Raycaster,Vector3} from 'three';

const raycaster=new Raycaster(),target=new Vector3(),direction=new Vector3(),wallPoint=new Vector3();
// Probe real terminal surfaces. Its own housing is the target, rather than
// foreign cover hiding a nominal point behind its mast. Shot/movement bounds
// remain untouched, and every other solid can still conceal the terminal.
export function receiverSight(world,from,id){
 const model=world.receivers?.[id]?.model;
 if(!model)return null;
 model.updateWorldMatrix(true,true);
 for(const name of ['Cabinet','Mast','Beacon']){
  const node=model.getObjectByName(name);if(!node)continue;
  node.getWorldPosition(target);direction.copy(target).sub(from);
  const length=direction.length();if(length<1e-6)continue;
  raycaster.set(from,direction.divideScalar(length));
  const hit=raycaster.intersectObject(model,true).find(h=>h.distance<=length+1e-5);
  if(!hit)continue;
  const blocked=world.colliders.some(box=>{
   if(box.receiverId===id)return false;
   if(box.containsPoint(from))return true;
   const point=raycaster.ray.intersectBox(box,wallPoint);
   return point&&point.distanceTo(from)<=hit.distance+1e-5;
  });
  if(!blocked)return hit.point.clone();
 }
 return null;
}
