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
  for(const [label,distance,y]of [['center',0,1.7],['inside',2.65,1.7],['outside',2.75,1.7],['airborne',0,2.3],['approach',3.7,1.7],['near-approach',2.9,1.7],['distant',12,1.7]]){
   const row=await page.evaluate(({label,distance,y})=>{
    const g=window.__SOULFALL__.game;g.restart();for(let i=0;i<3;i++)g.debug.collectCore(i);g.clearRun();g.extractionWave=true;g.encounters=new Set(['ingress','medical','engineering','heart']);
    g.player.set(g.world.playerSpawn.x+distance,y,g.world.playerSpawn.z);g.yaw=0;g.pitch=-.3;g.extractionProgress=['approach','near-approach','distant'].includes(label)?0:.6;
    if(label!=='airborne')for(let i=0;i<30;i++)g.update(1/120);
    g.animate(0);g.emit();const markers=g.captureMarkers();g.onMarkers(markers);g.renderer.render(g.scene,g.camera);const m=markers.find(m=>m.kind==='exit');
    return{label,distance,state:g.captureState(),progressSeconds:g.extractionProgress,marker:m,markerText:document.querySelector('[data-marker-id="extraction"] small').textContent,status:document.querySelector('#extraction-status').textContent,edgeWarning:document.querySelector('#extraction-panel').classList.contains('zone-edge'),visibleRadius:g.exitRing.geometry.parameters.radius};
   },{label,distance,y});
   assert.ok(Math.abs(row.visibleRadius-2.7)<1e-8);assert.ok(Math.abs(row.marker.distance-distance)<1e-8);assert.ok(Math.abs(row.state.exitDistance-distance)<1e-8);
   if(label==='inside'||label==='center'){assert.equal(row.state.insideExtraction,true);assert.equal(row.marker.inZone,true);assert.equal(row.markerText,'IN ZONE');assert.equal(row.edgeWarning,label==='inside');assert.ok(row.status.includes(label==='inside'?'NEAR EDGE: MOVE INWARD':'MOVE WITHIN THE RING'));assert.equal(row.state.objective,'HOLD THE EXTRACTION ZONE');assert.ok(Math.abs(row.progressSeconds-.85)<1e-6);}
   else {assert.equal(row.edgeWarning,false);assert.equal(row.state.insideExtraction,false);assert.equal(row.marker.inZone,false);assert.equal(row.state.objective,'RETURN TO EXTRACTION');if(['approach','near-approach'].includes(label)){assert.ok(row.status.includes('ENTER FLOOR RING'));assert.ok(row.status.includes(label==='approach'?'1.0 M TO EDGE':'0.2 M TO EDGE'));assert.equal(row.progressSeconds,0);}else if(label==='distant'){assert.ok(row.status.includes('HOLD 6 SECONDS'));assert.equal(row.progressSeconds,0);}else assert.ok(row.status.includes('UPLINK DECAYING'));if(label==='airborne')assert.ok(row.status.includes('LAND INSIDE THE FLOOR RING'));if(label==='outside')assert.ok(Math.abs(row.progressSeconds-.1)<1e-6);}
   row.width=width;row.screenshot=`docs/media/${process.env.EXTRACTION_CAPTURE_PREFIX||'current-extraction'}-${width}-${label}.jpg`;await page.screenshot({path:row.screenshot,type:'jpeg',quality:80});observations.push(row);
  }
 }
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.player.copy(g.world.playerSpawn);g.extractionProgress=0;g.grounded=true;g.velocityY=0;g.yaw=0;});
 await page.keyboard.down('KeyD');
 const moving=await page.evaluate(()=>{const g=window.__SOULFALL__.game,from=g.player.clone();for(let i=0;i<20;i++)g.update(1/120);return{distance:g.player.distanceTo(from),progress:g.extractionProgress,inside:g.captureState().insideExtraction};});
 await page.keyboard.up('KeyD');assert.ok(moving.distance>.4);assert.ok(moving.progress>.16);assert.equal(moving.inside,true);
 // Ordinary keys cross the original trigger boundary: approaching does not
 // advance the uplink until the player is actually inside, with no HUD timer.
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.player.copy(g.world.playerSpawn);g.player.z-=2.9;g.yaw=0;g.extractionProgress=0;g.grounded=true;g.velocityY=0;g.emit();});
 await page.keyboard.down('KeyS');
 const entering=await page.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<12;i++)g.update(1/120);g.emit();return {distance:g.captureState().exitDistance,inside:g.captureState().insideExtraction,progress:g.extractionProgress,status:document.querySelector('#extraction-status').textContent};});
 await page.keyboard.up('KeyS');assert.ok(entering.inside);assert.ok(entering.distance<2.7);assert.ok(entering.progress>0);assert.ok(entering.status.includes('UPLINK'));
 const restart=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.onMarkers(g.captureMarkers());return{cores:g.cores,progress:g.extractionProgress,extractionMarker:!!document.querySelector('[data-marker-id="extraction"]')};});
 assert.deepEqual(restart,{cores:0,progress:0,extractionMarker:false});assert.deepEqual(errors,[]);
 writeFileSync(process.env.EXTRACTION_OBSERVATIONS||'docs/current-extraction-readability.json',JSON.stringify({method:'Parent explicitly arranged test=1 final-stage states; no enemies. Actual controlled simulation and WebGL at two desktop sizes; ordinary D input verifies movement can advance uplink. Correctness evidence, not independent extraction or enjoyment.',observations,moving,entering,restart,errors},null,2)+'\n');
 console.log('Extraction ring, planar marker, live zone/decay text, airborne boundary, movement and restart: passed');
}finally{await browser.close();}
