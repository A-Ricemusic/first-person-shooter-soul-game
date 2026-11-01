import assert from 'node:assert/strict';
import {threatVisor} from '../src/threat-visor.js';
const sources=Array.from({length:12},(_,i)=>({id:`enemy-${i}`,kind:'enemy',type:i<6?'warden':'sentinel',bearing:.8+i*.001,front:false,x:2,y:0,charging:i%2===0,recent:true}));
const grouped=threatVisor(sources);assert.equal(grouped.cues.reduce((s,m)=>s+m.count,0),12);assert.equal(grouped.cues.reduce((s,m)=>s+m.charges,0),6);assert.equal(new Set(grouped.cues.flatMap(m=>m.members)).size,12);for(const m of grouped.cues)assert.ok(m.bearing>=.8&&m.bearing<=.812);
const rear=threatVisor([{...sources[0],bearing:Math.PI-.01},{...sources[1],bearing:-Math.PI+.01}]);
assert.equal(rear.cues.length,1);assert.equal(rear.cues[0].count,2);assert.equal(rear.cues[0].charges,1);assert.equal(rear.cues[0].fires,1);assert.ok(Math.abs(Math.abs(rear.cues[0].bearing)-Math.PI)<1e-8);
const separate=threatVisor([{...sources[0],bearing:Math.PI-.3},{...sources[1],bearing:-Math.PI+.3}]);assert.equal(separate.cues.length,2);
const a={...sources[0],front:true,x:.1,y:.1,health:.5},b={...sources[1],front:true,x:.3,y:0};const live=threatVisor([a,b]);assert.equal(live.focused.id,a.id);assert.equal(live.cues[0].x,a.x);assert.equal(live.cues[0].y,a.y);assert.equal(live.cues.length,2);assert.equal(threatVisor([]).focused,undefined);assert.deepEqual(threatVisor([]).cues,[]);console.log('Visor preserves all sources, charge counts, type groups, bearings and optic anchors, merges the rear seam without merging adjacent sectors; focus only selects a readout.');
