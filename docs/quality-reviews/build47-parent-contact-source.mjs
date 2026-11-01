// Arranged baseline: isolate contact damage from ranged attacks. Not ordinary play.
import {chromium} from '@playwright/test';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await p.click('#deploy',{force:true});
 const observations=await p.evaluate(()=>{
  const g=window.__SOULFALL__.game,rows=[];
  for(const type of ['warden','sentinel','stalker']){
   g.clearRun();g.player.set(0,1.7,31);g.health=100;g.shield=60;g.invulnerable=0;g.phase='playing';g.spawnEnemy(g.player.clone().set(0,0,29.9),type);const e=g.enemies[0];e.cooldown=100;
   const before={shield:g.shield,weaponWindup:e.windup,contactCooldown:e.meleeCooldown||0};g.updateEnemies(0);
   rows.push({type,dt:0,eyeHeight:g.player.y,before,after:{shield:g.shield,weaponWindup:e.windup,contactCooldown:e.meleeCooldown,projectiles:g.projectiles.length,sourceRecognized:g.damageSource===e}});
  }
  g.clearRun();g.player.set(0,1.7,31);g.health=100;g.shield=60;g.invulnerable=0;g.spawnEnemy(g.player.clone().set(0,0,29.9),'sentinel');const e=g.enemies[0];e.windup=.001;e.target.copy(g.player);g.updateEnemies(.01);
  const rangedAndContactSameUpdate={dt:.01,shield:g.shield,projectiles:g.projectiles.length,remainingWeaponWindup:e.windup,contactCooldown:e.meleeCooldown};
  const retreatBoundary=[];
  for(const type of ['warden','sentinel','stalker']){
   g.clearRun();g.player.set(0,1.7,31);g.health=100;g.shield=60;g.invulnerable=0;g.spawnEnemy(g.player.clone().set(0,0,29.61),type);const actor=g.enemies[0];actor.cooldown=100;g.updateEnemies(.1);
   retreatBoundary.push({type,startDistance:1.39,dt:.1,resolvedDistance:Math.hypot(actor.group.position.x-g.player.x,actor.group.position.z-g.player.z),shield:g.shield,projectiles:g.projectiles.length});
  }
  return {isolated:rows,rangedAndContactSameUpdate,retreatBoundary};
 });
 if(errors.length)throw Error(JSON.stringify(errors));
 if(process.env.CONTACT_VERIFY_RANGE==='1'&&!observations.retreatBoundary.every(row=>row.resolvedDistance>1.4&&row.shield===60))throw Error('Out-of-range retreat must not apply contact damage: '+JSON.stringify(observations.retreatBoundary));
 writeFileSync(process.env.CONTACT_OUTPUT||'docs/quality-reviews/current-contact-range.json',JSON.stringify({baseCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gameSourceSha256:createHash('sha256').update(readFileSync('src/game.js')).digest('hex'),gameWorktreeStatus:execFileSync('git',['status','--porcelain','--','src/game.js'],{encoding:'utf8'}).trim(),method:'Arranged real Game.updateEnemies at grounded clear centre gap. Ranged cooldown100 isolates each type; then a separate already-committed sentinel shot is allowed to finish at point-blank range. No ordinary-play or reviewer damage-attribution claim.',observations,errors},null,2)+'\n');console.log(JSON.stringify(observations,null,2));
}finally{await browser.close()}
