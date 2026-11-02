import assert from 'node:assert/strict';
import {planVault,startVault,advanceVault,vaultPose} from '../src/traversal.js';
import {canPlayerOccupy,jumpPlayer} from '../src/movement.js';
import {writeFileSync} from 'node:fs';
const box=(x,y,z,X,Y,Z)=>({min:{x,y,z},max:{x:X,y:Y,z:Z}});
const world=(colliders)=>({bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},colliders});
const body=(x=0,z=1.05)=>({player:{x,y:1.7,z},grounded:true,velocityY:0});
const cover=box(-2,0,-.4,2,1,.4),checks=[];
for(const [name,b,d] of [['front',body(),{x:0,z:-1}],['back',body(0,-1.05),{x:0,z:1}],['diagonal',body(-.4,1.05),{x:.3,z:-1}]]){
 const w=world([cover]);const plan=planVault(b,w,d);assert(plan,name);
 for(let i=0;i<=1000;i++){const p=vaultPose(plan,i/1000);assert(canPlayerOccupy(w,p.x,p.y,p.z));}
 for(const dt of [1/144,1/30,.25,1]){const c=structuredClone(b);assert(startVault(c,w,d));assert(!startVault(c,w,d));for(let i=0;i<200&&c.vault;i++)advanceVault(c,w,dt);assert(c.grounded);assert.equal(c.player.y,1.7);assert(c.player.z*d.z>0);}
 checks.push(name+' full-path 1001 poses and 144/30Hz, .25/1s dt');
}
for(const [name,boxes] of [['tall',[box(-2,0,-.4,2,4,.4)]],['deep',[box(-2,0,-4,2,1,.4)]],['stack',[cover,box(-2,1,-.4,2,2,.4)]],['ceiling',[cover,box(-3,2.7,-3,3,3,3)]],['adjacent tall trim',[cover,box(.3,0,-.8,.6,2,.5)]]]){assert.equal(planVault(body(),world(boxes),{x:0,z:-1}),null,name);checks.push('reject '+name);}
const tangent=body(0,.800001);assert(planVault(tangent,world([cover]),{x:0,z:-1}),'pressed flush against cover');checks.push('flush-contact vault');
const raised=body(0,0);raised.player.y=2.7;assert.equal(planVault(raised,world([cover]),{x:0,z:-1}),null);assert(jumpPlayer(raised,world([cover])));
const unsupported=body();unsupported.grounded=false;assert.equal(planVault(unsupported,world([cover]),{x:0,z:-1}),null);
const bound=world([cover]);bound.bounds.minZ=-.9;assert.equal(planVault(body(),bound,{x:0,z:-1}),null);
const changed=body();const w=world([cover]);assert(startVault(changed,w,{x:0,z:-1}));w.colliders.push(box(-1,2,-1,1,4,1));advanceVault(changed,w,1);assert(!changed.vault);assert(!changed.grounded);checks.push('raised ordinary jump, unsupported/bounds rejection, changed geometry safe cancellation');
writeFileSync('docs/quality-reviews/build52-implementation-physics.json',JSON.stringify({checks},null,2));console.log(checks);
