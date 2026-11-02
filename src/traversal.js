import {canPlayerOccupy,EYE_HEIGHT,BODY_HEIGHT,PLAYER_RADIUS} from './movement.js';
export const VAULT_SECONDS=.62;
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export function vaultPose(plan,t){
 t=Math.max(0,Math.min(1,t));
 if(t<.28)return lerp(plan.start,plan.highStart,smooth(t/.28));
 if(t<.76)return lerp(plan.highStart,plan.highEnd,smooth((t-.28)/.48));
 return lerp(plan.highEnd,plan.end,smooth((t-.76)/.24));
}
// A conservative swept cylinder: samples are <=1 cm apart and radius is
// expanded 2 cm, with vertical clearance expanded by lifting the high segment.
export function clearVaultSegment(world,a,b){
 const radius=Math.hypot(b.x-a.x,b.z-a.z)<1e-9?PLAYER_RADIUS:PLAYER_RADIUS+.02;
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.01));
 for(let i=0;i<=n;i++){const p=lerp(a,b,i/n);if(!canPlayerOccupy(world,p.x,p.y,p.z,radius))return false;}
 return true;
}
export function planVault(body,world,direction){
 const p=body.player,feet=p.y-EYE_HEIGHT,len=Math.hypot(direction.x,direction.z);
 // Only a supported floor start. Raised/unsupported poses keep ordinary jump.
 if(!body.grounded||Math.abs(feet)>1e-6||len<.1||!canPlayerOccupy(world,p.x,p.y,p.z,PLAYER_RADIUS))return null;
 const dx=direction.x/len,dz=direction.z/len;
 let first=null;
 for(let d=.03;d<=.95;d+=.03){if(!canPlayerOccupy(world,p.x+dx*d,p.y,p.z+dz*d,PLAYER_RADIUS+.02)){first=d;break;}}
 if(first===null)return null;
 let endDistance=null,top=0;
 for(let d=first;d<=2.85;d+=.025){
  const x=p.x+dx*d,z=p.z+dz*d;
  for(const b of world.colliders){const nx=Math.max(b.min.x,Math.min(x,b.max.x)),nz=Math.max(b.min.z,Math.min(z,b.max.z));
   if(Math.hypot(x-nx,z-nz)<PLAYER_RADIUS+.04&&b.max.y>0&&b.min.y<BODY_HEIGHT){top=Math.max(top,b.max.y);}}
  if(top>1.45)return null;
  if(canPlayerOccupy(world,x,p.y,z,PLAYER_RADIUS+.06)){endDistance=d+.06;break;}
 }
 if(endDistance===null||top<.45||endDistance-first>2.34)return null;
 const end={x:p.x+dx*endDistance,y:p.y,z:p.z+dz*endDistance};
 const highStart={x:p.x,y:EYE_HEIGHT+top+.04,z:p.z},highEnd={...end,y:highStart.y};
 const plan={start:{x:p.x,y:p.y,z:p.z},highStart,highEnd,end,top};
 if(!clearVaultSegment(world,plan.start,highStart)||!clearVaultSegment(world,highStart,highEnd)||!clearVaultSegment(world,highEnd,end))return null;
 return plan;
}
export function startVault(body,world,direction){
 if(body.vault||body.dashTime>0)return false;
 const plan=planVault(body,world,direction);if(!plan)return false;
 body.vault={plan,elapsed:0};body.grounded=false;body.velocityY=0;return true;
}
export function advanceVault(body,world,dt){
 const state=body.vault;if(!state)return false;
 const end=Math.min(VAULT_SECONDS,state.elapsed+Math.max(0,dt));
 while(state.elapsed<end){
  const elapsed=Math.min(end,state.elapsed+1/240),p=vaultPose(state.plan,elapsed/VAULT_SECONDS);
  if(!clearVaultSegment(world,body.player,p)){body.vault=null;body.grounded=false;body.velocityY=0;return true;}
  Object.assign(body.player,p);state.elapsed=elapsed;
 }
 if(state.elapsed>=VAULT_SECONDS){body.vault=null;body.grounded=true;body.velocityY=0;}
 return true;
}
