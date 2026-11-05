import * as T from 'three';
import {touchDirectTarget} from './touch-targeting.js';
export const TOUCH_TRACK_GAIN=.85,TOUCH_TRACK_LEASH=8*Math.PI/180,TOUCH_TRACK_SPEED=Math.PI/3,TOUCH_TRACK_RANGE=28,TOUCH_TRACK_TAP_GRACE=.35;
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const enabled=g=>g.touchMode&&g.options.touchAimAssist!==false&&g.phase==='playing'&&g.activeWeapon==='rifle'&&g.mouseDown&&!g.reloading&&!g.vault&&!g.touchFireLatch&&g.ammo>0;
const angles=d=>({yaw:Math.atan2(-d.x,-d.z),pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))});
function ownedPoint(g,enemy,local){
 enemy.group.updateWorldMatrix(true,true);const point=enemy.group.localToWorld(local.clone()),d=point.clone().sub(g.player),distance=d.length();
 if(enemy.health<=0||!g.enemies.includes(enemy)||distance<1||distance>TOUCH_TRACK_RANGE)return null;
 g.syncCamera();const direction=d.clone().normalize(),forward=g.camera.getWorldDirection(new T.Vector3());
 if(Math.acos(T.MathUtils.clamp(direction.dot(forward),-1,1))>TOUCH_TRACK_LEASH)return null;
 const hit=touchDirectTarget(g,point.clone().project(g.camera),{ignoreViewmodel:true});return hit?.key===`enemy-${enemy.id}`?{point,d}:null;
}
// Brief tap intent is consumed at the next FIRE press and always revalidated.
export function seedTouchTracking(g,hit){
 g.touchTrackSeed=null;if(!g.touchMode||g.options.touchAimAssist===false||g.phase!=='playing'||g.activeWeapon!=='rifle'||g.vault)return;
 const enemy=g.enemies.find(e=>`enemy-${e.id}`===hit.key&&e.health>0);if(!enemy)return;
 enemy.group.updateWorldMatrix(true,true);g.touchTrackSeed={enemy,local:enemy.group.worldToLocal(hit.point.clone()),time:g.runTime};
}
export function beginTouchTracking(g){
 const seed=g.touchTrackSeed;g.touchTrackSeed=null;g.touchTrack=null;if(!enabled(g))return false;
 const hit=touchDirectTarget(g,undefined,{ignoreViewmodel:true}),enemy=hit&&g.enemies.find(e=>`enemy-${e.id}`===hit.key&&e.health>0);
 if(enemy&&hit.point.distanceTo(g.player)<=TOUCH_TRACK_RANGE){enemy.group.updateWorldMatrix(true,true);g.touchTrack={enemy,key:hit.key,local:enemy.group.worldToLocal(hit.point.clone()),...angles(hit.point.clone().sub(g.player)),source:'reticle'};return true;}
 // A different real centre target wins. No target can be stolen from it.
 if(hit||!seed||g.runTime-seed.time<0||g.runTime-seed.time>TOUCH_TRACK_TAP_GRACE)return false;
 const current=ownedPoint(g,seed.enemy,seed.local);if(!current)return false;
 g.touchTrack={enemy:seed.enemy,key:`enemy-${seed.enemy.id}`,local:seed.local,...angles(current.d),source:'tap'};return true;
}
// Compensate real angular motion, never pull a manual offset toward centre.
// One current physical ray revalidates the same actor; hidden contact is never followed.
export function updateTouchTracking(g,dt){
 const track=g.touchTrack;if(!track)return;
 const drop=()=>{g.touchTrack=null};
 if(!enabled(g)||!g.enemies.includes(track.enemy)||track.enemy.health<=0||!(dt>0))return drop();
 track.enemy.group.updateWorldMatrix(true,true);
 const point=track.enemy.group.localToWorld(track.local.clone()),d=point.clone().sub(g.player),distance=d.length();
 if(distance<1||distance>TOUCH_TRACK_RANGE)return drop();
 const direction=d.clone().normalize(),forward=g.camera.getWorldDirection(new T.Vector3());
 if(Math.acos(T.MathUtils.clamp(direction.dot(forward),-1,1))>TOUCH_TRACK_LEASH)return drop();
 const a=angles(d),dyaw=wrap(a.yaw-track.yaw),dpitch=a.pitch-track.pitch;
 if(Math.hypot(dyaw,dpitch)>TOUCH_TRACK_LEASH)return drop();
 const ndc=point.clone().project(g.camera),hit=touchDirectTarget(g,ndc,{ignoreViewmodel:true});
 if(!hit||hit.key!==track.key)return drop();
 const motion=Math.hypot(dyaw,dpitch),gain=motion?Math.min(TOUCH_TRACK_GAIN,TOUCH_TRACK_SPEED*dt/motion):0;
 g.yaw+=dyaw*gain;g.pitch=T.MathUtils.clamp(g.pitch+dpitch*gain,-1.44,1.44);
 track.yaw=a.yaw;track.pitch=a.pitch;g.syncCamera();
}
