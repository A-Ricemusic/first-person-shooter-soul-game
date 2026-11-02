import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const rows=[];
try{for(const fallback of [false,true]){
 const p=await b.newPage({viewport:{width:1280,height:800}});if(fallback)await p.route('**/assets/suit-service.glb',r=>r.abort());
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)};});await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});
 const row=await p.evaluate(async(fallback)=>{const g=window.__SOULFALL__.game,L=(await import('/src/suit-service-layout.json')).default;g.requestLock=()=>{};g.start();g.clearRun();g.player.set(-3.15,1.7,30.9);g.yaw=Math.PI+.65;g.pitch=-.40;g.syncCamera();
 const box=g.world.suitBounds,checks=[],ok=(v,s)=>{if(!v)throw Error(s);checks.push(s)};
 ok(g.canOccupy(-2.05,31),'stance clear');ok(!g.canOccupy(-2.05,31.9),'cabinet blocks capsule');
 for(const x of [-3.1,-1])for(const z of [30.9,31.9,32.6])ok(g.canOccupy(x,z),'side route clear '+x+','+z);
 const displays=[];g.world.suit.traverse(o=>{if(o.name==='ServiceStatus'||o.name.startsWith('ChargeCell'))displays.push(o)});
 ok(g.world.suit.userData.dynamic,'cabinet dynamic ownership');if(!fallback){ok(displays.length===9,'authored status and eight charge cells');ok(new Set(displays.map(o=>o.material)).size===9,'per-display owned material instances');ok(displays.every(o=>!o.userData.batchHousing&&o.visible),'dynamic display excluded from housing batches');ok(g.world.suit.getObjectByName('ServiceHousing').userData.batchHousing,'static housing ownership');}
 const bounds={min:box.min.toArray(),max:box.max.toArray()};g.world.setSuitServiceState({state:'READY',powered:true,spent:false,progress:0});g.animate(0);g.renderer.render(g.scene,g.camera);return {fallback,checks,bounds};},fallback);
 await p.screenshot({path:`docs/media/build60-${fallback?'fallback':'authored'}-cabinet.png`});rows.push(row);await p.close();
}assert.deepEqual(rows[0].bounds,rows[1].bounds);writeFileSync('docs/quality-reviews/build60-model.json',JSON.stringify({method:'Arranged actual world/model and forced-load-failure checks; not ordinary play.',rows},null,2));console.log(JSON.stringify(rows));}finally{await b.close()}
