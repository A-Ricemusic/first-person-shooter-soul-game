import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:5173/';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({...(existsSync(chrome)?{executablePath:chrome}:{}),headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[];
try {
 const page=await browser.newPage();
 // Control frame timestamps to reproduce low-frame-rate input without relying on CPU load.
 await page.addInitScript(()=>{window.requestAnimationFrame=callback=>(window.__nextFrame=callback,1);window.cancelAnimationFrame=()=>{}});
 await page.goto(`${base}?test=1`);await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});await page.locator('#deploy').click({force:true});
 const timing=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.frame(1000);g.keys.add('KeyW');const z=g.player.z,t=g.runTime;g.frame(1100);g.keys.clear();return {simulationDelta:g.runTime-t,distance:z-g.player.z}});
 assert.ok(Math.abs(timing.simulationDelta-.1)<1e-8);assert.ok(Math.abs(timing.distance-.55)<1e-6);checks.push({name:'10 FPS movement and mission time follow elapsed time',observed:timing,status:'passed'});
 const shot=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.clearInput();g.player.copy(g.world.playerSpawn);g.yaw=0;g.pitch=0;g.recoil=0;g.animate(0);const e=g.enemies[0];e.group.position.set(10,0,31);const before=e.health;document.dispatchEvent(new MouseEvent('mousemove',{movementX:Math.PI/2/.002,bubbles:true}));g.canvas.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));g.frame(1117);g.clearInput();return {before,after:e.health,ammo:g.ammo}});
 assert.equal(shot.ammo,29);assert.ok(shot.after<shot.before);checks.push({name:'Turn and fire in the same frame uses current aim',observed:shot,status:'passed'});
 const flash=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.mouseDown=true;g.frame(1217);g.clearInput();return {ammo:g.ammo,visible:g.muzzle.visible}});
 assert.equal(flash.ammo,28);assert.equal(flash.visible,true);checks.push({name:'A shot on a 100 ms frame retains a visible muzzle flash',observed:flash,status:'passed'});
 const cover=await page.evaluate(()=>{const g=window.__SOULFALL__.game;const results=[];for(const z of [-16,-16.05,-16.1,-16.15,-16.2]){g.health=100;g.shield=60;g.player.set(0,1.7,-3);g.enemyFire({group:{position:g.player.clone().set(0,0,z)},target:g.player.clone(),type:'sentinel'});for(let i=0;i<250&&g.projectiles.length;i++)g.updateProjectiles(1/60);results.push({originZ:z,shield:g.shield})}return results});
 assert.ok(cover.every(r=>r.shield===60));checks.push({name:'All five origin offsets blocked by real central concrete',observed:cover,status:'passed'});
 const open=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.player.set(12,1.7,-3);g.shield=60;g.enemyFire({group:{position:g.player.clone().set(12,0,-16.05)},target:g.player.clone(),type:'sentinel'});for(let i=0;i<250&&g.projectiles.length;i++)g.updateProjectiles(1/60);return g.shield});
 assert.equal(open,41);checks.push({name:'Unobstructed enemy projectile still damages player',observed:{shield:open},status:'passed'});
 const reset=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.aim=true;g.aimBlend=1;g.camera.fov=56;g.recoil=.1;g.kick=1;g.flashTimer=.04;g.muzzle.visible=true;g.flashLight.intensity=5;g.restart();return {aim:g.aim,blend:g.aimBlend,fov:g.camera.fov,recoil:g.recoil,kick:g.kick,muzzle:g.muzzle.visible,flash:g.flashTimer,light:g.flashLight.intensity}});
 assert.deepEqual(reset,{aim:false,blend:0,fov:75,recoil:0,kick:0,muzzle:false,flash:0,light:0});checks.push({name:'Restart clears ADS, recoil and muzzle flash immediately',observed:reset,status:'passed'});
 console.log(JSON.stringify(checks,null,2));writeFileSync('docs/combat-regressions.json',JSON.stringify({timestamp:new Date().toISOString(),checks,limitations:'Deterministic browser reproductions with controlled frame timestamps and arranged encounters. Not a human playtest or performance benchmark.'},null,2)+'\n');
}finally{await browser.close()}
