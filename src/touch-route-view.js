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
function nearEnd(g,state){
 if(!state?.path?.[state.index])return false;
 const path=state.path;let distance=Math.hypot(path[state.index].x-g.player.x,path[state.index].z-g.player.z);
 for(let i=state.index+1;i<path.length&&distance<=3;i++)distance+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
 return distance<=3;
}
export function updateTouchRouteView(g,guide,dt){
 g.touchRouteFraming=false;
 if(!g.touchMode||!g.touchUse||!g.touchUseGoal||g.phase!=='playing'||g.touchRouteManualLook||g.aim||g.mouseDown||!g.grounded||g.vault||g.dashTime>0)return;
 if(g.touchRouteCancelled&&!g.touchRouteArrived)return;
 // A fresh hold at a completed boss approach may deliberately face the static
 // landmark without walking again. FIRE, ADS and manual look retain priority.
 const arrived=g.touchRouteArrived&&(g.touchRouteCounted||g.touchUseGoal==='custodian');
 const braked=g.touchRecoveryBraked&&g.touchRouteCounted;
 const state=g.touchRouteActive?g.touchRoute:g.touchApproachActive?g.touchApproach:null;
 const landmark=(arrived||braked||nearEnd(g,state))?touchRouteLandmark(g):null;
 let target;
 if(landmark&&Math.hypot(landmark.x-g.player.x,landmark.z-g.player.z)>.1){
  target=Math.atan2(g.player.x-landmark.x,g.player.z-landmark.z);g.touchRouteFraming=true;
 }else if(guide)target=Math.atan2(-guide.x,-guide.z);
 else return;
 const delta=Math.atan2(Math.sin(target-g.yaw),Math.cos(target-g.yaw));
 g.yaw+=Math.max(-1.8*dt,Math.min(1.8*dt,delta));
 g.pitch+=Math.max(-.7*dt,Math.min(.7*dt,-g.pitch));
}
