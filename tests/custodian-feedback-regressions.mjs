import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js');
  const checks=[];const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label)};
  g.clearRun();const c=g.custodian;c.active=true;c.coils[0].hp=0;c.coils[2].hp=0;c.coils[1].target=g.player.clone().set(11,1.7,23);
  g.player.copy(c.coils[1].target);g.yaw=0;g.runTime=5;c.windup=.001;c.cooldown=0;
  M.updateCustodian(g,.01);
  ok(g.projectiles.length===1&&g.projectiles[0].attacker===c,'actual volley retains Custodian attacker identity');
  ok(c.lastAttack===5,'actual volley starts recent-fire clock');
  g.updateProjectiles(.6);
  ok(g.shield===47&&g.damageSource===c,'swept projectile hit applies unchanged damage and source');
  const base=g.captureState().damageDirection;ok(Number.isFinite(base),'real boss hit supplies directional cue');
  g.emit();ok(document.querySelector('#damage-direction').classList.contains('visible'),'directional cue reaches rendered HUD');
  g.yaw=.7;ok(Math.abs(g.captureState().damageDirection-base-.7)<1e-8,'cue follows camera rotation');
  ok(g.captureMarkers().find(m=>m.id==='custodian-focus')?.recent,'boss joins recent-fire threat hierarchy');
  const wall=new T.Box3(new T.Vector3(10,0,20),new T.Vector3(12,4,20.3));g.world.colliders.push(wall);
  ok(Math.abs(g.captureState().damageDirection-base-.7)<1e-8,'foreign cover cannot erase historical firing-origin cue');g.world.colliders.pop();
  g.phase='paused';ok(g.captureState().damageDirection===null,'pause hides cue');g.phase='planning';ok(g.captureState().damageDirection===null,'planning hides cue');g.phase='playing';
  g.runTime+=1.11;ok(g.captureState().damageDirection===null,'damage direction expires after existing 1.1s');
  g.runTime+=1.31;ok(!g.captureMarkers().find(m=>m.id==='custodian-focus')?.recent,'recent-fire emphasis expires after existing 2.4s');
  g.damage(1,c.coils[1].origin,c);c.dead=true;ok(Number.isFinite(g.captureState().damageDirection),'defeated device retains recent hit origin without live tracking');c.dead=false;
  g.damage(1);ok(g.captureState().damageDirection===null&&g.damageOrigin===null,'environmental damage clears attacker and origin');
  g.damage(1,c.coils[1].origin,c);g.restart();
  ok(g.damageSource===null&&g.damageOrigin===null&&c.lastAttack===-100,'restart clears boss feedback history');
  return {checks,shieldAfterProjectile:47};
 });
 assert.deepEqual(errors,[]);writeFileSync(process.env.CUSTODIAN_FEEDBACK_OUTPUT||'docs/quality-reviews/current-custodian-feedback.json',JSON.stringify({method:'Arranged real projectile collision and visible HUD state, separate from ordinary play.',...result,errors},null,2));console.log(result);
}finally{await browser.close()}
