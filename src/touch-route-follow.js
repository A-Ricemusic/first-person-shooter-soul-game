import {feetY,profileOf} from './movement.js';
import {recoveryDistance} from './mission.js';
import {serviceStatus} from './suit-service.js';

export function clearTouchRoute(g,cancel=false){
 g.touchRoute=null;g.touchRouteActive=false;g.touchRouteStatus=cancel&&g.touchUse?'RELEASE USE TO RESUME':'';
 if(cancel&&g.touchUse)g.touchRouteCancelled=true;
 else{g.touchRouteCancelled=false;g.touchRouteCounted=false;g.touchUseGoal=null;g.touchRouteManualLook=false;}
}

// Explicit held-USE navigation uses only the already-visible static map field.
// Default view follows walking direction with bounded turning; any scene
// contact grants free look for this hold. No enemies, teleport or protection.
export function touchRouteStep(g,manual,dt,approaching=false){
 g.touchRouteActive=false;
 if(!g.touchMode||!g.touchUse||g.phase!=='playing'){clearTouchRoute(g);return null;}
 if(g.touchRouteCancelled)return null;
 if(!g.grounded||g.vault||g.dashTime>0||Math.abs(feetY(g.player,profileOf(g)))>.025){clearTouchRoute(g,true);return null;}
 if(manual.lengthSq()>.000625||g.mouseDown||g.aim){clearTouchRoute(g,true);return null;}
 if(g.touchRecoveryBraked||approaching){g.touchRoute=null;return null;}
 // A nearby receiver keeps the existing precise held approach. Once a far
 // route is requested, passing a different receiver cannot redirect the hold.
 if(!g.touchRoute&&g.coreNodes.some(c=>!c.collected&&recoveryDistance(g.player,c.position,profileOf(g))<8))return null;
 const service=serviceStatus(g);
 if(service.valid&&service.powered&&!service.spent&&!service.full){clearTouchRoute(g,true);return null;}
 if(!g.touchRoute){
  g.updateRouteGoal();const key=g.routeGoal;g.touchUseGoal=key;
  const path=g.playerRoute.path(g.player,key,g.grounded,profileOf(g));
  const length=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);
  const valid=path.length>1&&path.length<=256&&length<=240&&path.slice(1).every((p,i)=>g.playerRoute.clear(path[i],p));
  g.touchRoute={key,path:valid?path:[],index:1,last:{x:g.player.x,z:g.player.z},expected:0,stall:0};
 }
 const s=g.touchRoute;
 if(s.key!==g.routeGoal){clearTouchRoute(g,true);g.touchRouteStatus='DESTINATION CHANGED · RELEASE USE';return null;}
 if(!s.path.length){g.touchRouteCancelled=true;g.touchRouteStatus='ROUTE BLOCKED · RELEASE USE';return null;}
 if(s.key.startsWith('core-')){
  const core=g.coreNodes.find(c=>`core-${c.id}`===s.key);
  if(!core||core.collected){g.touchRouteCancelled=true;g.touchRouteStatus='ARRIVED · RELEASE USE';return null;}
  // Hand over to the existing near approach on the following frame. Keep the
  // locked goal until that approach has accepted the intended receiver.
  if(recoveryDistance(g.player,core.position,profileOf(g))<8)return null;
 }
 if(s.expected>0){const progress=Math.hypot(g.player.x-s.last.x,g.player.z-s.last.z);s.stall=progress<s.expected*.2?s.stall+dt:0;if(s.stall>.35){g.touchRouteCancelled=true;g.touchRouteStatus='ROUTE BLOCKED · RELEASE USE';return null;}}
 while(s.index<s.path.length&&Math.hypot(s.path[s.index].x-g.player.x,s.path[s.index].z-g.player.z)<.04)s.index++;
 const next=s.path[s.index];
 if(!next){g.touchRouteCancelled=true;g.touchRouteStatus='ARRIVED · RELEASE USE';return null;}
 const dx=next.x-g.player.x,dz=next.z-g.player.z,distance=Math.hypot(dx,dz);
 s.last={x:g.player.x,z:g.player.z};s.expected=Math.min(distance,Math.min(profileOf(g).eyeHeight<1.7?3:5.5,5.5)*dt);
 g.touchRouteActive=true;g.touchRouteStatus='FOLLOWING · RELEASE USE TO STOP';
 return{x:dx/distance,z:dz/distance,distance};
}
