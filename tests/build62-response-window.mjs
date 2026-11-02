import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {AttackCoordinator} from '../src/attack-coordinator.js';
const checks=[],samples=[];const ok=(v,label)=>{assert.ok(v,label);checks.push(label)};
for(const duration of [2.6,3])for(const step of [.01,1/60,.1,.25]){
 const c=new AttackCoordinator();c.resolve(duration);let elapsed=0,blocked=0,allPositiveBlocked=true;
 while(elapsed<duration+step*2){const old=c.recovery,b=c.advance(step,{alive:true,charging:false,ready:false});if(old>1e-9&&!b)allPositiveBlocked=false;if(b)blocked+=step;elapsed+=step;}
 ok(allPositiveBlocked,'positive response interval blocks fresh admission');ok(blocked+1e-8>=duration&&blocked<duration+step+1e-7,'response admission releases within one simulation tick of duration');samples.push({duration,step,blocked});
}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await p.click('#deploy',{force:true});
 const actual=await p.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),c=g.custodian,checks=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
  const setup=()=>{g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.cores=3;g.coreNodes.forEach(n=>n.collected=true);g.player.set(11,1.7,23);c.active=true;c.dead=false;c.coils.forEach(n=>n.target=g.player.clone());c.windup=.001;M.updateCustodian(g,.01);g.spawnEnemy(new T.Vector3(11,0,38),'sentinel');g.enemies[0].cooldown=0;return g.enemies[0];};
  let e=setup();const start=e.group.position.clone();ok(c.open===2.6&&c.coordination.recovery===2.6,'actual emitted volley starts matching2.6s response');ok(g.projectiles.length===3,'real boss volley still emits three dangerous lanes');
  for(let i=0;i<120;i++)g.update(.01);ok(c.open>1.39&&e.windup===0,'fresh patrol charge still waits past original0.8s boundary');ok(g.shield<60,'emitted boss projectiles still damage during response');ok(e.group.position.distanceTo(start)>.1,'patrol movement continues while fresh ranged admission waits');
  for(let i=0;i<139;i++)g.update(.01);ok(c.open>0&&e.windup===0,'fresh ranged admission waits through end of exposed window');for(let i=0;i<10;i++)g.update(.01);ok(c.open===0&&e.windup>0,'normal patrol charge resumes after exposed window');
  e=setup();e.windup=.001;e.target.copy(g.player);const before=g.projectiles.length;g.updateEnemies(.01);ok(g.projectiles.length===before+1,'already committed patrol charge still fires during response');
  e=setup();e.group.position.set(11,0,23.8);e.contactWindup=.001;const shield=g.shield;g.updateEnemies(.01);ok(g.shield===shield-15,'committed close discharge remains dangerous during response');
  setup();g.pause();const beforePause=c.coordination.recovery;g.update(2);ok(c.coordination.recovery===beforePause,'pause freezes response');g.resume();g.openPlanning();g.update(2);ok(c.coordination.recovery===beforePause,'planning freezes response');g.closePlanning();g.finish(false);g.update(2);ok(c.coordination.recovery===beforePause,'terminal phase cannot drain response');g.restart();ok(c.coordination.recovery===0&&!c.active,'restart clears response');
  setup();c.coils.forEach(n=>n.hp=0);c.coils[0].hp=1;M.hitCustodian(g,{object:c.coils[0].parts[0],point:c.coils[0].parts[0].getWorldPosition(new T.Vector3())});ok(c.dead&&c.coordination.recovery===0,'last coil defeat releases patrol scheduling immediately');
  g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.cores=3;g.coreNodes.forEach(n=>n.collected=true);c.active=true;g.player.set(9.35,1.7,18.3);c.coils.forEach(n=>n.target=g.player.clone());c.windup=1;g.dashTime=.1;g.dashVector.set(0,0,-1);M.updateCustodian(g,.01);ok(c.open===3&&c.coordination.recovery===3,'actual close phase break starts matching3s response');g.dashTime=0;
  g.spawnEnemy(new T.Vector3(9.35,0,33.3),'sentinel');e=g.enemies[0];e.cooldown=0;for(let i=0;i<299;i++)g.update(.01);ok(c.open>0&&e.windup===0,'phase response delays new patrol fire throughout3s opening');for(let i=0;i<10;i++)g.update(.01);ok(c.open===0&&e.windup>0,'patrol ranged starts resume after phase opening');
  return {checks};
 });
 checks.push(...actual.checks);assert.deepEqual(errors,[]);writeFileSync('docs/quality-reviews/build62-parent-response-window.json',JSON.stringify({method:'Arranged actual volley/phase/enemy/LOS/resources, real simulation steps and contact/projectile damage. Node admission interval samples. No ordinary-play or enjoyment claim.',checks,assertions:checks.length,samples,errors},null,2)+'\n');console.log(JSON.stringify({assertions:checks.length,errors}));
}finally{await browser.close();}
