import {feetY,STANDING} from './movement.js';
import UPLINK from './uplink-layout.json' with {type:'json'};
export const CORE_SITES = [
  {name:'WEST ARCHIVE',person:'MARA SOLBERG',role:'Station medic',memory:'If someone finds this… the children made the last ferry. Tell them I kept the light on.'},
  {name:'EAST ARCHIVE',person:'ELIAN VALE',role:'Relay engineer',memory:'I could erase the station. I could not erase the people inside it. Bring them home.'},
  {name:'THE HEART',person:'SERA NORD',role:'Night operator',memory:'Every signal is a person. If you can hear me, we are still here.'},
];
export const RECOVERY_SECONDS = .9;
export const RECOVERY_RADIUS = 2.8;
export function recoveryDistance(player, position, profile=STANDING) {
  return Math.hypot(position.x-player.x,position.z-player.z,feetY(player,profile));
}
export const EXTRACTION_SECONDS = 6;
export const EXTRACTION_FOOTPRINT = Object.freeze(UPLINK.footprint);
export function extractionBounds(position) {
 const f=EXTRACTION_FOOTPRINT;
 return {xMin:position.x+f.xMin,xMax:position.x+f.xMax,zMin:position.z+f.zMin,zMax:position.z+f.zMax};
}
// Navigation points at the usable deck centre; spawn remains the footprint anchor.
export function extractionCenter(position) {
 const b=extractionBounds(position);
 return {x:(b.xMin+b.xMax)/2,z:(b.zMin+b.zMax)/2};
}
// Positive strictly inside; negative Euclidean approach distance outside (including corners).
export function extractionMargin(player,position) {
 const b=extractionBounds(position);
 const dx=Math.max(b.xMin-player.x,0,player.x-b.xMax),dz=Math.max(b.zMin-player.z,0,player.z-b.zMax);
 return dx||dz ? -Math.hypot(dx,dz) : Math.min(player.x-b.xMin,b.xMax-player.x,player.z-b.zMin,b.zMax-player.z);
}
export function extractionDistance(player, position) {
  return Math.hypot(player.x-position.x,player.z-position.z);
}
export function isInsideExtraction(player, position, profile=STANDING) {
  return extractionMargin(player,position)>0 && Math.abs(feetY(player,profile))<.5;
}

// These optional platforms share their world placement with the approach cue.
export const SERVICE_ROUTES = [-14,14].map(x=>({x,z:9,rearMin:11.45,rearMax:12.85}));
export function serviceRouteAt(player,profile=STANDING){
  if(!player?.grounded||Math.abs(feetY(player,profile))>.12||Math.cos(player.yaw)<.5)return null;
  return SERVICE_ROUTES.find(r=>Math.abs(player.x-r.x)<1.8&&player.z>=r.rearMin&&player.z<=r.rearMax)||null;
}
