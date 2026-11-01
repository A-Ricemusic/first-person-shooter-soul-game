import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[],rows=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});
 await page.click('#deploy');
 // Reproduce the parent's actual east approach: the visible nearby receiver
 // should not compete with a notice about a different, distant blocked archive.
 for(const [label,x,z,expectNotice] of [['east',22,2,false],['west-wall',-12,-22,true],['east-return',22,2,false]]) {
  const row=await page.evaluate(({label,x,z})=>{
   const g=window.__SOULFALL__.game;g.player.set(x,1.7,z);g.yaw=0;g.animate(0);g.emit();
   const markers=g.captureMarkers();g.onMarkers(markers);g.renderer.render(g.scene,g.camera);
   const notice=document.querySelector('#blocked-signal');
   return {label,visible:!notice.classList.contains('hidden'),text:notice.textContent,objectives:markers.filter(m=>m.kind==='core').map(m=>({id:m.id,distance:m.distance,occluded:m.occluded})),hiddenBlockedBearings:markers.filter(m=>m.occluded).every(m=>!document.querySelector(`[data-marker-id="${m.id}"]`))};
  },{label,x,z});
  assert.equal(row.visible,expectNotice,JSON.stringify(row));
  assert.ok(row.hiddenBlockedBearings);
  if(label==='east'){
   assert.equal(row.objectives.find(m=>m.id==='core-1').occluded,false);
   assert.equal(row.objectives.find(m=>m.id==='core-0').occluded,true);
   await page.screenshot({path:'docs/media/build27-nearby-clear-objective.jpg',type:'jpeg',quality:80});
  }
  rows.push(row);
 }
 const paused=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.phase='paused';g.onMarkers(g.captureMarkers());return document.querySelector('#blocked-signal').classList.contains('hidden');});
 assert.ok(paused);assert.deepEqual(errors,[]);
 writeFileSync(process.env.OBJECTIVE_NOTICE_OUTPUT||'docs/quality-reviews/current-objective-notice.json',JSON.stringify({method:'Arranged browser states reproduce unrelated blocked-archive guidance during a clear nearby receiver approach, then verify wall guidance and stale-notice cleanup. Not ordinary discovery.',rows,paused,errors},null,2)+'\n');
 console.log('Objective notice: nearby clear receiver, blocked nearer archive, transition and pause passed');
} finally {await browser.close();}
