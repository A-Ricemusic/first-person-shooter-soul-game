import CUSTODIAN from './custodian-layout.json';

// The selected map landmark is static. No enemy selection, shot ray or health lookup.
export function touchRouteLandmark(g,key=g.touchUseGoal){
 if(key?.startsWith('supply-')){const p=g.pickups.find(p=>`supply-${p.id}`===key);return p?{x:p.mesh.position.x,z:p.mesh.position.z}:null;}
 if(key==='custodian')return{x:CUSTODIAN.origin[0],z:CUSTODIAN.origin[2]};
 // The uplink is defended toward the courtyard, twenty metres north of spawn.
 if(key==='extraction')return{x:g.world.playerSpawn.x,z:g.world.playerSpawn.z-20};
 const core=g.coreNodes.find(c=>`core-${c.id}`===key);
 return core?{x:core.position.x,z:core.position.z}:null;
}
// Look a short distance along the existing walking polyline, only as far as
// the same capsule sweep can see. This previews a clear bend without aiming
// through the wall on its inside. It does not change or query the route field.
export function touchRouteViewGuide(g,guide){
 if(!guide||g.options.reducedMotion)return guide;
 const s=g.touchRouteActive?g.touchRoute:g.touchApproachActive?g.touchApproach:null;
 if(!s?.path?.[s.index]||!g.playerRoute)return guide;
 let from=g.player,remaining=2.5,best=null,budget=12;
 for(let i=s.index;i<s.path.length&&remaining>1e-6&&budget>0;i++){
  const to=s.path[i],length=Math.hypot(to.x-from.x,to.z-from.z);
  if(length<1e-6){from=to;continue;}
  const distance=Math.min(remaining,length);
  // Search from the furthest point back to the near end of this segment.
  // At a tight blind corner the original immediate guide remains valid.
  for(let d=distance;d>1e-6&&budget>0;d-=.25){
   const p={x:from.x+(to.x-from.x)*d/length,z:from.z+(to.z-from.z)*d/length};
   budget--;
   if(g.playerRoute.clear(g.player,p)){best=p;break;}
  }
  remaining-=distance;
  if(distance<length)break;
  from=to;
 }
 const dx=best?best.x-g.player.x:0,dz=best?best.z-g.player.z:0,length=Math.hypot(dx,dz);
 return length>1e-6?{x:dx/length,z:dz/length,distance:length}:guide;
}
export function updateTouchRouteView(g,guide,dt){
 g.touchRouteFraming=false;
 if(!g.touchMode||!g.touchUse||!g.touchUseGoal||g.phase!=='playing'||g.touchRouteManualLook||g.aim||g.mouseDown||!g.grounded||g.vault||g.dashTime>0)return;
 if(g.touchRouteCancelled&&!g.touchRouteArrived)return;
 // A fresh hold at a completed boss approach may deliberately face the static
 // landmark without walking again. FIRE, ADS and manual look retain priority.
 const arrived=g.touchRouteArrived&&(g.touchRouteCounted||g.touchUseGoal==='custodian');
 const braked=g.touchRecoveryBraked&&g.touchRouteCounted;
 // Finish walking the clear path before framing its landmark. Turning toward
 // a receiver early can point through the wall beside its final approach.
 const landmark=(arrived||braked)?touchRouteLandmark(g):null;
 let target;
 if(landmark&&Math.hypot(landmark.x-g.player.x,landmark.z-g.player.z)>.1){
  target=Math.atan2(g.player.x-landmark.x,g.player.z-landmark.z);g.touchRouteFraming=true;
 }else if(guide){const view=touchRouteViewGuide(g,guide);target=Math.atan2(-view.x,-view.z);}
 else return;
 const delta=Math.atan2(Math.sin(target-g.yaw),Math.cos(target-g.yaw));
 // Deliberate stationary boss facing is quicker than the walking camera.
 // It still stops on release and yields to FIRE, ADS and manual view.
 // Catch up after a sharp path bend, then settle at the original gentle rate.
 // Reduced motion keeps the original walking rate. No path/speed changes.
 const catchup=g.options.reducedMotion?0:Math.min(1,Math.max(0,(Math.abs(delta)-.35)/.7));
 const turnRate=arrived&&g.touchUseGoal==='custodian'?6:1.8+1.8*catchup;
 g.yaw+=Math.max(-turnRate*dt,Math.min(turnRate*dt,delta));
 g.pitch+=Math.max(-.7*dt,Math.min(.7*dt,-g.pitch));
}
