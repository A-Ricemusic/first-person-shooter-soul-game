import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {mobileTouch} from '../tools/mobile-touch.mjs';

const prefix=process.env.MOBILE_UI_PREFIX||'build74-usability';
const base=process.env.MOBILE_URL||'http://127.0.0.1:5173/';
const report={method:'Mobile Chromium emulation, native touch. Tests inspect visible DOM/storage and count hidden-canvas drawing. Only the end-state fixture uses a privileged finish call; no mission victory is implied.',profiles:[],errors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
mkdirSync(`docs/media/${prefix}`,{recursive:true});
try{
 for(const [width,height] of [[844,390],[390,844],[667,375],[915,412]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  await context.addInitScript(()=>{window.radarPaints=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...a){if(this.canvas.id==='radar')window.radarPaints++;return clear.apply(this,a)};});
  const page=await context.newPage(),touch=await mobileTouch(page),row={viewport:[width,height],checks:[],failures:[]};report.profiles.push(row);
  page.on('pageerror',e=>report.errors.push(e.message));
  const rect=async selector=>{const r=await page.locator(selector).boundingBox();assert(r&&r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,`${selector} must be entirely in the viewport, without automatic scrolling: ${JSON.stringify(r)}`);return r};
  const tap=async selector=>{const r=await rect(selector);await touch.down(1,r.x+r.width/2,r.y+r.height/2);await page.waitForTimeout(60);await touch.up(1);await page.waitForTimeout(100)};
  const check=async(name,fn)=>{try{await fn();row.checks.push(name)}catch(e){row.failures.push({name,error:e.message});await touch.clear()}};
  await page.goto(base+'?test');await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});await touch.tap('#deploy');
  await check('hidden mobile radar is not painted',async()=>{await page.waitForTimeout(350);row.radarPaints=await page.evaluate(()=>window.radarPaints);assert.equal(row.radarPaints,0)});
  await touch.tap('#touch-map');
  await check('map close and route buttons fit without helper scroll',async()=>{await rect('#close-map');for(const b of await page.locator('#route-selection button').all()){const r=await b.boundingBox();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=width+1&&r.y+r.height<=height+1,'route button outside viewport')}await page.screenshot({path:`docs/media/${prefix}/${width}x${height}-map.jpg`,type:'jpeg',quality:70});await tap('#close-map');assert(await page.locator('#touch-controls').isVisible())});
  // Reset only the fixture if a broken map prevents ordinary closure.
  if(await page.locator('#facility-map').isVisible()){await page.reload();await page.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});await touch.tap('#deploy')}
  await page.evaluate(()=>window.__SOULFALL__.game.finish(false));
  await check('fresh restart action fits on the initial loss screen',async()=>{await rect('#play-again');await page.screenshot({path:`docs/media/${prefix}/${width}x${height}-loss.jpg`,type:'jpeg',quality:70});await tap('#play-again');assert(await page.locator('#touch-controls').isVisible())});
  await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.earnAnchor();g.finish(false)});
  await check('earned retry anchor is reachable without scrolling',async()=>{await rect('#retry-anchor');await tap('#retry-anchor');assert(await page.locator('#touch-controls').isVisible())});
  // Native dialog swipes; never scrollIntoView or DOM scrolling to rescue an inaccessible target.
  await page.goto(base);await page.waitForFunction(()=>!document.querySelector('#deploy').disabled,null,{timeout:60000});await touch.tap('#open-settings');
  await check('touch sensitivity survives Apply & Close and page reload',async()=>{
   const reach=async selector=>{for(let i=0;i<10;i++){const r=await page.locator(selector).boundingBox(),d=await page.locator('#settings-dialog').boundingBox();if(r&&r.y>=Math.max(0,d.y)&&r.y+r.height<=Math.min(height,d.y+d.height)){const exposed=await page.evaluate(({selector,r})=>{const e=document.querySelector(selector);return [.28,.5].every(f=>{const hit=document.elementFromPoint(r.x+r.width*f,r.y+r.height/2);return hit===e||e.contains(hit)})},{selector,r});if(exposed)return r;}await touch.down(1,width*.6,height*.72);for(let j=1;j<=8;j++){await touch.move(1,width*.6,height*(.72-.04*j));await page.waitForTimeout(16)}await touch.up(1);await page.waitForTimeout(120)}throw Error('Native swipe could not reach '+selector)};
   const r=await reach('#touch-sensitivity');await touch.down(1,r.x+r.width*.5,r.y+r.height/2);await touch.move(1,r.x+r.width*.28,r.y+r.height/2);await touch.up(1);await page.waitForTimeout(100);const value=Number(await page.locator('#touch-sensitivity').inputValue());assert(Math.abs(value-1)>.1,'native slider must change sensitivity');await reach('#settings-dialog .primary-button');await tap('#settings-dialog .primary-button');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('soulfall-settings')).touchSensitivity);assert.equal(saved,value,'Apply & Close must retain touch sensitivity');await page.reload();await page.waitForFunction(()=>!document.querySelector('#deploy').disabled,null,{timeout:60000});assert.equal(Number(await page.locator('#touch-sensitivity').inputValue()),value,'reload must restore touch sensitivity');row.sensitivity=value;
  });
  await context.close();
 }
 report.passed=report.profiles.every(p=>!p.failures.length)&&!report.errors.length;if(!report.passed)process.exitCode=1;
}finally{await browser.close();writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))}
