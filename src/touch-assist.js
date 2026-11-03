import * as T from 'three';
import {actorSurfaceHit,actorOccludes} from './actor-surfaces.js';
import {capacitorShot} from './capacitors.js';
export const TOUCH_ASSIST_ANGLE=5*Math.PI/180,TOUCH_ASSIST_RANGE=28;
const raycaster=new T.Raycaster();
// Shot-only correction: no camera movement, target memory, automatic fire or
// enlarged hit volumes. Every candidate must have a clear, straight mesh ray.
export function touchRifleTarget(g,forward){
 if(!g.touchMode||g.options.touchAimAssist===false||g.phase!=='playing'||g.activeWeapon!=='rifle'||g.vault)return null;
 raycaster.set(g.player,forward);
 const manual=capacitorShot(raycaster.ray,raycaster,g.world.capacitors,g.world.colliders);
 // Preserve an already aimed actor, machine surface or environmental target.
 if(manual.bank||actorOccludes(g,raycaster,manual.distance))return null;
 g.custodian.group.updateWorldMatrix(true,true);
 const machine=raycaster.intersectObject(g.custodian.model,true)[0];
 if(machine&&machine.distance<=manual.distance)return null;
 const candidates=[];
 const add=(point,key,owner,index)=>{const delta=point.clone().sub(g.player),distance=delta.length();if(distance<1||distance>TOUCH_ASSIST_RANGE||manual.distance<=distance)return;const direction=delta.divideScalar(distance),angle=Math.acos(T.MathUtils.clamp(direction.dot(forward),-1,1));if(angle<=TOUCH_ASSIST_ANGLE)candidates.push({point,direction,distance,angle,key,owner,index})};
 for(const e of g.enemies){if(e.health<=0)continue;for(const y of(e.type==='stalker'?[1.1,1.3]:[.85,1.05]))add(e.group.position.clone().add(new T.Vector3(0,y,0)),`enemy-${e.id}`,e)}
 if(g.custodian.active&&!g.custodian.dead&&g.custodian.open>0)for(let i=0;i<g.custodian.coils.length;i++){const n=g.custodian.coils[i];if(n.hp<=0)continue;const body=n.parts.find(m=>m.name===`Coil${i}`);if(body)add(body.getWorldPosition(new T.Vector3()),`coil-${i}`,null,i)}
 candidates.sort((a,b)=>a.angle-b.angle||a.distance-b.distance||a.key.localeCompare(b.key));
 // Bound extra mesh work. Obstructed candidates never grant an assisted shot.
 for(const c of candidates.slice(0,6)){
  raycaster.set(g.player,c.direction);
  const hit=c.owner?actorSurfaceHit(c.owner,raycaster):raycaster.intersectObject(g.custodian.model,true)[0];
  if(!hit||!c.owner&&(hit.object.userData.coil!==c.index||hit.object.userData.shutter))continue;
  const cover=capacitorShot(raycaster.ray,raycaster,g.world.capacitors,g.world.colliders);
  if(cover.distance<=hit.distance+.001||actorOccludes(g,raycaster,hit.distance,c.owner))continue;
  if(c.owner){const h=raycaster.intersectObject(g.custodian.model,true)[0];if(h&&h.distance<=hit.distance)continue;}
  return{direction:c.direction,point:hit.point.clone(),key:c.key,angle:c.angle};
 }
 return null;
}
