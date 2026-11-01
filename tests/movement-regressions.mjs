import assert from 'node:assert/strict';
import {movePlayer,jumpPlayer,canPlayerOccupy} from '../src/movement.js';
const box=(x,y,z,X,Y,Z)=>({min:{x,y,z},max:{x:X,y:Y,z:Z}});
const world={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},colliders:[box(-2,0,-2,2,1.315,2),box(4,0,-8,5,8,8)]};
const body=(x=0,y=1.7,z=3)=>({player:{x,y,z},grounded:true,velocityY:0});
const checks=[];
for(const hz of [20,30,60,144]){
 const b=body();assert(jumpPlayer(b,world));assert(!jumpPlayer(b,world));
 for(let i=0;i<Math.round(hz*.5);i++)movePlayer(b,world,0,-3/hz,1/hz);
 for(let i=0;i<hz;i++)movePlayer(b,world,0,0,1/hz);
 assert(Math.abs(b.player.y-3.015)<1e-8);assert(b.grounded);const rest=b.player.y;
 for(let i=0;i<hz;i++)movePlayer(b,world,0,0,1/hz);assert.equal(b.player.y,rest);
 for(let i=0;i<hz;i++)movePlayer(b,world,0,5/hz,1/hz);
 for(let i=0;i<hz;i++)movePlayer(b,world,0,0,1/hz);assert.equal(b.player.y,1.7);assert(b.grounded);
 checks.push(`jump, stable grate landing, walk off and floor at ${hz} Hz`);
}
const side=body();movePlayer(side,world,0,-8,.5);assert(side.player.z>=2.39);assert.equal(side.player.y,1.7);checks.push('No side-entry pop');
const ceiling={...world,colliders:[box(-2,2.2,-2,2,2.4,2)]};const c=body(0,1.7,0);jumpPlayer(c,ceiling);movePlayer(c,ceiling,0,0,.1);assert(c.player.y<=2);assert(c.velocityY<=0);movePlayer(c,ceiling,0,0,1);assert.equal(c.player.y,1.7);checks.push('Swept ceiling stops head and returns to floor');
const dash=body(0,4,0);dash.grounded=false;movePlayer(dash,world,20,0,.22);assert(dash.player.x<3.61);assert(canPlayerOccupy(world,dash.player.x,dash.player.y,0));
const bounds=body(0,10,0);bounds.grounded=false;movePlayer(bounds,world,-100,0,.22);assert(bounds.player.x>=-9.6);checks.push('Air dash cannot tunnel high wall or perimeter');
const lowWorld={...world,colliders:[box(-2,0,-.2,2,.6,.2)]};
const over=body(0,1.7,1.5);jumpPlayer(over,lowWorld);
for(let i=0;i<90;i++)movePlayer(over,lowWorld,0,-5.5/120,1/120);
movePlayer(over,lowWorld,0,0,1);assert(over.player.z<-.6);assert.equal(over.player.y,1.7);checks.push('Jump clears low obstacle and lands on far floor');
const unsupported=body(0,3,5);assert(!jumpPlayer(unsupported,world));movePlayer(unsupported,world,0,0,1);assert.equal(unsupported.player.y,1.7);checks.push('Stale grounded flag cannot grant an unsupported jump');
console.log(JSON.stringify({checks}));
