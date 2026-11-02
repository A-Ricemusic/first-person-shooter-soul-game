import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),rows=[],checks=[],dt=1/120;
  const setup=(type='sentinel',role='hunter',difficulty='standard')=>{g.options.difficulty=difficulty;g.restart();g.clearRun();g.player.set(0,1.7,23);g.health=10000;g.audio.setActive(false);g.spawnEnemy(new T.Vector3(0,0,15),type,0,role);const e=g.enemies[0];e.cooldown=0;if(role==='guard'){e.home.set(3,0,13);e.duty='return';}return e;};
  for(const difficulty of ['story','standard','veteran'])for(const role of ['hunter','guard']){
   const e=setup('sentinel',role,difficulty),shots=[],fire=g.enemyFire.bind(g);g.enemyFire=enemy=>{shots.push({at:g.runTime,damage:19,locked:enemy.target.toArray()});fire(enemy);};let plantedDrift=0,mobileDistance=0,plantedTicks=0;
   for(let i=0;i<6/dt;i++){const p=e.group.position.clone(),plantBefore=e.windup>0||(e.fireRecovery||0)>0;g.runTime+=dt;g.updateEnemies(dt);const planted=plantBefore||e.windup>0||(e.fireRecovery||0)>0;if(planted){plantedTicks++;plantedDrift=Math.max(plantedDrift,p.distanceTo(e.group.position));}else mobileDistance+=p.distanceTo(e.group.position);g.updateProjectiles(dt);}
   g.enemyFire=fire;rows.push({difficulty,role,plantedDrift,mobileDistance,plantedTicks,shots,health:g.health,shield:g.shield});
  }
  // Other roles retain their existing charge locomotion; no global actor freeze.
  for(const type of ['stalker','warden']){const e=setup(type);let motion=0;for(let i=0;i<20;i++){const p=e.group.position.clone();g.runTime+=dt;g.updateEnemies(dt);motion+=p.distanceTo(e.group.position);}checks.push({label:type+' remains mobile while charging',passed:motion>0,motion});}
  let e=setup();g.updateEnemies(0);const target=e.target.clone();g.player.x=1;for(let i=0;i<80;i++){g.runTime+=dt;g.updateEnemies(dt);}checks.push({label:'Sentinel locked target is not updated by lateral player movement',passed:e.target.equals(target)});
  e=setup();g.updateEnemies(0);for(let i=0;i<80;i++){g.runTime+=dt;g.updateEnemies(dt);}const recovery=e.fireRecovery;g.phase='paused';g.update(1);const paused=e.fireRecovery;g.phase='planning';g.update(1);checks.push({label:'Pause and planning preserve remaining fire recovery',passed:recovery>0&&paused===recovery&&e.fireRecovery===recovery,recovery,paused});g.phase='playing';
  g.clearRun();g.spawnEnemy(new T.Vector3(0,0,15),'sentinel');checks.push({label:'New run actors start without stale recovery',passed:g.enemies[0].fireRecovery===0});
  e=setup();g.updateEnemies(0);g.dashTime=.1;g.dashVector.set(0,0,-1);g.player.z=19;g.updatePhaseInterrupts();checks.push({label:'Phase still cancels close Sentinel charge',passed:e.windup===0&&e.stagger===.8});g.dashTime=0;
  e=setup();e.windup=.001;e.target.copy(g.player);g.updateEnemies(.01);const projectiles=g.projectiles.length,shield=g.shield;g.updateProjectiles(.6);checks.push({label:'Committed projectile remains dangerous during planted recovery',passed:projectiles===1&&g.shield<shield,shieldBefore:shield,shieldAfter:g.shield});
  e=setup();e.windup=.001;e.target.copy(g.player);g.updateEnemies(.01);e.cooldown=0;const planted=e.group.position.clone();g.updateEnemies(.7);checks.push({label:'Long recovery boundary tick neither moves nor starts an unseen shot',passed:e.group.position.equals(planted)&&e.windup<=0&&e.fireRecovery===0});g.updateEnemies(.01);checks.push({label:'Next eligible tick can start another ordinary charge',passed:e.windup>0});
  e=setup();e.cooldown=100;e.lastAttack=g.runTime;const free=e.group.position.clone();g.updateEnemies(.1);checks.push({label:'Unrelated attack timestamp cannot replant a mobile Sentinel',passed:e.group.position.distanceTo(free)>0});
  const failed=[];for(const r of rows){if(r.plantedDrift>1e-9)failed.push(r.difficulty+'/'+r.role+' drifts during planted cycle');if(r.mobileDistance<.1)failed.push(r.difficulty+'/'+r.role+' fails to resume locomotion');if(r.shots.length<2)failed.push(r.difficulty+'/'+r.role+' stops firing');}
  for(const c of checks)if(!c.passed)failed.push(c.label);return {rows,checks,failed};
 });
 writeFileSync(process.env.SENTINEL_CYCLE_OUTPUT||'docs/quality-reviews/build65-parent-cycle.json',JSON.stringify({method:'Arranged actual game updates and projectile resolution at120Hz. High fixture health prevents termination, not ordinary survival/enjoyment. Roles/difficulties sampled, no human or performance claim.',...result,errors},null,2)+'\n');assert.deepEqual(result.failed,[]);assert.deepEqual(errors,[]);console.log('Sentinel planted firing/recovery, retained movement roles, target lock, pause and reset passed.');
}finally{await browser.close();}
