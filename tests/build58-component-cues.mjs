import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),C=await import('/src/custodian-targets.js'),c=g.custodian;
  const checks=[],samples=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
  const aim=point=>{g.yaw=Math.atan2(g.player.x-point.x,g.player.z-point.z);g.pitch=Math.atan2(point.y-g.player.y,Math.hypot(point.x-g.player.x,point.z-g.player.z));g.recoil=0;g.syncCamera();};
  const setup=(x=11,z=23,open=false)=>{g.clearRun();g.phase='playing';g.cores=3;c.active=true;c.dead=false;c.cooldown=100;c.windup=0;c.open=open?3:0;c.coils.forEach(n=>n.hp=160);g.player.set(x,1.7,z);g.grounded=true;g.aim=true;g.runTime=30;M.updateCustodian(g,0);aim(new T.Vector3(11,2.18,16));};
  for(const open of [false,true])for(const distance of [5,9,16,25])for(let angle=0;angle<8;angle++){
   setup(11+Math.sin(angle*Math.PI/4)*distance,16+Math.cos(angle*Math.PI/4)*distance,open);
   const targets=C.custodianTargets(g);samples.push({open,distance,angle,count:targets.length});
   for(const target of targets){
    ok(c.coils[target.index].hp>0,'cue only selects live coil');
    aim(target.point);const read=M.custodianAim(g);ok(read?.label.startsWith(`COIL ${target.index+1} /`),'cue projection and actual aim identify same coil');
    const hp=c.coils.map(n=>n.hp),before=g.shotsHit;g.fireTimer=0;g.reloading=false;g.ammo=30;
    const random=Math.random;Math.random=()=>.5;try{g.shoot();}finally{Math.random=random;}
    ok(c.coils[target.index].hp===hp[target.index]-(target.exposed?82:17),'actual rifle at cue applies unchanged exposed/armored damage');
    ok(c.coils.every((n,i)=>i===target.index||n.hp===hp[i])&&g.shotsHit===before+1,'one cue shot cannot damage another coil or inflate hit count');
    c.coils.forEach(n=>n.hp=160);
   }
  }
  ok(samples.some(s=>s.count>0)&&samples.some(s=>s.count===0),'actual hall samples include clear and blocked component sightlines');
  setup();const first=C.focusedCustodianTarget(g);ok(!!first,'south opening supplies a physical cue');c.coils[first.index].hp=0;ok(C.custodianTargets(g).every(t=>t.index!==first.index),'destroyed component cannot retain a cue');
  setup();const wall=new T.Box3(new T.Vector3(7,0,20),new T.Vector3(15,5,20.3));g.world.colliders.push(wall);ok(C.custodianTargets(g).length===0,'foreign wall hides all targets');g.world.colliders.pop();
  setup();g.spawnEnemy(new T.Vector3(11,0,20),'warden');ok(!C.custodianTargets(g).some(t=>t.index===1),'closer physical Warden hides centre coil');g.clearRun();
  setup();aim(new T.Vector3(11,1,16));ok(M.custodianAim(g)?.label.includes('INERT HOUSING'),'actual base aim names inert housing');
  for(const phase of ['paused','planning','lost','won']){g.phase=phase;ok(C.custodianTargets(g).length===0,`${phase} hides component cues`);}g.phase='playing';c.active=false;ok(C.custodianTargets(g).length===0,'dormant machine has no cue');c.active=true;c.dead=true;ok(C.custodianTargets(g).length===0,'dead machine has no cue');c.dead=false;
  setup();g.yaw=Math.PI;g.syncCamera();ok(C.custodianTargets(g).length===0,'behind camera has no component tracking arrow');setup(11,51);ok(C.custodianTargets(g).length===0,'distant machine has no component cue');
  setup();g.aim=true;g.onMarkers(g.captureMarkers());const marker=g.captureMarkers().find(m=>m.kind==='component');ok(marker&&!g.captureMarkers().some(m=>m.id==='custodian'),'one component cue replaces generic machine diamond even while ADS');
  const el=document.querySelector('[data-marker-id="custodian-component"]');ok(el&&getComputedStyle(el).display!=='none'&&el.style.opacity!=='0','rendered cue remains visible during ADS');
  g.restart();ok(c.cueIndex===null,'restart clears focus selection');
  return {checks,samples,assertions:checks.length};
 });
 mkdirSync('docs/media/build58-parent-cues',{recursive:true});
 for(const width of [1280,1440])for(const open of [false,true]){
  await page.setViewportSize({width,height:800});
  await page.evaluate(async open=>{const g=window.__SOULFALL__.game,M=await import('/src/custodian.js');g.clearRun();g.phase='playing';g.player.set(11,1.7,23);g.yaw=0;g.pitch=.07;g.cores=3;g.runTime=45;g.coreNodes.forEach(n=>n.collected=true);g.custodian.active=true;g.custodian.dead=false;g.custodian.cooldown=100;g.custodian.coils.forEach(n=>n.hp=160);g.custodian.open=open?3:0;M.updateCustodian(g,0);g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);},open);
  const overlap=await page.evaluate(()=>{
   const a=document.querySelector('[data-marker-id="custodian-component"] b').getBoundingClientRect(),other=document.querySelector('[data-marker-id="custodian-focus"] .marker-symbol');if(!other)return false;
   const b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  });assert.ok(!overlap);result.checks.push(`${width}px component numeral leaves existing threat optic clear`);
  const rect=await page.locator('[data-marker-id="custodian-component"]').boundingBox();assert.ok(rect&&rect.x>=0&&rect.x+rect.width<=width);result.checks.push(`${width}px ${open?'open':'closed'} cue fits viewport`);
  await page.screenshot({path:`docs/media/build58-parent-cues/${width}-${open?'open':'closed'}.jpg`,type:'jpeg',quality:85});
 }
 const fallback=await browser.newPage();await fallback.route('**/custodian.glb',r=>r.abort());await fallback.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await fallback.goto('http://127.0.0.1:5173/?test=1');await fallback.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await fallback.click('#deploy',{force:true});
 result.fallback=await fallback.evaluate(async()=>{const g=window.__SOULFALL__.game,C=await import('/src/custodian-targets.js'),M=await import('/src/custodian.js');g.clearRun();g.phase='playing';g.player.set(11,1.7,23);g.yaw=0;g.pitch=.07;g.custodian.active=true;g.custodian.open=3;M.updateCustodian(g,0);g.syncCamera();return{fallback:g.custodian.fallback,targets:C.custodianTargets(g).map(t=>({index:t.index,exposed:t.exposed}))};});
 assert.ok(result.fallback.fallback&&result.fallback.targets.length===3&&result.fallback.targets.every(t=>t.exposed));result.checks.push('forced exact-surface fallback exposes three valid physical coil cues');await fallback.close();
 assert.deepEqual(errors,[]);result.assertions=result.checks.length;
 writeFileSync('docs/quality-reviews/build58-parent-cues.json',JSON.stringify({method:'Arranged real hall positions and exact rendered mesh raycasts; rifle inputs use deterministic centre spread for collision assertions. Not ordinary play or a hardware benchmark.',...result,errors},null,2)+'\n');console.log(JSON.stringify({assertions:result.assertions,samples:result.samples.length,errors}));
}finally{await browser.close();}
