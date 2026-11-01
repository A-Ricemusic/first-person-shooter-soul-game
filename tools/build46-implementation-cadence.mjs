// Arranged baseline attack timing observation, not ordinary play or a balance verdict.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await page.click('#deploy',{force:true});
 const observation=await page.evaluate(async actorCount=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js');
  g.clearRun();M.resetCustodian(g);g.player.set(7.8,1.7,20);g.health=1000000;g.shield=0;g.cores=3;g.coreNodes.forEach(n=>n.collected=true);g.encounters=new Set(['ingress','medical','engineering','heart']);g.custodian.active=true;g.custodian.cooldown=0;
  g.spawnEnemy(new T.Vector3(0,0,15),'sentinel');g.spawnEnemy(new T.Vector3(15.5,0,19.6),'stalker');if(actorCount===4){g.spawnEnemy(new T.Vector3(2,0,15),'sentinel');g.spawnEnemy(new T.Vector3(16,0,20),'stalker');}g.enemies.forEach(e=>e.cooldown=0);
  const setup=g.enemies.map(e=>({type:e.type,position:e.group.position.toArray(),lineOfSight:g.hasLineOfSight(e.group.position.clone().add(new T.Vector3(0,1.3,0)),g.player)}));
  const events=[],born=new WeakSet();let simultaneousFrames=0,regularStartsDuringBoss=0,maxProjectiles=0;
  const fire=g.enemyFire.bind(g);g.enemyFire=e=>{events.push({time:g.runTime,event:'patrol-fire',type:e.type,bossWindup:g.custodian.windup});return fire(e)};
  Math.random=()=>.5;
  for(let i=0;i<1440;i++){
   const previous=new Map(g.enemies.map(e=>[e,e.windup])),oldBoss=g.custodian.windup;
   g.update(1/120);
   if(g.custodian.windup>0&&g.enemies.some(e=>e.windup>0))simultaneousFrames++;
   if(oldBoss<=0&&g.custodian.windup>0)events.push({time:g.runTime,event:'boss-charge-start',patrolCharging:g.enemies.filter(e=>e.windup>0).map(e=>e.type)});
   for(const e of g.enemies)if(previous.get(e)<=0&&e.windup>0){events.push({time:g.runTime,event:'patrol-charge-start',type:e.type,bossWindup:g.custodian.windup});if(g.custodian.windup>0)regularStartsDuringBoss++;}
   for(const p of g.projectiles)if(!born.has(p)){born.add(p);if(p.custodianCoil)events.push({time:g.runTime,event:'boss-lane-fired',patrolCharging:g.enemies.filter(e=>e.windup>0).map(e=>e.type)});}
   maxProjectiles=Math.max(maxProjectiles,g.projectiles.length);
  }
  return {setup,simulatedSeconds:12,simultaneousChargeSeconds:simultaneousFrames/120,regularStartsDuringBoss,maxProjectiles,events};
 },Number(process.env.CADENCE_ACTORS||2));
 assert.equal(observation.simultaneousChargeSeconds,0,'boss waits for committed patrol drain');assert.equal(observation.regularStartsDuringBoss,0,'no patrol admitted in boss windup');
 if(errors.length)throw Error(JSON.stringify(errors));
 const result={code:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),method:'Arranged real world/AI/projectile simulation at 120Hz for12s, two or four arranged hunters (see setup) and full-health boss, fixed random .5, inflated player health solely to retain a complete timing trace. No claim of ordinary play, human enjoyment or representative balance.',...observation,errors};
 writeFileSync(process.env.CADENCE_OUTPUT||'docs/quality-reviews/build46-implementation-cadence.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,events:result.events.slice(0,12)},null,2));
}finally{await browser.close()}
