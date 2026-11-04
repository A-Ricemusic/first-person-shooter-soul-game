import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[],observations=[];
const capturePrefix=process.env.WARDEN_CAPTURE_PREFIX||'current-warden';
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const budget=await page.evaluate(()=>{const g=window.__SOULFALL__.game,e=g.enemies[0],r=e.wardenRig;let triangles=0,primitives=0;const names=[];r.model.traverse(n=>{if(n.isMesh){triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);primitives++;names.push(n.material.name)}});g.scene.updateMatrixWorld(true);const anchor=r.model.getObjectByName('WeakpointAnchor').getWorldPosition(e.group.position.clone());e.group.worldToLocal(anchor);return{triangles,primitives,names,anchor:anchor.toArray(),health:e.health,children:e.group.children.filter(n=>n.visible).map(n=>n.name||n.type)}});
 assert.ok(budget.triangles<60000);assert.ok(budget.primitives<=14);assert.equal(budget.health,150);budget.anchor.forEach((v,i)=>assert.ok(Math.abs(v-[0,2,.3][i])<1e-5));assert.equal(budget.children.length,3,'Authored model, light and contact assembly visible');assert.ok(budget.children.includes('ContactDischargeAssembly'));
 for(const viewport of [{width:1280,height:800},{width:1440,height:900}]){
  await page.setViewportSize(viewport);
  for(const state of ['hip','ads','close','charge','stagger','open','recovered']){
   const result=await page.evaluate(({state})=>{const g=window.__SOULFALL__.game;g.restart();const e=g.enemies[0];g.phase='playing';g.player.set(0,1.7,state==='close'?24.1:28);g.yaw=0;g.pitch=.04;g.aim=state==='ads';e.visible=true;e.cooldown=100;e.windup=state==='charge'?1.6:0;e.stagger=state==='stagger'?.8:0;e.armorOpen=['stagger','open'].includes(state)?3:0;
    for(let i=0;i<24;i++)g.updateEnemies(1/120);
    if(state==='recovered'){e.armorOpen=3;g.updateEnemies(.1);e.armorOpen=0;for(let i=0;i<60;i++)g.updateEnemies(1/120)}
    g.animate(.5);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);const r=e.wardenRig;const a=r.model.getObjectByName('WeakpointAnchor').getWorldPosition(g.player.clone());e.group.worldToLocal(a);return{state,anchor:a.toArray(),open:r.open,charge:r.charge,emission:e.red.emissiveIntensity,positions:r.shutters.map(s=>s.node.position.toArray()),health:e.health};},{state});
   result.anchor.forEach((v,i)=>assert.ok(Math.abs(v-[0,2,.3][i])<1e-5));assert.ok(result.emission<=1.5);if(state==='stagger'||state==='open')assert.ok(result.open>.85);if(state==='charge')assert.ok(result.charge>.85);if(state==='recovered')assert.ok(result.open<.01);
   result.viewport=viewport;result.screenshot=`docs/media/${capturePrefix}-${viewport.width}-${state}.png`;await page.screenshot({path:result.screenshot});observations.push(result);
  }
 }
 // Explicit exact-aim targeting arrangements, zero spread: correctness, not player skill.
 const hits=await page.evaluate(()=>{const g=window.__SOULFALL__.game,rows=[];const random=Math.random;Math.random=()=>.5;
 try {for(const [label,x,y,z,opened] of [['shoulder',.7,1.6,22.2,false],['open-shoulder',.7,1.6,22.2,true],['optic',0,2,22.3,false],['empty-below-chassis',0,.75,22.4,false],['crawler',.23,.14,22.30,false]]) {
  g.restart();g.phase='playing';const e=g.enemies[0];e.cooldown=100;e.armorOpen=opened?3:0;g.player.set(0,1.7,28);g.aim=true;
  const dx=x-g.player.x,dy=y-g.player.y,dz=z-g.player.z;g.yaw=Math.atan2(-dx,-dz);g.pitch=Math.atan2(dy,Math.hypot(dx,dz));g.animate(0);g.scene.updateMatrixWorld(true);g.debug.shoot();rows.push({label,damage:150-e.health,headshots:g.headshots});
 }} finally {Math.random=random}return rows;});
 assert.deepEqual(hits.map(h=>h.damage),[17,34,82,0,17]);
 // Clone ownership: no duplicate geometry allocations, separate state materials.
 const clones=await page.evaluate(()=>{const g=window.__SOULFALL__.game;const a=g.enemies[0];g.spawnEnemy(a.group.position.clone(),'warden',0);const b=g.enemies.at(-1);return{geometry:a.wardenRig.model.getObjectByName('Frame').geometry===b.wardenRig.model.getObjectByName('Frame').geometry,material:a.red!==b.red}});assert.deepEqual(clones,{geometry:true,material:true});assert.deepEqual(errors,[]);
 const fallbackPage=await browser.newPage();
 await fallbackPage.route('**/assets/build104-warden.glb',route=>route.abort());
 await fallbackPage.goto('http://127.0.0.1:5173/?test=1');
 await fallbackPage.waitForFunction(()=>window.__SOULFALL__?.game.loaded);
 await fallbackPage.click('#deploy');
 const fallback=await fallbackPage.evaluate(()=>{const g=window.__SOULFALL__.game,e=g.enemies[0];return{loaded:g.loaded,authored:!!e.wardenRig,health:e.health,visibleMeshes:e.group.children.filter(n=>n.isMesh&&n.visible).length}});
 assert.equal(fallback.loaded,true);assert.equal(fallback.authored,false);assert.equal(fallback.health,150);assert.ok(fallback.visibleMeshes>=3);
 await fallbackPage.close();
 writeFileSync('docs/current-warden-art-regressions.json',JSON.stringify({method:'Explicitly arranged test=1 fixed-frame actual WebGL/installed Chrome renders. No human/performance/audio claims.',budget,clones,fallback,hits,observations,errors},null,2)+'\n');console.log('Warden budget, nodes, fixed precision anchor through 14 poses, bounded emission, clone ownership: passed');
}finally{await browser.close()}
