// Geometry-only design audit before a crouch stance exists. No lowered player
// body is installed; a low target point is a hypothetical sightline, not play.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game;
  const box=g.world.colliders.find(b=>Math.abs(b.min.x-13)<1e-8&&Math.abs(b.max.x-15)<1e-8&&Math.abs(b.max.y-1.3)<1e-8&&Math.abs((b.min.z+b.max.z)/2-22.5)<1e-8);
  if(!box)throw Error('Authored south reload shield not found');
  const from=new T.Vector3(14,1.3,18),standing=new T.Vector3(14,1.7,24),low=new T.Vector3(14,1.05,24);
  return {cover:{min:box.min.toArray(),max:box.max.toArray()},from:from.toArray(),standing:standing.toArray(),hypotheticalLow:low.toArray(),standingLOS:g.hasLineOfSight(from,standing,0),hypotheticalLowLOS:g.hasLineOfSight(from,low,0)};
 });
 assert.deepEqual(errors,[]);assert.equal(result.standingLOS,true);assert.equal(result.hypotheticalLowLOS,false);
 const report={baseline:'31a8f280f40488a1f4b98f9488b95d2d9a1ed081',method:'Original authored south reload shield, two static ray endpoints. No temporary geometry, player pose mutation, crouch implementation or ordinary play.',...result,errors,finding:'This waist-high shield leaves the standing eye sightline open for this source angle; a lower endpoint is blocked. It supports investigating a real stance, not claiming crouch already works.',limits:'Single geometry example only. Higher firing origins and other angles may still clear low cover. No player-capsule, projectile hit, traversal, human enjoyment or balance validation follows.'};
 writeFileSync('docs/quality-reviews/build56-parent-cover-baseline.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
