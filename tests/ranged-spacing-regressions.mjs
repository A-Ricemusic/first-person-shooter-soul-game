import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto(`${process.env.PLAYTEST_URL||'http://127.0.0.1:5173/'}?test=1`);
 await page.waitForFunction(()=>{const g=window.__SOULFALL__?.game;return g?.loaded&&g.wardenAsset&&g.sentinelAsset&&g.interceptorAsset;},null,{polling:50});
 await page.click('#deploy',{force:true});
 const rows=await page.evaluate(()=>{
  const g=window.__SOULFALL__.game,rows=[];
  function fixture(kind,type,x=24.45){
   g.restart();g.clearRun();g.health=10000;g.audio.setActive(false);g.player.set(x,1.7,-13.8);
   let ez=type==='sentinel'?-20:-17.8,seconds=2;
   if(kind==='approach'){ez=-35;seconds=4;}
   if(kind==='hidden'){g.player.set(-24.45,1.7,-13.8);x=-12;ez=-29;seconds=8;}
   const spawn=g.player.clone().set(x,0,ez);
   if(kind==='return'){spawn.set(24.45,0,-13.8);g.player.set(22,1.7,-18.4);seconds=5;}
   g.spawnEnemy(spawn,type,0,kind==='return'?'guard':'hunter');const e=g.enemies[0];
   if(kind==='return'){e.group.position.set(24.45,0,-17.8);e.duty='return';}
   e.cooldown=100;e.phase=-3;
   if(kind==='hidden')g.emitShotNoise(g.player); // A copied, within-radius shot origin supplies legitimate contact.
   const initial={enemy:e.group.position.toArray(),player:g.player.toArray(),canEnemy:g.canOccupy(e.group.position.x,e.group.position.z,.55),canPlayer:g.canOccupy(g.player.x,g.player.z,.4),visible:g.hasLineOfSight(e.group.position.clone().add(g.player.clone().set(0,1.3,0)),g.player),direct:g.navigation.clear(e.group.position,kind==='return'?e.home:g.player),distance:Math.hypot(e.group.position.x-g.player.x,e.group.position.z-g.player.z)};
   const queries=g.navigation.queries,trace=[];let minDistance=Infinity,minHome=Infinity,invalid=0;
   for(let i=0;i<seconds*120;i++){
    g.updateEnemies(1/120);g.runTime+=1/120;
    const distance=Math.hypot(e.group.position.x-g.player.x,e.group.position.z-g.player.z);
    minDistance=Math.min(minDistance,distance);minHome=Math.min(minHome,e.group.position.distanceTo(e.home));
    if(!g.canOccupy(e.group.position.x,e.group.position.z,.45))invalid++;
    if([0,23,119,seconds*120-1].includes(i))trace.push({t:(i+1)/120,position:e.group.position.toArray(),distance,visible:e.visible});
   }
   rows.push({kind,type,x,initial,trace,minDistance,minHome,invalid,pathQueries:g.navigation.queries-queries});
  }
  for(const type of ['warden','sentinel','stalker'])for(const x of [24.35,24.45,24.58])fixture('spacing',type,x);
  for(const type of ['warden','sentinel','stalker'])for(const kind of ['approach','hidden','return'])fixture(kind,type);
  return rows;
 });
 await writeFile(process.env.SPACING_OBSERVATIONS||'docs/quality-reviews/build42-spacing-after.json',JSON.stringify({method:'Arranged explicit-test-URL fixtures using real receiver cabinet, collisions, perception, navigation, steering and actual enemy updates. Firing suppressed by cooldown100; playerhealth10000 prevents fixture termination. Not an ordinary combat or enjoyment rating.',rows,errors},null,2)+'\n');
 assert.deepEqual(errors,[]);
 for(const r of rows){
  assert.ok(r.initial.canEnemy&&r.initial.canPlayer,JSON.stringify(r));assert.equal(r.invalid,0,JSON.stringify(r));assert.equal(r.initial.direct,false,JSON.stringify(r));
  if(r.kind==='spacing'){
   assert.equal(r.initial.visible,true);assert.ok(r.minDistance>=r.initial.distance-1e-6,JSON.stringify(r));
   if(r.type==='sentinel')assert.ok(r.trace.at(-1).distance<6.3,JSON.stringify(r));
   else assert.ok(r.trace.at(-1).distance>=4.99&&r.trace.at(-1).distance<5.1,JSON.stringify(r));
   assert.equal(r.pathQueries,0,'Visible standoff/retreat must not request a ground route toward the player');
  }else{
   assert.ok(r.pathQueries>0,JSON.stringify(r));
   if(r.kind==='hidden')assert.equal(r.initial.visible,false);
   if(r.kind==='return')assert.ok(r.minHome<1,JSON.stringify(r));
   else assert.ok(r.minDistance<r.initial.distance-3,JSON.stringify(r));
  }
 }
 console.log(`Ranged spacing, visible/hidden pursuit and guard return: ${rows.length} actual-world fixtures passed`);
}finally{await browser.close();}
