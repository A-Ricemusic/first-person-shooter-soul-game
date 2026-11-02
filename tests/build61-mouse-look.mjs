import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await p.click('#deploy',{force:true});
 const rows=await p.evaluate(()=>{
  const g=window.__SOULFALL__.game,canvas=g.canvas,rows=[];
  const mouse=(type,button,buttons)=>canvas.dispatchEvent(new MouseEvent(type,{button,buttons,bubbles:true}));
  const look=()=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:100,movementY:0,bubbles:true}));
  const sample=(label,expectedDelta)=>{const before=g.yaw;look();rows.push({label,delta:g.yaw-before,expectedDelta,dragging:g.dragging,aim:g.aim,fire:g.mouseDown});};
  g.clearInput();g.phase='playing';
  sample('no button in fallback',0);
  mouse('mousedown',2,2);sample('aim held',-.125);
  mouse('mousedown',0,3);sample('aim and fire held',-.125);
  mouse('mouseup',0,2);sample('fire released, aim still held',-.125);
  mouse('mouseup',2,0);sample('both released',0);
  mouse('mousedown',0,1);mouse('mousedown',2,3);mouse('mouseup',2,1);sample('aim released, fire still held',-.2);
  mouse('mouseup',0,0);sample('last button released',0);
  mouse('mousedown',2,2);g.pause();sample('pause rejects look',0);g.resume();sample('resume requires fresh drag',0);
  mouse('mousedown',2,2);sample('fresh drag after resume',-.125);g.clearInput();sample('clear input ends drag',0);
  return rows;
 });
 await p.mouse.move(640,400);
 await p.mouse.down({button:'right'});await p.mouse.down({button:'left'});await p.mouse.up({button:'left'});
 let before=await p.evaluate(()=>window.__SOULFALL__.game.yaw);await p.mouse.move(740,400);
 rows.push(await p.evaluate(before=>{const g=window.__SOULFALL__.game;return{label:'native mouse: fire released with aim held',delta:g.yaw-before,expectedDelta:-.125,dragging:g.dragging,aim:g.aim,fire:g.mouseDown};},before));await p.mouse.up({button:'right'});
 await p.mouse.down({button:'left'});await p.mouse.down({button:'right'});await p.mouse.up({button:'right'});
 before=await p.evaluate(()=>window.__SOULFALL__.game.yaw);await p.mouse.move(840,400);
 rows.push(await p.evaluate(before=>{const g=window.__SOULFALL__.game;return{label:'native mouse: aim released with fire held',delta:g.yaw-before,expectedDelta:-.2,dragging:g.dragging,aim:g.aim,fire:g.mouseDown};},before));await p.mouse.up({button:'left'});
 const failed=rows.filter(r=>Math.abs(r.delta-r.expectedDelta)>1e-8);
 writeFileSync(process.env.LOOK_REGRESSION_OUTPUT||'docs/quality-reviews/build61-parent-mouse-look.json',JSON.stringify({method:'Arranged fallback mode with actual game DOM mouse events and native Playwright mouse-button sequences, real modifiers and pause/resume lifecycle. No hidden state drives an ordinary playthrough; this is a regression, not human play.',rows,failed,errors},null,2)+'\n');
 assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:rows.length,errors}));
}finally{await b.close();}
