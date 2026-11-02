import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {STANDING,CROUCHED,feetY,updatePosture,toggleCrouch,movePlayer,jumpPlayer,canPlayerOccupy,playerHitProfile} from '../src/movement.js';
import {recoveryDistance,isInsideExtraction} from '../src/mission.js';
const world={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},colliders:[]};
const body=()=>({player:{x:0,y:1.7,z:0},grounded:true,velocityY:0});
const checks=[];const ok=(v,m)=>{assert(v,m);checks.push(m)};
for(const dt of [1/30,1/60,1/144,.4]){
 const b=body();toggleCrouch(b);for(let t=0;t<.4;t+=dt){updatePosture(b,world,dt);ok(Math.abs(feetY(b.player,b.profile))<1e-8,'transition feet fixed');const hit=playerHitProfile(b);ok(b.player.y+hit.headOffset+hit.headRadius<=b.profile.bodyHeight+1e-8,'transition head bounded');}
 ok(Math.abs(b.player.y-1.05)<1e-8,'full low eye');
 const roof={min:{x:-1,y:1.3,z:-1},max:{x:1,y:2,z:1}};world.colliders.push(roof);toggleCrouch(b);updatePosture(b,world,1);ok(b.standBlocked&&b.player.y===1.05,'entire standing cylinder denied');
 movePlayer(b,world,3,0,.5);updatePosture(b,world,1);ok(b.player.y===1.7,'stand after moving clear');world.colliders.pop();
 toggleCrouch(b);updatePosture(b,world,1);jumpPlayer(b,world);ok(!toggleCrouch(b),'air toggle ignored');updatePosture(b,world,1);movePlayer(b,world,0,0,1);ok(b.grounded&&Math.abs(feetY(b.player,b.profile))<1e-8,'low jump lands without support drift');
 const h=playerHitProfile(b);ok(b.player.y+h.headOffset+h.headRadius<=1.25&&b.player.y+h.torsoOffset+h.torsoRadius<=1.25,'low proxies bounded within body');
 ok(recoveryDistance(b.player,{x:3,z:0},b.profile)<1e-8,'recovery measured from feet');
 ok(isInsideExtraction({x:0,y:1.05,z:31},{x:0,z:31},CROUCHED),'grounded low deck eligibility');
}
const b=body();world.colliders.push({min:{x:-1,y:0,z:-1},max:{x:1,y:2,z:1}});b.player.y=3.7;toggleCrouch(b);updatePosture(b,world,1);ok(Math.abs(feetY(b.player,b.profile)-2)<1e-8,'raised support preserved');movePlayer(b,world,3,0,.6);movePlayer(b,world,0,0,1);ok(b.grounded&&Math.abs(feetY(b.player,b.profile))<1e-8,'walkoff lands on floor');
ok(!canPlayerOccupy(world,10,1.05,0,.4,CROUCHED),'low body respects world bounds');
ok(playerHitProfile({profile:STANDING}).torsoRadius===.65,'standing hit contract unchanged');
writeFileSync('docs/quality-reviews/build56-implementation-physics.json',JSON.stringify({checks},null,2));console.log(checks.length,'checks passed');
