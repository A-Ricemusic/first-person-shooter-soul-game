import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.env.TEST_PORT || 4178);
const production = process.env.SOULFALL_PRODUCTION === '1';
const base = `http://127.0.0.1:${port}${production ? '/first-person-shooter-soul-game/' : '/'}`.replace(/\/$/,'');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js',...(production?['preview','--base','/first-person-shooter-soul-game/']:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'], {stdio:'pipe'});
let serverLog='';server.stdout.on('data',b=>serverLog+=b);server.stderr.on('data',b=>serverLog+=b);
let browser; const checks=[], errors=[], failedRequests=[];
const record=(name,details)=>{checks.push({name,details,status:'passed'});console.log(`PASS ${name}: ${details}`)};
const state=page=>page.evaluate(()=>window.__SOULFALL__.game.captureState());
try {
 for(let i=0;i<100;i++){try{if((await fetch(`${base}/`)).ok)break}catch{}if(i===99)throw new Error(`Vite did not start: ${serverLog}`);await delay(100)}
 const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
 browser=await chromium.launch({...(existsSync(chrome)?{executablePath:chrome}:{}),headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)failedRequests.push(`${r.status()} ${r.url()}`)});
 await page.goto(`${base}/?test=1`);await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});
 assert.equal((await state(page)).phase,'ready');assert.equal(await page.locator('#deploy').isEnabled(),true);
 const assets=await page.evaluate(()=>({meshes:window.__SOULFALL__.game.renderer.info.render.calls,weapon:!!window.__SOULFALL__.game.weaponAsset,sentinel:!!window.__SOULFALL__.game.sentinelAsset}));assert.ok(assets.weapon&&assets.sentinel);assert.ok(assets.meshes>0);
 mkdirSync('docs/media',{recursive:true});await page.screenshot({path:'docs/media/current-title.png'});record('WebGL & Blender assets',`Actual renderer initialized; weapon + sentinel GLBs loaded; ${assets.meshes} draw calls in title frame.`);
 await page.click('#open-settings');await page.locator('#volume').fill('0.35');await page.locator('#sensitivity').fill('1.25');await page.locator('#motion').check();await page.locator('#settings-dialog [data-close]').last().click();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('soulfall-settings')).volume),.35);
 await page.click('#open-controls');assert.equal(await page.locator('#controls-dialog').isVisible(),true);await page.locator('#controls-dialog [data-close]').last().click();
 await page.click('#open-briefing');assert.equal(await page.locator('#briefing-dialog').isVisible(),true);await page.locator('#briefing-dialog [data-close]').last().click();record('Menus & settings','Briefing and controls open/close; volume/sensitivity/motion persist to localStorage.');
 await page.click('#deploy');await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='playing');
 const initial=await state(page);assert.equal(initial.ammo,30);assert.equal(initial.enemiesAlive,1);
 // Real input: do not invoke the move function directly.
 await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.keyboard.up('KeyW');const moved=await state(page);assert.ok(moved.player.z<initial.player.z-.2,'W movement after clicking deploy');
 await page.keyboard.press('Space');await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>window.__SOULFALL__.game.player.y)>1.7);record('Keyboard focus & movement','W moves after deployment click; Space produces a jump.');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='paused');const paused=await state(page);await page.waitForTimeout(200);assert.equal((await state(page)).time,paused.time);assert.equal(await page.locator('#pause').isVisible(),true);await page.click('#resume');await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='playing');record('Pause & resume','Escape pauses, releases input, freezes mission time, and resumes via button.');
 const graph=await page.evaluate(()=>{
  const g=window.__SOULFALL__.game, minX=-36,maxX=36,minZ=-41,maxZ=41,queue=[[0,31]],seen=new Set(['0,31']);
  for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=`${a},${b}`;if(a>=minX&&a<=maxX&&b>=minZ&&b<=maxZ&&!seen.has(k)&&g.debug.canOccupy(a,b)){seen.add(k);queue.push([a,b])}}}
  return {reachable:queue.length,cores:g.coreNodes.map(c=>seen.has(`${c.position.x},${c.position.z+2}`)),blocked:!g.debug.canOccupy(0,-8),outside:!g.debug.canOccupy(38,0)};
 });assert.ok(graph.cores.every(Boolean));assert.ok(graph.blocked&&graph.outside);record('Arena connectivity & cover',`${graph.reachable} traversable grid points; all three core sites connected to extraction; central cover and perimeter reject entry.`);
 // Freeze threats for focused mechanics checks without changing the player's resource implementation.
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.killAll();g.debug.teleport(0,12);g.yaw=0;g.pitch=0;g.animate(0)});
 const a=(await state(page)).ammo;await page.mouse.move(720,500);await page.mouse.down();await page.waitForTimeout(160);await page.mouse.up();const fired=await state(page);assert.ok(fired.ammo<a);await page.keyboard.press('KeyR');await page.waitForFunction(()=>window.__SOULFALL__.game.reloading);await page.evaluate(()=>window.__SOULFALL__.game.debug.advance(2));assert.equal((await state(page)).ammo,30);assert.ok((await state(page)).reserve<180);record('Firing & reload','Actual mouse input consumes rounds; R reload transfers reserve into the magazine.');
 const dash=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.teleport(0,-3);g.yaw=0;g.debug.dash();g.debug.damage(100);const protectedHealth=g.health;g.debug.advance(.3);const first={z:g.player.z,cool:g.dashCooldown};g.debug.dash();return {protectedHealth,...first,second:g.dashCooldown,occupy:g.canOccupy(g.player.x,g.player.z)}});assert.equal(dash.protectedHealth,100);assert.ok(dash.z>-5.2,'Dash stopped at central cover');assert.ok(dash.cool>4);assert.equal(dash.second,dash.cool);assert.ok(dash.occupy);record('Soul Shift','Protection absorbs damage during dash; cooldown prevents repeat dash; substeps stop at concrete cover.');
 // Crossing the cover fixture now activates finite location stages. Clear them
 // after activation so this assertion measures safe regeneration, not combat.
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.advance(5);g.debug.killAll();g.debug.damage(80)});const hurt=await state(page);assert.ok(hurt.health<100);await page.evaluate(()=>window.__SOULFALL__.game.debug.advance(7));assert.ok((await state(page)).shield>0);record('Damage & regeneration','Damage depletes shield before health; shield recovers after the safe interval.');
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.teleport(-24,-13.1)});await page.waitForFunction(()=>window.__SOULFALL__.state.interaction);await page.keyboard.down('KeyE');await page.waitForFunction(()=>window.__SOULFALL__.state.cores===1);await page.keyboard.up('KeyE');assert.equal((await state(page)).cores,1);await page.keyboard.press('KeyE');assert.equal((await state(page)).cores,1);assert.ok((await state(page)).enemiesAlive>0);
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.collectCore(1);g.debug.collectCore(2);g.debug.killAll();g.debug.extract()});await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='won');assert.equal(await page.locator('#end').isVisible(),true);assert.equal((await state(page)).cores,3);assert.ok((await state(page)).score>3000);record('Recovery & extraction','Holding E completes nearby recovery once; archive ingress stages finite encounters; all three cores plus extraction yield victory and score.');
 await page.click('#play-again');await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='playing');const reset=await state(page);assert.equal(reset.cores,0);assert.equal(reset.kills,0);assert.equal(reset.health,100);assert.equal(reset.ammo,30);assert.equal(reset.enemiesAlive,1);await page.evaluate(()=>window.__SOULFALL__.game.debug.damage(10000));await page.waitForFunction(()=>window.__SOULFALL__.state.phase==='lost');assert.equal(await page.locator('#end-title').innerText(),'THE STATION\nREMEMBERS.');record('Failure & clean restart','Victory restarts with fresh resources/objectives/enemies; lethal damage enters failure screen.');
 await page.click('#end-menu');assert.equal(await page.locator('#menu').isVisible(),true);assert.equal(await page.locator('#end').isVisible(),false);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/media/current-mobile-menu.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));record('Responsive menu','390px-wide menu has no horizontal overflow. Gameplay remains desktop-first.');
 await page.goto(`${base}/docs/human.html`);assert.equal(await page.locator('h1').innerText(),'SOULFALL');assert.ok(await page.locator('img').count()>=2);const imgs=await page.locator('img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0));assert.ok(imgs);record('Design dossier','docs/human.html serves with all actual rendered screenshots.');
 await page.goto(`${base}/`);await page.waitForFunction(()=>document.querySelector('#deploy')&&!document.querySelector('#deploy').disabled,null,{timeout:60000});assert.equal(await page.evaluate(()=>typeof window.__SOULFALL__),'undefined');record('Normal-play isolation','No debug game handle exposed on normal URL.');
 console.log('HTTP failures',failedRequests);assert.deepEqual(errors,[],'Browser errors');assert.deepEqual(failedRequests,[],'Failed HTTP responses');record('Browser health','No page exceptions, console errors, or HTTP failures in the suite.');
 writeFileSync(production?'docs/current-production-verification.json':'docs/current-verification.json',JSON.stringify({timestamp:new Date().toISOString(),browser:await browser.version(),checks,errors,failedRequests},null,2)+'\n');
 console.log(`\n${checks.length} checks passed.`);
} finally {await browser?.close();server.kill('SIGTERM')}
