import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({...(existsSync(chrome)?{executablePath:chrome}:{}),headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50,timeout:60000});await page.locator('#deploy').click({force:true});
 const poses=[];
 for(const viewport of [{width:1280,height:800},{width:1440,height:900}]){
  await page.setViewportSize(viewport);
  for(const aiming of [false,true]){
   const pose=await page.evaluate(({aiming,viewport})=>{const g=window.__SOULFALL__.game;g.aim=aiming;g.animate(.5);g.updateEnemies(0);g.frame(1000+(aiming?1:0));const e=g.enemies[0];const optic=e.group.localToWorld(e.group.position.clone().set(0,2,.3)).project(g.camera);const p={x:(optic.x+1)*viewport.width/2,y:(1-optic.y)*viewport.height/2};const el=document.querySelector('#waypoints [data-marker-id="core-2"]')||[...document.querySelectorAll('.world-marker.core')].find(x=>x.textContent.includes('THE HEART'));const r=el.getBoundingClientRect();const opacity=Number(getComputedStyle(el).opacity);return {aiming,viewport,opacity,optic:p,marker:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},overlap:opacity>.1&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom};},{aiming,viewport});poses.push(pose);
  }
 }
 const phase=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.debug.advance(2.65);const e=g.enemies[0];const before={player:g.player.z,enemy:e.group.position.z,windup:e.windup};g.keys.add('KeyW');g.dash();for(let i=0;i<30;i++)g.update(1/120);g.keys.clear();g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);const forward=g.player.clone();g.camera.getWorldDirection(forward);return {before,breaks:g.phaseInterrupts,forwardDistance:e.group.position.clone().sub(g.player).dot(forward),cooldown:g.dashCooldown,invulnerability:g.invulnerable,armor:e.armorOpen,emitter:e.red.emissiveIntensity,health:e.health,maxHealth:e.maxHealth,player:g.player.z,enemy:e.group.position.z};});
 await page.screenshot({path:'docs/media/current-forward-break.png'});
 const markerRestore=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.aim=false;g.yaw=Math.PI/2;g.animate(0);g.onMarkers(g.captureMarkers());const el=document.querySelector('[data-marker-id="core-2"]');return Number(getComputedStyle(el).opacity)});
 assert.ok(markerRestore>.5,'Navigation marker returns outside aiming focus');
 const lateral=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.keys.add('KeyD');const before=g.player.clone();g.dash();for(let i=0;i<30;i++)g.update(1/120);g.keys.clear();return {distance:g.player.distanceTo(before),cooldown:g.dashCooldown,breaks:g.phaseInterrupts};});
 console.log(JSON.stringify({poses,phase,lateral},null,2));
 if(process.env.OBSERVE_ONLY==='1'){writeFileSync('docs/current-phase-usability-before.json',JSON.stringify({poses,phase,lateral,method:'Arranged controlled-frame browser reproductions of actual opening. Not a human playtest.'},null,2)+'\n');}
 else {
  assert.ok(poses.every(p=>!p.overlap),'Objective labels must not cover the opening optic in hip/ADS at either desktop size');checks.push({name:'Objective labels fade out of target focus in hip and ADS at both desktop sizes',poses});
  assert.equal(phase.breaks,1);assert.ok(phase.forwardDistance>1,'Forward phase break keeps interrupted enemy ahead');assert.ok(phase.cooldown>4&&phase.cooldown<4.5);assert.ok(phase.invulnerability>0&&phase.invulnerability<.4);assert.equal(phase.health,phase.maxHealth);assert.ok(phase.armor>2.5);assert.ok(phase.emitter<=1.5);checks.push({name:'Forward phase break brakes without auto-aim, damage, cooldown reset or extra protection',phase});
  assert.ok(lateral.distance>5.5);assert.equal(lateral.breaks,0);checks.push({name:'Ordinary lateral phase retains its travel distance and navigation returns outside target focus',lateral,markerRestore});
  writeFileSync('docs/current-phase-usability-regressions.json',JSON.stringify({timestamp:new Date().toISOString(),checks,limitations:'Controlled browser frames and explicit opening setup; these regressions do not establish blind human usability or enjoyment.'},null,2)+'\n');await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.aim=true;g.animate(.5);g.frame(2000)});await page.screenshot({path:'docs/media/current-phase-ui.png'});
 }
}finally{await browser.close()}
