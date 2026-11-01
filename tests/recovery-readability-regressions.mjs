import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const observations=[],errors=[];
try {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await page.click('#deploy',{force:true});
 for(const width of [1280,1440]){
  await page.setViewportSize({width,height:width===1280?800:900});
  for(const [label,distance]of [['outside',3.16],['inside',2.75]]){
   const row=await page.evaluate(({label,distance})=>{
    const g=window.__SOULFALL__.game;g.restart();g.clearRun();const c=g.coreNodes[0];g.player.set(c.position.x,1.7,c.position.z+distance);g.yaw=0;g.pitch=-.3;g.animate(0);g.emit();const markers=g.captureMarkers();g.onMarkers(markers);g.renderer.render(g.scene,g.camera);
    const marker=markers.find(m=>m.id==='core-0'),el=document.querySelector('[data-marker-id="core-0"]');
    return{label,distance:marker.distance,inRange:marker.inRange,state:g.captureState(),marker:el.querySelector('small').textContent,interaction:document.querySelector('#interaction').innerText,key:document.querySelector('#interaction kbd').textContent,radar:document.querySelector('#signal-distance').textContent,reach:{visible:c.reach.visible,opacity:c.reach.material.opacity,inner:c.reach.geometry.parameters.innerRadius,outer:c.reach.geometry.parameters.outerRadius}};
   },{label,distance});
   row.width=width;
   if(label==='outside'){assert.equal(row.inRange,false);assert.equal(row.key,'◇');assert.equal(row.marker,'3.2 M');assert.ok(row.interaction.includes('MOVE CLOSER'));assert.ok(row.radar.includes('3.2 M'));}
   else {assert.equal(row.inRange,true);assert.equal(row.key,'E');assert.equal(row.marker,'HOLD E');assert.ok(row.radar.includes('CORE IN REACH'));assert.ok(row.state.recoveryReady);}
   assert.ok(Math.abs(row.distance-distance)<1e-6);assert.equal(row.reach.visible,true);assert.ok(Math.abs((row.reach.inner+row.reach.outer)/2-2.8)<1e-8);
   const path=`docs/media/${process.env.RECOVERY_CAPTURE_PREFIX||'current-recovery'}-${width}-${label}.png`;await page.screenshot({path});row.path=path;observations.push(row);
   await page.keyboard.down('KeyE');
   const result=await page.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<132;i++)g.update(1/120);g.animate(0);return{cores:g.cores,visible:g.coreNodes[0].group.visible,progress:g.coreProgress};});
   await page.keyboard.up('KeyE');
   assert.equal(result.cores,label==='inside'?1:0);assert.equal(result.visible,label!=='inside');row.heldResult=result;
  }
 }
 const reset=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();return{cores:g.cores,group:g.coreNodes[0].group.visible,reach:g.coreNodes[0].reach.visible};});
 assert.deepEqual(reset,{cores:0,group:true,reach:false});
 const airborne=await page.evaluate(()=>{const g=window.__SOULFALL__.game,c=g.coreNodes[0];g.player.set(c.position.x,4.7,c.position.z);g.animate(0);return{ready:g.captureState().recoveryReady,distance:g.captureMarkers().find(m=>m.id==='core-0').distance};});
 assert.equal(airborne.ready,false);assert.ok(Math.abs(airborne.distance-3)<1e-6);assert.deepEqual(errors,[]);
 writeFileSync(process.env.RECOVERY_OBSERVATIONS||'docs/current-recovery-readability.json',JSON.stringify({method:'Parent explicitly arranged test=1 boundary fixtures, ordinary E input plus controlled simulation, actual WebGL at two desktop sizes. Not independent or human play.',observations,reset,airborne,errors},null,2)+'\n');
 console.log('Recovery marker, radar, prompt, ground boundary, held-input threshold, airborne range and restart: passed');
}finally{await browser.close();}
