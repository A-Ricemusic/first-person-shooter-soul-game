import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRole,dutyGoal} from '../src/enemy-roles.js';
const v=(x,z)=>new Vector3(x,0,z), e={...createRole(v(0,0),'guard'),group:{position:v(0,0)},windup:1,health:100};
assert.equal(dutyGoal(e,v(11,0),true,.1).x,11);assert.equal(e.duty,'chase');
for(const x of [12,13,17,12.1,11.9]){dutyGoal(e,v(x,0),true,.1);assert.equal(e.duty,'chase');}
e.group.position.set(10,0,0);dutyGoal(e,v(19,0),true,.1);assert.equal(e.duty,'return');
for(const x of [17,11,10,19]){dutyGoal(e,v(x,0),true,.1);assert.equal(e.duty,'return');}
assert.equal(e.windup,1);assert.equal(e.health,100);assert.deepEqual(e.home.toArray(),[0,0,0]);
e.group.position.set(.5,0,0);dutyGoal(e,v(11,0),true,.1);assert.equal(e.duty,'chase');
e.group.position.set(5,0,0);dutyGoal(e,v(3,0),false,1);assert.equal(e.lastSeen.x,11);dutyGoal(e,v(3,0),false,2.1);assert.equal(e.duty,'return');
e.group.position.set(5,0,0);e.duty='chase';e.lastSeen.set(11,0,0);e.unseen=0;
dutyGoal(e,v(100,100),false,1);assert.equal(e.duty,'chase');assert.equal(e.lastSeen.x,11);
dutyGoal(e,v(100,100),false,2.1);assert.equal(e.duty,'return');
e.group.position.set(17,0,0);e.duty='chase';dutyGoal(e,v(17,0),true,.1);assert.equal(e.duty,'return');
const hunter={...createRole(v(0,0)),group:{position:v(0,0)}};const player=v(100,100);assert.deepEqual(dutyGoal(hunter,player,false,10).toArray(),hunter.home.toArray());assert.equal(hunter.duty,'hold');
console.log('Role contracts: hysteresis, sticky return, immutable home, 3s sight memory, weapon/health independence, unassigned hunter passed');
