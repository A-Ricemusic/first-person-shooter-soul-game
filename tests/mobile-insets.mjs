import {chromium} from '@playwright/test';
import {mobileTouch} from '../tools/mobile-touch.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.MOBILE_URL||'http://127.0.0.1:5173/',prefix=process.env.MOBILE_INSET_PREFIX||'build75-insets';
const report={method:'Engineering simulation of44px top/side and21px bottom cutout insets in mobile Chromium. CSS substitutes viewport insets; native touches test actual hit targets. Not a physical-phone or Safari result.',profiles:[],errors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});mkdirSync(`docs/media/${prefix}`,{recursive:true});
try{for(const [width,height] of [[844,390],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3});page.on('pageerror',e=>report.errors.push(e.message));const t=await mobileTouch(page),row={viewport:[width,height]};report.profiles.push(row);
 await page.goto(base+'?test');await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});await t.tap('#deploy');
 await page.addStyleTag({content:'body.touch-mode{--touch-top:44px;--touch-left:44px;--touch-right:44px;--touch-bottom:21px}body.touch-mode .hud-top{top:44px;left:44px;right:44px}body.touch-mode #touch-map{top:44px;right:100px}'});
 const r=await page.locator('#pause-button').boundingBox();row.hitAtPauseCenter=await page.evaluate(r=>document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id,r);row.pauseRect=r;
 await t.tap('#pause-button');row.phase=await page.evaluate(()=>window.__SOULFALL__.game.phase);await page.screenshot({path:`docs/media/${prefix}/${width}x${height}.jpg`,type:'jpeg',quality:70});row.passed=row.phase==='paused';await page.close();
}report.passed=report.profiles.every(p=>p.passed)&&!report.errors.length;assert(report.passed,'native Pause must work below the simulated notch');}catch(e){report.failure=e.stack;process.exitCode=1}finally{await browser.close();writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
