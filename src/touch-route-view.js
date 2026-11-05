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
 }else if(guide)target=Math.atan2(-guide.x,-guide.z);
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
