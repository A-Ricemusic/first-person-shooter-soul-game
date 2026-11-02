import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const checks=[],ok=(v,label)=>{assert.ok(v,label);checks.push(label);};
 const setup=await page.evaluate(()=>{
  const g=window.__SOULFALL__.game;g.clearRun();g.player.set(14,1.7,24);g.yaw=0;g.pitch=0;g.grounded=true;g.runTime=30;g.cores=1;g.coreNodes[0].collected=true;
  g.spawnEnemy(g.player.clone().set(14,0,18),'sentinel');g.enemies[0].windup=.4;
  g.animate(0);g.onMarkers(g.captureMarkers());g.emit();g.renderer.render(g.scene,g.camera);
  const el=document.querySelector('#field-controls');return{hint:g.captureState().crouchHint,combat:document.body.classList.contains('combat-priority'),text:el.textContent,hidden:el.classList.contains('hidden'),visibility:getComputedStyle(el).visibility};
 });
 ok(setup.hint,'real nearby reload shield offers a crouch lesson after18s and a recovered memory');
 ok(setup.combat&&!setup.hidden&&setup.visibility==='visible','lesson remains readable during actual charging-threat priority');
 ok(setup.text.includes('CROUCH BY LOW COVER')&&setup.text.includes('watch high ground and flanks'),'lesson names the action without promising immunity');
 mkdirSync('docs/media/build57-parent-hints',{recursive:true});
 for(const width of [1280,1440]){
  await page.setViewportSize({width,height:800});await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);});
  const rect=await page.locator('#field-controls').boundingBox();ok(rect&&rect.x>=0&&rect.x+rect.width<=width,`context lesson fits ${width}px viewport`);
  const overlap=await page.evaluate(()=>{
   const a=document.querySelector('#field-controls').getBoundingClientRect();
   return ['#threat-focus','.vitals','#blocked-signal'].filter(selector=>{
    const el=document.querySelector(selector);if(!el||el.classList.contains('hidden'))return false;
    const b=el.getBoundingClientRect();return b.width>0&&b.height>0&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   });
  });
  ok(overlap.length===0,`context lesson leaves threat focus, vitals and blocked bearing clear at ${width}px`);
  await page.screenshot({path:`docs/media/build57-parent-hints/${width}-combat-hint.jpg`,type:'jpeg',quality:82});
 }
 await page.keyboard.press('KeyC');
 const low=await page.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<25;i++)g.update(.01);g.animate(0);g.emit();return{eye:g.profile.eyeHeight,learned:g.crouchLearned,hint:g.captureState().crouchHint,hidden:document.querySelector('#field-controls').classList.contains('hidden')};});
 ok(Math.abs(low.eye-1.05)<1e-6&&low.learned,'actual C input and completed posture transition retire lesson');
 ok(!low.hint&&low.hidden,'completed lesson does not leave a combat teaching overlay');
 await page.keyboard.press('KeyC');
 const returned=await page.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<25;i++)g.update(.01);return{eye:g.profile.eyeHeight,hint:g.captureState().crouchHint};});
 ok(Math.abs(returned.eye-1.7)<1e-6&&!returned.hint,'standing again does not repeat a completed lesson');
 const eligibility=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,{nearLowCover}=await import('/src/control-hints.js');g.restart();g.clearRun();g.player.set(14,1.7,24);g.grounded=true;g.yaw=0;
  const rows={reset:nearLowCover(g,g.world)};g.yaw=Math.PI;rows.behind=nearLowCover(g,g.world);g.yaw=0;g.player.z=28;rows.far=nearLowCover(g,g.world);g.player.set(11,1.7,9.1);g.yaw=Math.PI;rows.tall=nearLowCover(g,g.world);
  g.player.set(14,1.7,24);g.yaw=0;g.grounded=false;rows.air=nearLowCover(g,g.world);g.grounded=true;g.dashTime=.1;rows.phase=nearLowCover(g,g.world);g.dashTime=0;g.phase='planning';rows.map=nearLowCover(g,g.world);g.phase='paused';rows.paused=nearLowCover(g,g.world);g.phase='playing';
  g.player.set(-24,1.7,-13);rows.receiver=g.captureState().crouchHint;
  g.player.set(-14,1.7,12);g.yaw=0;g.emit();rows.serviceHidden=document.querySelector('#field-controls').classList.contains('hidden');rows.serviceVisible=!document.querySelector('#service-hint').classList.contains('hidden');
  return rows;
 });
 ok(eligibility.reset,'restart restores the learning opportunity');
 for(const key of ['behind','far','tall','air','phase','map','paused','receiver'])ok(!eligibility[key],`${key} does not offer a misleading or competing crouch lesson`);
 ok(eligibility.serviceHidden&&eligibility.serviceVisible,'existing service-grate jump lesson retains priority');
 assert.deepEqual(errors,[]);
 writeFileSync('docs/quality-reviews/build57-parent-control-hints.json',JSON.stringify({method:'Arranged actual hall geometry, real C input, rendered DOM and preserved-framebuffer screenshots. Not ordinary play or an independent review.',checks,setup,low,returned,eligibility,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
}finally{await browser.close();}
