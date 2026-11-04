import {profileOf} from './movement.js';
export const supplyKey=p=>`supply-${p.id}`;
export const liveSupplies=g=>g.pickups.filter(p=>Number.isInteger(p.id)&&p.life>0);
export const selectedSupply=g=>liveSupplies(g).find(p=>supplyKey(p)===g.routeGoal);
export function clearSupplyFields(g){for(const key of g.playerRoute?.fields.keys()||[])if(key.startsWith('supply-'))g.playerRoute.fields.delete(key);}
export function selectSupplyRoute(g){
 if(!g.touchMode||g.phase!=='planning')return false;
 clearSupplyFields(g);let best=null;
 for(const p of liveSupplies(g).toSorted((a,b)=>a.mesh.position.distanceTo(g.player)-b.mesh.position.distanceTo(g.player))){
  const key=supplyKey(p),point=p.mesh.position;
  g.playerRoute.field(key,v=>Math.hypot(v.x-point.x,v.z-point.z)<=2.5&&g.hasLineOfSight(point,g.player.clone().set(v.x,1.2,v.z),0)&&g.hasLineOfSight(point,g.player.clone().set(v.x,.55,v.z),0));
  const path=g.playerRoute.path(g.player,key,g.grounded&&!g.vault,profileOf(g));
  const length=path.slice(1).reduce((sum,v,i)=>sum+Math.hypot(v.x-path[i].x,v.z-path[i].z),0);
  // Allow collection time and the slower crouched walking speed. Expiry still runs in play.
  if(path.length>1&&path.length<=256&&path.slice(1).every((v,i)=>g.playerRoute.clear(path[i],v))&&length<=240&&length/3+1<p.life&&(!best||length<best.length))best={key,path,length};
 }
 for(const key of [...g.playerRoute.fields.keys()])if(key.startsWith('supply-')&&key!==best?.key)g.playerRoute.fields.delete(key);
 if(!best){g.supplyRouteStatus=liveSupplies(g).length?'No reachable supply before expiry':'No supplies on the ground';g.routeGoal=null;g.routeManual=false;g.updateRouteGoal();g.emit();return false;}
 g.routeHelp.reset();g.routeWaypoint=null;g.routeGoal=best.key;g.routeManual=true;g.routeNext=0;g.supplyRouteStatus='';g.emit();return true;
}
export function removeSupplyRoute(g,p,collected){
 const key=supplyKey(p);g.playerRoute?.fields.delete(key);
 if(g.routeGoal!==key&&g.touchUseGoal!==key)return;
 g.routeGoal=null;g.routeManual=false;g.routeNext=0;
 g.supplyRouteStatus=collected?'Supply collected; select your next objective':'Supply expired; choose another route';
 if(g.touchUse){g.touchRoute=null;g.touchRouteActive=false;g.touchRouteCancelled=true;g.touchSupplyCollected=collected;g.touchRouteStatus=collected?'RESUPPLIED · RELEASE USE':'SUPPLY GONE · RELEASE USE';}
}
export function emptyAmmoAdvice(g){
 if(!g.touchMode)return 'No ammunition. Recover a core or collect a fallen sentinel’s supply.';
 const backup=g.weaponSlots[g.activeWeapon==='rifle'?'breacher':'rifle'];
 const options=[];
 if(backup.ammo+backup.reserve>0)options.push(`TOOLS → SWAP (${backup.ammo+backup.reserve} ${g.activeWeapon==='rifle'?'shells':'rounds'})`);
 const count=liveSupplies(g).length;if(count)options.push(`MAP → SUPPLIES (${count})`);
 if(g.coreNodes.some(c=>!c.collected))options.push('recover a memory');
 return options.length?'NO AMMO · '+options.join(' · '):'NO AMMO OR SUPPLIES · Pause to restart the mission';
}
