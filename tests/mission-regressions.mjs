import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync,writeFileSync} from 'node:fs';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({...(existsSync(chrome)?{executablePath:chrome}:{}),headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(`${process.env.PLAYTEST_URL||'http://127.0.0.1:5173/'}?test=1`);await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});await page.click('#deploy');
 await page.waitForFunction(()=>{const marks=window.__SOULFALL__.game.captureMarkers().filter(m=>m.kind==='core'&&!m.doorway);return marks.length===3&&marks.every(m=>m.occluded?!document.querySelector(`[data-marker-id="${m.id}"]`):!!document.querySelector(`[data-marker-id="${m.id}"]`))});
 assert.ok(await page.locator('#field-controls').isVisible());assert.ok((await page.locator('#waypoints').innerText()).includes('WEST ARCHIVE'));checks.push({name:'Clear objective markers, blocked-signal notice and contextual controls are visible on deployment',status:'passed'});
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.killAll();g.debug.teleport(-24,-13.1);g.health=80;g.shield=0;g.lastDamage=g.runTime});
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.cores),0);
 await page.keyboard.down('KeyE');await page.waitForFunction(()=>window.__SOULFALL__.game.coreProgress>.15);assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.cores),0);await page.keyboard.up('KeyE');await page.waitForFunction(()=>window.__SOULFALL__.game.coreProgress===0);
 await page.keyboard.down('KeyE');await page.waitForFunction(()=>window.__SOULFALL__.game.cores===1);await page.keyboard.up('KeyE');assert.equal(await page.locator('#memory-person').innerText(),'MARA SOLBERG');
 const recovery=await page.evaluate(()=>{const g=window.__SOULFALL__.game;let restored=0;g.scene.traverse(o=>{if(o.userData.restored)restored++});return {health:g.health,shield:g.shield,restored}});assert.equal(recovery.health,100);assert.ok(recovery.shield>=35&&recovery.shield<40);assert.equal(recovery.restored,1);checks.push({name:'Recovery requires a held input, cancels on release, restores the site and displays its memory',status:'passed',observed:recovery});
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.collectCore(1);g.debug.collectCore(2);g.debug.killAll();g.debug.teleport(0,31)});
 await page.waitForFunction(()=>window.__SOULFALL__.game.extractionProgress>.3);
 assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.phase),'playing');assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.extractionWave),true);assert.ok(await page.locator('#extraction-panel').isVisible());
 await page.evaluate(()=>window.__SOULFALL__.game.debug.teleport(0,20));await page.waitForFunction(()=>window.__SOULFALL__.game.extractionProgress===0);assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.phase),'playing');
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.debug.killAll();g.debug.teleport(0,31)});await page.waitForFunction(()=>window.__SOULFALL__.game.phase==='won',null,{timeout:15000});checks.push({name:'Extraction is a contested timed hold, loses progress outside the zone, and completes after the six-second Operator uplink',status:'passed'});
 await page.click('#end-archive');assert.equal(await page.locator('#archive-list article').count(),3);assert.ok((await page.locator('#archive-list').innerText()).includes('MARA SOLBERG'));await page.locator('#archive-dialog [data-close]').last().click();checks.push({name:'Victory can reopen all recovered memories with full quotes',status:'passed'});
 await page.click('#play-again');await page.keyboard.press('Escape');await page.click('#pause-settings');await page.selectOption('#quality','low');assert.equal(await page.evaluate(()=>window.__SOULFALL__.game.renderer.shadowMap.enabled),false);await page.locator('#settings-dialog [data-close]').last().click();await page.click('#resume');
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;const e=g.enemies[0];e.group.position.copy(g.player).add({x:3,y:0,z:0});e.group.position.y=0;g.damage(10,e.group.position,e)});assert.ok(await page.locator('#damage-direction').evaluate(e=>e.classList.contains('visible')));checks.push({name:'Performance graphics disables shadows and incoming damage produces a directional cue',status:'passed'});
 console.log(JSON.stringify(checks,null,2));writeFileSync('docs/current-mission-regressions.json',JSON.stringify({timestamp:new Date().toISOString(),checks,limitations:'Targeted browser arrangements clear enemies and position player to isolate recovery/extraction rules. This is not an unassisted human mission.'},null,2)+'\n');
}finally{await browser.close()}
