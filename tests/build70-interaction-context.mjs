import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const baseline=process.env.INTERACTION_BASELINE==='1';
const output=`docs/quality-reviews/build70-parent-interaction-${baseline?'before':'after'}.json`;
const report={method:'Privileged arranged interaction fixtures; real KeyE handler and service update. Not ordinary play.',baseline,errors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});
 await page.click('#deploy',{force:true});
 report.fixture=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,{default:L}=await import('/src/suit-service-layout.json'),{serviceStatus,updateService}=await import('/src/suit-service.js');
  const notices=[],original=g.onEvent;g.onEvent=e=>{if(e.type==='notice')notices.push(e.message);original(e)};g.requestLock=()=>{};
  const key=()=>{g.canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',bubbles:true}));g.canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',bubbles:true}));};
  const cases=[],sample=name=>{notices.length=0;key();cases.push({name,notices:[...notices],interaction:g.captureState().interaction});};
  g.player.copy(g.world.playerSpawn);sample('far from all receivers');
  g.player.copy(g.coreNodes[0].position);g.player.z+=3.4;sample('outside a nearby receiver reach');
  g.coreNodes.forEach(c=>c.collected=true);g.cores=3;g.custodian.dead=false;g.player.copy(g.world.playerSpawn);sample('all memories secured, boss active');
  g.custodian.dead=true;sample('all memories secured, uploading mission');
  g.player.set(L.face[0],1.7,L.face[2]-1);g.health=20;g.shield=0;
  const service=serviceStatus(g);sample('valid powered suit service');g.keys.add('KeyE');updateService(g,L.seconds);g.keys.clear();
  const serviceResult={valid:service.valid,spent:g.suitService.spent,health:g.health,shield:g.shield};
  g.custodian.dead=false;g.cores=0;g.coreNodes[0].collected=false;g.player.copy(g.coreNodes[0].position);g.player.z+=2;g.channelCore=null;
  key();const eligible=g.channelCore===g.coreNodes[0];
  g.channelCore=null;g.grounded=false;key();const airborneIgnored=g.channelCore===null;
  g.grounded=true;g.phase='paused';key();const pausedIgnored=g.channelCore===null;
  return{cases,serviceResult,eligible,airborneIgnored,pausedIgnored};
 });
 assert.ok(report.fixture.eligible&&report.fixture.airborneIgnored&&report.fixture.pausedIgnored);
 assert.deepEqual(report.fixture.serviceResult,{valid:true,spent:true,health:60,shield:60});
 if(!baseline)assert.ok(report.fixture.cases.every(c=>c.notices.length===0),'No unrelated memory notice when KeyE cannot start recovery');
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(output,JSON.stringify(report,null,2));await browser.close()}
