import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy');
 const spatial=await p.evaluate(async()=>{
 const {PlayerRoute}=await import('/src/player-route.js');const w={bounds:{minX:-3,maxX:3,minZ:-3,maxZ:3},colliders:[{min:{x:-.2,y:0,z:-3},max:{x:.2,y:3,z:3}}],playerSpawn:{x:-2,z:0}};
 const n=new PlayerRoute(w,[{id:0,position:{x:2,z:0}}]);if(n.path({x:-2,y:1.7,z:0},'core-0').length)throw Error('disconnected route invented');
 const g=window.__SOULFALL__.game;g.pointerFallback=true;g.phase='playing';g.clearRun();g.emit();return {disconnected:'empty without fallback'};
 });
 await p.keyboard.down('Tab');assert.equal(await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.updateRouteTrace();return g.routeTrace.visible}),true);
 await p.keyboard.up('Tab');assert.equal(await p.evaluate(()=>window.__SOULFALL__.game.routeTrace.visible),false);
 await p.keyboard.down('Tab');await p.keyboard.press('KeyM');assert.equal(await p.evaluate(()=>{const g=window.__SOULFALL__.game;return g.phase==='planning'&&!g.keys.has('Tab')&&!g.routeTrace.visible}),true);
 await p.keyboard.up('Tab');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.tagName),'BUTTON');assert.equal(await p.evaluate(()=>window.__SOULFALL__.game.keys.has('Tab')),false);
 await p.keyboard.press('KeyM');await p.keyboard.down('Tab');await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.updateRouteTrace();window.dispatchEvent(new Event('blur'))});assert.equal(await p.evaluate(()=>{const g=window.__SOULFALL__.game;return g.phase==='paused'&&!g.keys.has('Tab')&&!g.routeTrace.visible}),true);await p.keyboard.up('Tab');
 const cost=await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.phase='playing';g.keys.add('Tab');g.routeNext=0;const buffer=g.routeTrace.geometry.attributes.position.array,queries=g.playerRoute.queries;for(let i=0;i<100;i++){g.runTime=i/60;g.updateRouteTrace();if(g.routeTrace.geometry.attributes.position.array!==buffer)throw Error('buffer replaced');if(g.routeTrace.geometry.drawRange.count>96)throw Error('unbounded trace');}let geometry=0,material=0;g.routeTrace.geometry.addEventListener('dispose',()=>geometry++);g.routeTrace.material.addEventListener('dispose',()=>material++);const count=g.playerRoute.queries-queries;g.dispose();return {queriesFor100Frames:count,bufferBytes:buffer.byteLength,geometryDisposals:geometry,materialDisposals:material};});
 assert.ok(cost.queriesFor100Frames<=5);assert.equal(cost.geometryDisposals,1);assert.equal(cost.materialDisposals,1);assert.deepEqual(errors,[]);
 writeFileSync('docs/quality-reviews/build48-implementation-input.json',JSON.stringify({method:'Arranged deterministic renderer with real keyboard events; pointer fallback enabled to isolate focus/input checks. No combat/discovery claim.',spatial,cost,checks:['Tab hold/release','M clears held trace','Tab traverses planning buttons','blur clears trace','bounded cadence/buffer identity','owned disposal once'],errors},null,2));console.log(cost);
}finally{await b.close();}
