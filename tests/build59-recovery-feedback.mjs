import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,{CORE_SITES,RECOVERY_RADIUS,RECOVERY_SECONDS}=await import('/src/mission.js'),{nearbyReceiver,recoveryApproachText}=await import('/src/recovery-feedback.js'),{CROUCHED}=await import('/src/movement.js');
  const checks=[],rows=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
  const setup=(id,d)=>{g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.openPlanning();g.selectRoute(`core-${(id+1)%3}`);g.closePlanning();const c=g.coreNodes[id];g.player.set(c.position.x,1.7,c.position.z+d);g.yaw=0;g.pitch=-.1;g.runTime=40;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());return c;};
  const ui=()=>({objective:document.querySelector('#objective').textContent,radar:document.querySelector('#signal-distance').textContent,interaction:document.querySelector('#interaction').innerText});
  for(let id=0;id<3;id++){
   const c=setup(id,3.16),planned=g.routeGoal,s=g.captureState(),before=ui();
   ok(g.canOccupy(g.player.x,g.player.z),'arranged receiver approach uses free actual world pose');
   ok(s.localRecovery.id===id&&!s.recoveryReady&&Math.abs(s.localRecovery.remaining-.36)<1e-6,'nearest local receiver and exact reach margin agree');
   ok(before.objective.includes(CORE_SITES[id].person)&&before.objective.startsWith('NEARBY'),'nearby heading identifies actual local person');
   ok(before.radar.includes(CORE_SITES[id].name)&&before.radar.includes('3.2 M'),'scanner names local site and its distance instead of distant selected route');
   ok(before.interaction.includes('0.4 M OUTSIDE REACH')&&before.interaction.includes('MOVE CLOSER'),'outside prompt shows conservative remaining reach gap');
   ok(g.captureMarkers().filter(m=>m.kind==='core'&&!m.doorway).every(m=>m.id===`core-${id}`),'world objective uses same local receiver');
   ok(g.routeGoal===planned&&g.routeManual,'nearby feedback preserves manually selected route');
   g.keys.add('KeyE');for(let i=0;i<132;i++)g.update(1/120);g.keys.clear();ok(!c.collected&&g.coreProgress===0,'outside hold cannot recover or build progress');
   g.player.set(c.position.x,1.7,c.position.z+2.75);g.animate(0);g.emit();const ready=ui();
   ok(g.captureState().recoveryReady&&ready.objective.startsWith('HOLD E')&&ready.radar.includes('CORE IN REACH'),'inside state aligns heading, scanner and actual eligibility');
   g.keys.add('KeyE');for(let i=0;i<100;i++)g.update(1/120);ok(!c.collected,'hold duration remains at least original .9 seconds');for(let i=0;i<12;i++)g.update(1/120);g.keys.clear();ok(c.collected&&g.cores===1,'real unchanged held-E recovery succeeds after threshold');
   ok(g.captureState().localRecovery?.id!==id,'collected receiver immediately leaves local feedback');
   rows.push({id,planned,before,ready});
  }
  setup(2,3.16);const planned=g.routeGoal;g.player.set(0,1.7,0);g.animate(0);g.emit();ok(!g.captureState().localRecovery&&ui().objective.includes(CORE_SITES[0].person),'leaving local area restores planned objective');ok(g.routeGoal===planned&&g.routeManual,'return to planned heading does not reselect route');
  setup(2,2.75);g.grounded=false;g.emit();ok(!g.captureState().recoveryReady&&ui().interaction.includes('LAND BEFORE RECOVERY'),'airborne local prompt never offers E readiness');
  g.grounded=true;g.profile=CROUCHED;g.player.y=1.05;g.animate(0);g.emit();ok(g.captureState().recoveryReady&&g.captureState().localRecovery.id===2,'actual crouched grounded posture retains foot-relative eligibility');
  ok(nearbyReceiver([{id:0,distance:8,collected:false}])===null,'8m boundary does not change far planned feedback');
  ok(nearbyReceiver([{id:0,distance:1,collected:true},{id:1,distance:4,collected:false}]).id===1,'collected receiver excluded from closest context');
  ok(recoveryApproachText({localRecovery:{remaining:.00001},player:{grounded:true}}).startsWith('0.1 M OUTSIDE'),'positive threshold gap never misleadingly rounds to zero');
  ok(RECOVERY_RADIUS===2.8&&RECOVERY_SECONDS===.9,'mission reach and hold rules unchanged');
  return {checks,rows};
 });
 mkdirSync('docs/media/build59-parent-recovery',{recursive:true});
 for(const width of [1280,1440]){
  await page.setViewportSize({width,height:800});await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.clearRun();g.openPlanning();g.selectRoute('core-0');g.closePlanning();g.player.set(0,1.7,-29.84);g.yaw=0;g.pitch=0;g.runTime=40;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);});
  const layout=await page.evaluate(()=>({gapFont:parseFloat(getComputedStyle(document.querySelector('#interaction small')).fontSize),markerOpacity:document.querySelector('[data-marker-id="core-2"]').style.opacity}));
  assert.ok(layout.gapFont>=12);assert.equal(layout.markerOpacity,'0');result.checks.push(`${width}px reach gap uses readable12px text`);result.checks.push(`${width}px nearby waypoint text yields to the actual interaction prompt`);
  const rect=await page.locator('#interaction').boundingBox();assert.ok(rect&&rect.x>=0&&rect.x+rect.width<=width);result.checks.push(`${width}px actual outside-reach prompt fits viewport`);
  await page.screenshot({path:`docs/media/build59-parent-recovery/${width}-heart-selected-west.jpg`,type:'jpeg',quality:85});
 }
 assert.deepEqual(errors,[]);writeFileSync('docs/quality-reviews/build59-parent-recovery.json',JSON.stringify({method:'Arranged actual world receiver poses, rendered UI, manual map route selection and real held-E simulation checks. Not ordinary play or independent discovery.',...result,assertions:result.checks.length,errors},null,2)+'\n');console.log(JSON.stringify({assertions:result.checks.length,errors}));
}finally{await browser.close();}
