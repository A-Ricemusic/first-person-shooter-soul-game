import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[],observations=[];p.on('pageerror',e=>errors.push(e.message));
async function shot(name){await p.screenshot({path:`docs/media/build07-experience-${name}.png`});}
try{
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset&&window.__SOULFALL__.game.reloadCell);await shot('title');await p.click('#deploy');
 for(const key of ['KeyW','KeyA','KeyD','KeyW']){await p.keyboard.down(key);await p.waitForTimeout(1800);await p.keyboard.up(key);}
 await shot('normal-hip');await p.mouse.down({button:'right'});await p.waitForTimeout(400);await shot('normal-ads');await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();await p.mouse.up({button:'right'});await p.keyboard.press('KeyR');await p.waitForTimeout(700);await shot('normal-reload');await p.waitForTimeout(1100);await p.keyboard.press('ShiftLeft');await p.waitForTimeout(500);
 observations.push({normalControls:await p.evaluate(()=>window.__SOULFALL__.game.captureState())});
 // Separate safe presentation arrangements; not a mission completion.
 await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.debug.killAll();g.yaw=0;g.pitch=0;});await p.waitForTimeout(300);await shot('arranged-hip');
 await p.mouse.down({button:'right'});await p.waitForTimeout(450);await shot('arranged-ads');await p.mouse.up({button:'right'});await p.mouse.down();await p.waitForTimeout(300);await p.mouse.up();await p.keyboard.press('KeyR');await p.waitForTimeout(550);await shot('arranged-reload');
 observations.push({handling:await p.evaluate(()=>{const g=window.__SOULFALL__.game;return {reload:g.reloading,progress:1-g.reloadTimer/1.65,supportPosition:g.supportHand.position.toArray(),cellPosition:g.reloadCell.position.toArray(),bedSourceCount:g.audio.bedSources.length,ctx:g.audio.ctx.state}})});
 await p.waitForTimeout(1400);await p.keyboard.press('Escape');await p.waitForTimeout(100);observations.push({pauseAudio:await p.evaluate(()=>window.__SOULFALL__.game.audio.ctx.state)});await p.click('#open-archive');await shot('empty-archive');await p.locator('#archive-dialog [data-close]').last().click();await p.click('#resume');
 await p.evaluate(()=>{const g=window.__SOULFALL__.game;[0,1,2].forEach(i=>g.debug.collectCore(i));g.debug.killAll();g.debug.teleport(0,31)});await p.waitForFunction(()=>window.__SOULFALL__.game.phase==='won',{},{timeout:15000});await p.setViewportSize({width:1280,height:800});await shot('results');await p.click('#end-archive');await shot('results-archive');observations.push({archive:await p.locator('#archive-list').innerText(),overflow:await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 writeFileSync('docs/quality-reviews/build07-experience-observations.json',JSON.stringify({observations,errors,method:'Chrome real WebGL normal keyboard/mouse input then separately labeled arrangements; headless not human auditory or input-feel validation'},null,2));
}finally{await b.close()}
