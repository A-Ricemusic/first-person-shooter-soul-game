import * as THREE from 'three';
import L from './suit-service-layout.json' with {type:'json'};
import {feetY,profileOf} from './movement.js';
export function serviceStatus(g){
 const s=g.suitService||{spent:false,progress:0};
 const near=Math.hypot(g.player.x-L.face[0],g.player.z-L.face[2])<=L.reach;
 const valid=near&&g.player.z<L.face[2]&&g.grounded&&!g.vault&&!(g.dashTime>0)&&Math.abs(feetY(g.player,profileOf(g)))<=.25&&g.hasLineOfSight(g.player,new THREE.Vector3(...L.face),0);
 const powered=g.cores===3&&g.custodian.dead;
 const full=g.health>=100&&g.shield>=60;
 return {near,valid,powered,full,spent:s.spent,progress:s.progress/L.seconds,state:s.spent?'SPENT':!powered?'LOCKED':s.progress>0?'CHARGING':'READY'};
}
export function resetService(g){g.suitService={spent:false,progress:0};}
export function updateService(g,dt){
 const s=g.suitService,a=serviceStatus(g);
 if(g.phase!=='playing'||!a.valid||!a.powered||a.spent||a.full||!g.keys.has('KeyE')||g.serviceDamaged){s.progress=0;g.serviceDamaged=false;return;}
 s.progress+=dt;
 if(s.progress+1e-9>=L.seconds){
  const b=serviceStatus(g);
  if(b.valid&&b.powered&&!b.spent&&!b.full){s.spent=true;s.progress=0;g.health=Math.min(100,g.health+L.health);g.shield=L.shield;g.event('notice','SUIT SERVICED · +40 HEALTH / AEGIS 60 · CARTRIDGE SPENT');}
  else s.progress=0;
 }
}
