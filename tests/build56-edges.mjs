import assert from 'node:assert/strict';import{writeFileSync}from'node:fs';import{Vector3}from'three';
import{STANDING,CROUCHED,feetY,updatePosture,toggleCrouch,movePlayer,jumpPlayer,canPlayerOccupy}from'../src/movement.js';
import{planVault}from'../src/traversal.js';import{recoveryDistance,serviceRouteAt}from'../src/mission.js';import{dutyGoal,createRole}from'../src/enemy-roles.js';
const checks=[];const ok=(v,m)=>{assert(v,m);checks.push(m)};const box=(x,y,z,X,Y,Z)=>({min:{x,y,z},max:{x:X,y:Y,z:Z}});
const world={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},colliders:[]};const body=()=>({player:new Vector3(0,1.05,0),profile:CROUCHED,crouchRequested:true,grounded:true,velocityY:0,dashTime:0});
for(const dt of [1/15,1/60,1/240,.5]){
 const b=body();world.colliders=[box(-2,1.3,-2,2,2,2)];b.crouchRequested=false;updatePosture(b,world,dt);ok(b.standBlocked&&b.profile===CROUCHED,'low ceiling denies whole expansion');
 movePlayer(b,world,20,20,dt);ok(canPlayerOccupy(world,b.player.x,b.player.y,b.player.z,.4,b.profile),'large diagonal bounded collision');
 world.colliders=[];b.player.set(0,1.05,0);updatePosture(b,world,.08);const before=b.player.y;
 world.colliders=[box(-1,1.6,-1,1,2,1)];updatePosture(b,world,1);ok(b.player.y===before,'new ceiling blocks expansion during transition');
 world.colliders=[];b.crouchRequested=true;updatePosture(b,world,1);b.dashTime=.22;ok(!toggleCrouch(b),'dash ignores toggle');updatePosture(b,world,1);ok(b.player.y===1.05,'dash freezes profile');b.dashTime=0;b.vault={};ok(!toggleCrouch(b),'vault ignores toggle');b.vault=null;
 ok(planVault(b,world,{x:0,z:-1})===null,'crouched vault never uses standing cylinder');
 jumpPlayer(b,world);const requested=b.crouchRequested;ok(!toggleCrouch(b)&&b.crouchRequested===requested,'air does not queue toggle');movePlayer(b,world,0,0,2);ok(b.grounded&&Math.abs(feetY(b.player,b.profile))<1e-6,'large dt low jump lands');
}
world.colliders=[box(-1,1.3,-1,1,2,1)];const embedded=body();embedded.player.y=1.5;const y=embedded.player.y;updatePosture(embedded,world,1);ok(embedded.player.y===y,'embedded fixture cannot resize to escape');
ok(serviceRouteAt({x:14,y:1.05,z:12,yaw:0,grounded:true},CROUCHED)?.x===14,'grounded crouch service cue');ok(!serviceRouteAt({x:14,y:2.05,z:12,yaw:0,grounded:true},CROUCHED),'raised body not floor service cue');
ok(recoveryDistance({x:0,y:1.05,z:0},{x:2.8,z:0},CROUCHED)===2.8,'crouch does not extend 2.8m reach');
// Hunter sees a copied contact, then cannot learn an unseen posture change.
const enemy={...createRole(new Vector3(0,0,0),'hunter'),group:{position:new Vector3()},type:'sentinel'};const player=new Vector3(0,1.7,3);const nav={clear:()=>true};dutyGoal(enemy,player,true,.1,nav);const known=enemy.lastSeen.clone();player.y=1.05;dutyGoal(enemy,player,false,.1,nav);ok(enemy.lastSeen.equals(known),'hidden eye change cannot rewrite copied contact');
writeFileSync('docs/quality-reviews/build56-implementation-edges.json',JSON.stringify({checks},null,2));console.log(checks.length,'edge checks passed');
