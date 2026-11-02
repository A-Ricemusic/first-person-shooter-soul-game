import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {compassReadout} from '../src/compass.js';
const cases=[[0,'N','000'],[45,'NE','045'],[90,'E','090'],[135,'SE','135'],[180,'S','180'],[225,'SW','225'],[270,'W','270'],[315,'NW','315'],[22.49,'N','022'],[22.5,'NE','023'],[337.49,'NW','337'],[337.5,'N','338'],[359.6,'N','000'],[-90,'W','270'],[720,'N','000']],rows=[];
for(const [degrees,direction,heading]of cases){const value=compassReadout(degrees);assert.equal(value.direction,direction);assert.equal(value.heading,heading);rows.push({degrees,...value});}
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],rendered=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await p.click('#deploy',{force:true});
 mkdirSync('docs/media/build63-parent-compass',{recursive:true});
 for(const width of [1280,1440])for(const degrees of [0,90,180,270,359.8]){
  await p.setViewportSize({width,height:800});
  const row=await p.evaluate(degrees=>{const g=window.__SOULFALL__.game;g.yaw=-degrees*Math.PI/180;g.animate(0);g.emit();g.renderer.render(g.scene,g.camera);const el=document.querySelector('.bearing'),r=el.getBoundingClientRect();return{heading:document.querySelector('#heading').textContent,direction:document.querySelector('#compass-direction').textContent,aria:el.getAttribute('aria-label'),left:r.left,right:r.right,objectiveRight:document.querySelector('.hud-mission').getBoundingClientRect().right,pauseLeft:document.querySelector('#pause-button').getBoundingClientRect().left};},degrees);
  const expected=compassReadout(degrees);assert.equal(row.heading,expected.heading);assert.equal(row.direction,expected.direction);assert.equal(row.aria,expected.spoken);assert.ok(row.left>=row.objectiveRight&&row.right<=row.pauseLeft);
  rendered.push({width,degrees,...row});if(width===1280&&degrees<360)await p.screenshot({path:`docs/media/build63-parent-compass/${degrees}.jpg`,type:'jpeg',quality:80});
 }
 await p.setViewportSize({width:390,height:844});assert.equal(await p.locator('.bearing').isVisible(),false);assert.deepEqual(errors,[]);
 writeFileSync('docs/quality-reviews/build63-parent-compass.json',JSON.stringify({method:'Pure compass boundaries plus arranged actual yaw/renderer/DOM at two desktop sizes and existing mobile visibility. Not ordinary navigation or human-play evidence.',cases:rows,rendered,errors},null,2)+'\n');console.log(JSON.stringify({pureCases:rows.length,renderedViews:rendered.length,errors}));
}finally{await browser.close();}
