import {feetY,profileOf} from './movement.js';
import {RECOVERY_RADIUS,recoveryDistance} from './mission.js';

export const TOUCH_APPROACH_RANGE=8;
export const TOUCH_APPROACH_PATH_LIMIT=12;

// A held USE contact requests a nearby approach. Manual movement and combat
// override a near-only hold; an explicit long route retains its combat handoff.
// Release clears it. Dash/jump cancel it until a new USE contact.
export function clearTouchApproach(g,cancel=false){
 g.touchApproach=null;g.touchApproachActive=false;g.touchApproachStatus='';
 if(cancel&&g.touchUse)g.touchApproachCancelled=true;
 else{g.touchApproachCancelled=false;g.touchApproachCounted=false;}
}

export function touchApproachStep(g,manual,dt){
 g.touchApproachActive=false;g.touchApproachStatus='';
 const profile=profileOf(g);
 if((g.touchUseGoal||g.routeGoal)?.startsWith('supply-')||!g.touchMode||!g.touchUse||g.phase!=='playing'||g.touchRouteCancelled||g.touchApproachCancelled||g.touchRecoveryBraked){g.touchApproach=null;return null;}
 if(!g.grounded||g.vault||g.dashTime>0||Math.abs(feetY(g.player,profile))>.025){clearTouchApproach(g,true);return null;}
 const combatRoute=!!g.touchUseGoal&&g.touchRouteCounted&&!g.touchRouteCancelled;
 if(manual.lengthSq()>.000625||((g.mouseDown||g.aim)&&!combatRoute)){g.touchApproach=null;return null;}
 const near=g.coreNodes.filter(c=>!c.collected).map(c=>({core:c,d:recoveryDistance(g.player,c.position,profile)})).filter(c=>c.d<TOUCH_APPROACH_RANGE&&(!g.touchUseGoal||g.touchUseGoal===`core-${c.core.id}`)).sort((a,b)=>a.d-b.d)[0];
 if(!near||near.d<RECOVERY_RADIUS){g.touchApproach=null;return null;}
 let s=g.touchApproach;
 if(!s||s.id!==near.core.id){
  const path=g.playerRoute.path(g.player,`core-${near.core.id}`,g.grounded,profile);
  const length=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);
  const valid=path.length>1&&length<=TOUCH_APPROACH_PATH_LIMIT&&path.slice(1).every((p,i)=>g.playerRoute.clear(path[i],p));
  s=g.touchApproach={id:near.core.id,path:valid?path:[],index:1,length,last:{x:g.player.x,z:g.player.z},expected:0,stall:0};
 }
 if(!s.path.length){g.touchApproachStatus='NO SHORT ROUTE · USE MAP';return null;}
 if(s.expected>0){
  const progress=Math.hypot(g.player.x-s.last.x,g.player.z-s.last.z);
  s.stall=progress<s.expected*.2?s.stall+dt:0;
  if(s.stall>.35){s.path=[];g.touchApproachStatus='ROUTE BLOCKED · USE MAP';return null;}
 }
 while(s.index<s.path.length&&Math.hypot(s.path[s.index].x-g.player.x,s.path[s.index].z-g.player.z)<.04)s.index++;
 const next=s.path[s.index];
 if(!next){s.path=[];g.touchApproachStatus='NO SHORT ROUTE · USE MAP';return null;}
 const dx=next.x-g.player.x,dz=next.z-g.player.z,distance=Math.hypot(dx,dz);
 s.last={x:g.player.x,z:g.player.z};s.expected=Math.min(distance,3.1*dt);
 g.touchApproachActive=true;g.touchApproachStatus='RELEASE USE TO STOP · MOVE OVERRIDES';
 return{x:dx/distance,z:dz/distance,distance};
}
