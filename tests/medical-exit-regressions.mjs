import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await page.click('#deploy',{force:true});
 for(let i=0;i<9;i++){
  const a=i===8?null:i*Math.PI/4;
  const start=await page.evaluate(a=>{
   const g=window.__SOULFALL__.game;g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);
   const c=g.coreNodes[0].position;g.player.set(c.x+(a===null?0:Math.sin(a)*2.6),1.7,c.z+(a===null?0:Math.cos(a)*2.6));g.yaw=0;g.pitch=0;
   return{position:g.player.toArray(),canStand:g.canOccupy(g.player.x,g.player.z,.4),recoveryReady:g.captureState().recoveryReady};
  },a);
  assert.equal(start.canStand,true);assert.equal(start.recoveryReady,true);
  await page.keyboard.down('KeyD');
  const end=await page.evaluate(()=>{
   const g=window.__SOULFALL__.game;let minEye=Infinity,maxEye=-Infinity;
   for(let j=0;j<360;j++){g.update(1/120);minEye=Math.min(minEye,g.player.y);maxEye=Math.max(maxEye,g.player.y);}
   g.yaw=-Math.PI/2;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);
   return{position:g.player.toArray(),grounded:g.grounded,minEye,maxEye,dashes:g.dashCount,exited:g.player.x>-13};
  });
  await page.keyboard.up('KeyD');
  const row={label:i===8?'center':`arc-${i}`,start,end};
  if(i===0||i===4||i===8){row.screenshot=`docs/media/${process.env.EXIT_CAPTURE_PREFIX||'current-medical-exit'}-${row.label}.png`;await page.screenshot({path:row.screenshot});}
  rows.push(row);
 }
 assert.deepEqual(errors,[]);
 writeFileSync(process.env.EXIT_OBSERVATIONS||'docs/current-medical-exit.json',JSON.stringify({method:'Explicit test=1 recovery-area arrangements; ordinary D input plus controlled simulation. Nine grounded movement routes, no jump/dash/enemy pressure. Correctness evidence, not independent natural discovery or full mission play.',rows,errors},null,2)+'\n');
 if(process.env.OBSERVE_ONLY!=='1')for(const row of rows){assert.ok(row.end.exited,JSON.stringify(row));assert.ok(row.end.grounded);assert.equal(row.end.dashes,0);assert.ok(Math.abs(row.end.minEye-1.7)<1e-6&&Math.abs(row.end.maxEye-1.7)<1e-6);}
 console.log(JSON.stringify(rows.map(r=>({label:r.label,exited:r.end.exited,end:r.end.position})),null,2));
}finally{await browser.close();}
