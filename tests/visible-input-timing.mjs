import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {writeFileSync} from 'node:fs';
import {createBrowserInput,validateSteps} from '../tools/visible-input.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage();await page.setContent('<canvas id="game-canvas" tabindex="0"></canvas><pre id="events"></pre>');await page.locator('canvas').focus();
 await page.evaluate(()=>{
  const list=[];for(const kind of ['keydown','keyup','mousedown','mouseup','mousemove'])document.addEventListener(kind,e=>{list.push({kind,code:e.code,key:e.key,button:e.button,ctrl:e.ctrlKey,shift:e.shiftKey,x:e.movementX,y:e.movementY,at:performance.now(),trusted:e.isTrusted});document.querySelector('#events').textContent=JSON.stringify(list);});
 });
 const events=()=>page.locator('#events').innerText().then(x=>JSON.parse(x||'[]'));
 await page.keyboard.down('KeyW');await delay(150);await delay(800);await page.keyboard.up('KeyW');
 const native=await events(),nativeHold=native.find(e=>e.kind==='keyup').at-native.find(e=>e.kind==='keydown').at;
 const input=await page.evaluateHandle(createBrowserInput);
 const start=native.length,pending=input.evaluate((c,steps)=>c.run({steps}),[{type:'down',key:'KeyW'},{type:'wait',ms:150}]);
 await delay(950);const batch=await pending;const timed=(await events()).slice(start),browserHold=timed.find(e=>e.kind==='keyup').at-timed.find(e=>e.kind==='keydown').at;
 assert.ok(nativeHold>=900,`Injected legacy delay missing: ${nativeHold}`);assert.ok(browserHold<500&&nativeHold-browserHold>400,`Browser timing did not avoid Node delay: ${nativeHold}/${browserHold}`);
 assert.deepEqual(await input.evaluate(c=>c.held()),{keys:[],buttons:[]});
 const at=(await events()).length;
 await input.evaluate((c,steps)=>c.run({steps}),[{type:'down',key:'ControlLeft'},{type:'down',key:'KeyW'},{type:'look',x:12,y:-8},{type:'mouseDown',button:'right'},{type:'mouseDown',button:'left'},{type:'wait',ms:40}]);
 const chords=(await events()).slice(at);
 assert.ok(chords.some(e=>e.kind==='keydown'&&e.code==='KeyW'&&e.ctrl));assert.ok(chords.some(e=>e.kind==='mousemove'&&e.x===12&&e.y===-8));assert.equal(chords.filter(e=>e.kind==='mouseup').length,2);assert.deepEqual(await input.evaluate(c=>c.held()),{keys:[],buttons:[]});
 await input.evaluate(c=>c.run({steps:[{type:'down',key:'Tab'},{type:'mouseDown',button:'right'}],retainHeld:true}));
 assert.deepEqual(await input.evaluate(c=>c.held()),{keys:['Tab'],buttons:['right']});await input.evaluate(c=>c.release());assert.deepEqual(await input.evaluate(c=>c.held()),{keys:[],buttons:[]});
 const cancelStart=performance.now();
 const long=input.evaluate(c=>c.run({steps:[{type:'down',key:'KeyW'},{type:'wait',ms:10000}]})).then(()=>({resolved:true}),e=>({error:e.message}));await delay(80);await input.evaluate(c=>c.cancel());const canceled=await long;
 assert.match(canceled.error,/canceled/);assert.ok(performance.now()-cancelStart<2000);assert.deepEqual(await input.evaluate(c=>c.held()),{keys:[],buttons:[]});
 await input.evaluate(c=>c.run({steps:[{type:'press',key:'Space'}]}));
 await input.evaluate(c=>c.run({steps:[{type:'press',key:'Digit1'},{type:'press',key:'Digit2'}]}));
 const digits=(await events()).filter(e=>e.code?.startsWith('Digit'));assert.deepEqual(digits.map(e=>e.key),['1','1','2','2']);validateSteps([{type:'press',key:'Digit2'}]);
 const prior=(await events()).length;assert.throws(()=>validateSteps([{type:'down',key:'KeyW'},{type:'wait',ms:-1}]),/Wait must/);assert.equal((await events()).length,prior);
 writeFileSync(process.env.INPUT_TIMING_OUTPUT||'docs/quality-reviews/current-input-timing.json',JSON.stringify({method:'Actual Chrome DOM-event fixture. Artificial Node handover delay, not a measurement of game FPS or historical reviewer latency. Browser controls are synthetic events; no game state/clock is read.',nativeHoldMs:nativeHold,browserHoldMs:browserHold,batch,chordEvents:chords,canceled,checks:['Default release before browser batch returns','Node handover gap cannot extend completed browser hold','Ctrl/game key/relative look/button event semantics','Opt-in held controls and explicit release','Cancel wakes long wait and clears input; controller reusable','Invalid batch rejected before any event']},null,2)+'\n');
 console.log({nativeHoldMs:nativeHold,browserHoldMs:browserHold,checks:6});
}finally{await browser.close()}
