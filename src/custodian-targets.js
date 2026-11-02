import {actorOccludes} from './actor-surfaces.js';
import * as T from 'three';

const raycaster=new T.Raycaster();
const ray=new T.Ray(),hit=new T.Vector3();

// A teaching cue is a physical shot opportunity, not a through-wall tracker.
// Aim through the winding centre, then anchor to the FIRST rendered surface.
// This naturally selects a lowered shutter or the exposed copper behind it.
export function custodianTargets(g){
 const c=g.custodian;
 if(g.phase!=='playing'||!c.active||c.dead)return [];
 c.group.updateWorldMatrix(true,true);
 const forward=g.camera.getWorldDirection(new T.Vector3()),targets=[];
 for(let i=0;i<c.coils.length;i++){
  const n=c.coils[i];if(n.hp<=0)continue;
  const body=n.parts.find(m=>m.name===`Coil${i}`);if(!body)continue;
  const point=body.getWorldPosition(new T.Vector3()),delta=point.clone().sub(g.player),distance=delta.length();
  if(distance>32||delta.dot(forward)<=0)continue;
  const p=point.clone().project(g.camera);if(Math.abs(p.x)>.86||Math.abs(p.y)>.68)continue;
  raycaster.set(g.player,delta.normalize());
  const surface=raycaster.intersectObject(c.model,true)[0];
  if(!surface||surface.object.userData.coil!==i)continue;
  ray.set(g.player,delta);
  if(g.world.colliders.some(box=>!box.custodian&&(box.containsPoint(g.player)||(ray.intersectBox(box,hit)&&hit.distanceTo(g.player)<=surface.distance))))continue;
  if(actorOccludes(g,raycaster,surface.distance))continue;
  targets.push({index:i,point:surface.point,exposed:c.open>0&&!surface.object.userData.shutter,score:p.x*p.x+p.y*p.y});
 }
 return targets;
}

export function focusedCustodianTarget(g){
 const targets=custodianTargets(g).sort((a,b)=>a.score-b.score),previous=targets.find(t=>t.index===g.custodian.cueIndex);
 const best=previous&&previous.score<=(targets[0]?.score??0)+.025?previous:targets[0];
 g.custodian.cueIndex=best?.index??null;
 return best;
}
