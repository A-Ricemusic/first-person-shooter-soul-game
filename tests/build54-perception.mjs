import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRole,dutyGoal,hearShot} from '../src/enemy-roles.js';
const v=(x,z)=>new Vector3(x,0,z);
const enemy=()=>({...createRole(v(0,0)),id:1,group:{position:v(0,0)}});
const e=enemy(),p=v(10,0);
for(const x of [10,20,30]){assert.equal(dutyGoal(e,v(x,10),false,.1),e.group.position);assert.equal(e.duty,'hold');}
dutyGoal(e,p,true,.1);p.x=90;assert.equal(e.lastSeen.x,10);
for(const x of [11,100,-100]){assert.equal(dutyGoal(e,v(x,100),false,.9).x,10);}
assert.equal(e.unseen,2.7);dutyGoal(e,p,false,.31);assert.equal(e.duty,'search');
for(let i=0;i<51;i++)dutyGoal(e,v(i*10,100),false,.1);
assert.equal(e.duty,'hold');
assert.equal(hearShot(e,v(25,0)),false);const origin=v(20,0);assert.equal(hearShot(e,origin),true);origin.x=100;assert.equal(e.lastSeen.x,20);
dutyGoal(e,v(90,90),false,1);assert.equal(e.lastSeen.x,20);assert.equal(e.unseen,1);
e.duty='return';dutyGoal(e,v(8,0),true,.1);assert.equal(e.duty,'chase');
console.log('Build54 pure: unacquired hold, copied sight/noise, bounded memory/search, radius, reacquisition passed');
const guard={...createRole(v(0,0),'guard'),group:{position:v(0,0)}};assert.equal(hearShot(guard,v(1,0)),false);
for(const dt of [1/120,1/60,1/30]){const h=enemy();h.group.position.set(5,0,0);hearShot(h,v(12,0));for(let t=0;t<8.2;t+=dt)dutyGoal(h,v(900,900),false,dt);assert.equal(h.duty,'return');for(let t=0;t<21;t+=dt)dutyGoal(h,v(900,900),false,dt);assert.equal(h.duty,'hold');}
console.log('Frame variation, inaccessible-return timeout and guard hearing exclusion passed');
