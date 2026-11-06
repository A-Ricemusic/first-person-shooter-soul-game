import assert from 'node:assert/strict';
import {mobileOpticLayout} from '../src/mobile-marker-layout.js';

// Screen-space policy only. Native rendered/collision coverage lives in
// mobile-optic-cues; this checks permutations and priority boundaries cheaply.
const viewport={width:390,height:844};
const optic=(id,extra={})=>({id,front:true,onscreen:true,x:0,y:0,distance:20,...extra});
const visible=result=>[...result].filter(([,v])=>v.visible).map(([id])=>id);
const a=optic('a'),b=optic('b',{x:.04,charging:true});
for(const order of [[a,b],[b,a]]){
 const result=mobileOpticLayout(order,viewport);
 assert.deepEqual(visible(result),['b']);
 assert.equal(result.get('a').x,195);
 assert.equal(result.get('b').x,(1.04)*390/2);
 assert.equal(result.get('b').rect.right-result.get('b').rect.left,24);
}
assert.deepEqual(visible(mobileOpticLayout([a,optic('b',{recent:true})],viewport)),['b']);
assert.deepEqual(visible(mobileOpticLayout([a,optic('b',{distance:8})],viewport)),['b']);
assert.deepEqual(visible(mobileOpticLayout([optic('b'),a],viewport)),['a']);
assert.equal(visible(mobileOpticLayout([a,optic('b',{x:.3})],viewport)).length,2);
assert.deepEqual(visible(mobileOpticLayout([a],viewport,[{left:180,right:210,top:400,bottom:440}])),[]);
assert.deepEqual(visible(mobileOpticLayout([optic('edge',{x:1}),optic('behind',{front:false})],viewport)),[]);
const boss=optic('boss',{type:'custodian'});
assert.deepEqual(visible(mobileOpticLayout([boss],viewport,[],{component:true})),[]);
assert.deepEqual(visible(mobileOpticLayout([boss],viewport)),[]);
assert.deepEqual(a,optic('a')); // Caller eligibility and target state stay untouched.
console.log('Optic cluster priority, stable identity, truthful anchors and HUD boundaries passed.');
