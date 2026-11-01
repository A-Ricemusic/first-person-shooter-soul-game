import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const observations=[],errors=[];
try {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50});await page.click('#deploy',{force:true});
 for(const width of [1280,1440]){
  await page.setViewportSize({width,height:width===1280?800:900});
  for(const [label,distance,y]of [['inside',2.65,1.7],['outside',2.75,1.7],['airborne',0,2.3]]){
   const row=await page.evaluate(({label,distance,y})=>{
    const g=window.__SOULFALL__.game;g.restart();for(let i=0;i<3;i++)g.debug.collectCore(i);g.clearRun();g.extractionWave=true;g.encounters=new Set(['ingress','medical','engineering','heart']);
    g.player.set(g.world.playerSpawn.x+distance,y,g.world.playerSpawn.z);g.yaw=0;g.pitch=-.3;g.extractionProgress=.6;
    if(label!=='airborne')for(let i=0;i<30;i++)g.update(1/120);
    g.animate(0);g.emit();const markers=g.captureMarkers();g.onMarkers(markers);g.renderer.render(g.scene,g.camera);const m=markers.find(m=>m.kind==='exit');
    return{label,distance,state:g.captureState(),progressSeconds:g.extractionProgress,marker:m,markerText:document.querySelector('[data-marker-id="extraction"] small').textContent,status:document.querySelector('#extraction-status').textContent,visibleRadius:g.exitRing.geometry.parameters.radius};
   },{label,distance,y});
   assert.ok(Math.abs(row.visibleRadius-2.7)<1e-8);assert.ok(Math.abs(row.marker.distance-distance)<1e-8);assert.ok(Math.abs(row.state.exitDistance-distance)<1e-8);
   if(label==='inside'){assert.equal(row.state.insideExtraction,true);assert.equal(row.marker.inZone,true);assert.equal(row.markerText,'IN ZONE');assert.ok(row.status.includes('MOVE WITHIN THE RING'));assert.equal(row.state.objective,'HOLD THE EXTRACTION ZONE');assert.ok(Math.abs(row.progressSeconds-.85)<1e-6);}
   else {assert.equal(row.state.insideExtraction,false);assert.equal(row.marker.inZone,false);assert.equal(row.state.objective,'RETURN TO EXTRACTION');assert.ok(row.status.includes('UPLINK DECAYING'));if(label==='outside')assert.ok(Math.abs(row.progressSeconds-.1)<1e-6);}
   row.width=width;row.screenshot=`docs/media/${process.env.EXTRACTION_CAPTURE_PREFIX||'current-extraction'}-${width}-${label}.jpg`;await page.screenshot({path:row.screenshot,type:'jpeg',quality:80});observations.push(row);
  }
 }
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.player.copy(g.world.playerSpawn);g.extractionProgress=0;g.grounded=true;g.velocityY=0;g.yaw=0;});
 await page.keyboard.down('KeyD');
 const moving=await page.evaluate(()=>{const g=window.__SOULFALL__.game,from=g.player.clone();for(let i=0;i<20;i++)g.update(1/120);return{distance:g.player.distanceTo(from),progress:g.extractionProgress,inside:g.captureState().insideExtraction};});
 await page.keyboard.up('KeyD');assert.ok(moving.distance>.4);assert.ok(moving.progress>.16);assert.equal(moving.inside,true);
 const restart=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.onMarkers(g.captureMarkers());return{cores:g.cores,progress:g.extractionProgress,extractionMarker:!!document.querySelector('[data-marker-id="extraction"]')};});
 assert.deepEqual(restart,{cores:0,progress:0,extractionMarker:false});assert.deepEqual(errors,[]);
 writeFileSync(process.env.EXTRACTION_OBSERVATIONS||'docs/current-extraction-readability.json',JSON.stringify({method:'Parent explicitly arranged test=1 final-stage states; no enemies. Actual controlled simulation and WebGL at two desktop sizes; ordinary D input verifies movement can advance uplink. Correctness evidence, not independent extraction or enjoyment.',observations,moving,restart,errors},null,2)+'\n');
 console.log('Extraction ring, planar marker, live zone/decay text, airborne boundary, movement and restart: passed');
}finally{await browser.close();}
