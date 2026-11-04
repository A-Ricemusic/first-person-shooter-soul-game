import {chromium} from '@playwright/test';
import {mobileTouch} from '../tools/mobile-touch.mjs';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const prefix=process.env.MOBILE_RESULT_PREFIX||'build89-result-touch',base=process.env.MOBILE_URL||'http://127.0.0.1:5173/';
const report={method:'ENGINEERING native-touch transition regression. Fresh starts, recovered memories, run time, low health and terminal finish calls are arranged. No mission completion or enjoyment evidence. Native contacts cross playing/result views; fresh result actions use native taps.',profiles:[],errors:[]};
mkdirSync(`docs/media/${prefix}`,{recursive:true});
const server=await chromium.launchServer({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});report.chromePid=server.process().pid;
try{
 const b=await chromium.connect(server.wsEndpoint());
 for(const [width,height] of [[844,390],[390,844],[667,375],[915,412],[320,640]]){
  const p=await b.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3});p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base+'?test');await p.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});const t=await mobileTouch(p);await t.tap('#deploy');const row={width,height,checks:[]};report.profiles.push(row);
  const check=async(name,fn)=>{try{await fn();row.checks.push({name,passed:true})}catch(e){row.checks.push({name,passed:false,error:e.message});throw e}};
  const state=()=>p.evaluate(()=>{const g=window.__SOULFALL__.game;return{phase:g.phase,cores:g.cores,time:g.runTime,retries:g.anchorRetries,ammo:g.ammo,move:{...g.touchMove},fire:g.mouseDown,use:g.touchUse}});
  const reset=async()=>{await t.clear();await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.start(g.options);g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);for(const c of g.coreNodes)g.recoverCore(c);g.runTime=121;g.health=2;g.shield=0;g.emit()});};
  const finish=won=>p.evaluate(won=>window.__SOULFALL__.game.finish(won),won);
  const keep=async(phase)=>{const v=await state();assert.equal(v.phase,phase);assert.equal(v.cores,3);assert.equal(v.retries,0);assert(v.time>=121);assert.equal(v.fire,false);assert.equal(v.use,false);assert.equal(v.move.x,0);assert.equal(v.move.z,0);return v};
  for(const won of [false,true])await check(`held FIRE release over START FRESH preserves ${won?'victory':'loss'}`,async()=>{
   await reset();const f=await t.center('#touch-fire');await t.down(1,f.x,f.y);await finish(won);const fresh=await t.center('#play-again');await t.move(1,fresh.x,fresh.y);await t.up(1);await p.waitForTimeout(100);const v=await keep(won?'won':'lost');row[won?'victory':'loss']=v;await p.screenshot({path:`docs/media/${prefix}/${width}x${height}-${won?'victory':'loss'}.jpg`,type:'jpeg',quality:65});
  });
  await check('scene contact ending over the fresh action cannot restart',async()=>{await reset();await t.down(1,width*.5,height*.45);await finish(false);const a=await t.center('#play-again');await t.move(1,a.x,a.y);await t.up(1);await keep('lost')});
  await check('two stale contacts cannot trigger fresh or cached retries',async()=>{await reset();const f=await t.center('#touch-fire'),m=await t.center('#touch-stick');await t.down(1,m.x,m.y);await t.move(1,m.x,m.y-25);await t.down(2,f.x,f.y);await finish(false);const a=await t.center('#play-again'),c=await t.center('#retry-anchor');await t.move(1,c.x,c.y);await t.move(2,a.x,a.y);for(const id of width===390?[2,1]:[1,2])await t.up(id);await keep('lost')});
  await check('a new deliberate touch can start fresh immediately after the blocked release',async()=>{await t.tap('#play-again');const v=await state();assert.equal(v.phase,'playing');assert.equal(v.cores,0);assert.equal(v.retries,0)});
  await check('a new deliberate touch can use an earned anchor',async()=>{await reset();const f=await t.center('#touch-fire');await t.down(1,f.x,f.y);await finish(false);const c=await t.center('#retry-anchor');await t.move(1,c.x,c.y);await t.up(1);await keep('lost');await t.tap('#retry-anchor');const v=await state();assert.equal(v.phase,'playing');assert.equal(v.cores,3);assert.equal(v.retries,1);assert.equal(v.fire,false);assert.equal(v.use,false)});
  await check('ordinary pause/map touch gestures still open and close their views',async()=>{await t.tap('#pause-button');assert.equal((await state()).phase,'paused');await t.tap('#resume');await t.tap('#touch-map');assert.equal((await state()).phase,'planning');await t.tap('#close-map');assert.equal((await state()).phase,'playing');await t.tap('#pause-button')});
  await p.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1}finally{await server.close();report.browserClosed=true;try{execFileSync('ps',['-p',String(report.chromePid),'-o','pid=,comm=']);report.chromePidAbsent=false}catch(e){report.chromePidAbsent=e.status===1}writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
