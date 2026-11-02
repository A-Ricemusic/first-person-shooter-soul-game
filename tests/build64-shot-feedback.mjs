import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),B=await import('/src/breacher.js'),c=g.custodian,rows=[];
  const setup=mode=>{g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.player.set(11,1.7,23);g.grounded=true;g.aim=true;g.aimBlend=1;g.camera.fov=56;g.recoil=0;c.active=mode!=='dormant';c.dead=mode==='dead';if(mode==='spent')c.coils[1].hp=0;if(mode==='dead')c.coils.forEach(n=>n.hp=0);c.open=mode==='exposed'?3:0;c.cooldown=100;M.updateCustodian(g,0);const target=new T.Vector3(11,mode==='housing'?1:2.18,16.2);if(mode==='air'){g.player.set(0,1.7,31);target.set(0,20,31);}g.yaw=Math.atan2(g.player.x-target.x,g.player.z-target.z);g.recoil=mode==='armored'?.04:mode==='exposed'?.018:0;g.pitch=Math.min(1.44,Math.atan2(target.y-g.player.y,Math.hypot(target.x-g.player.x,target.z-g.player.z)))-g.recoil*(g.options.reducedMotion?0:1);g.animate(0);};
  for(const mode of ['housing','spent','dormant','dead','armored','exposed','air'])for(const weapon of ['rifle','breacher']){
   setup(mode);if(weapon==='breacher')g.selectWeapon('breacher');g.fireTimer=0;g.reloading=false;
   const center=new T.Raycaster();center.setFromCamera(new T.Vector2(0,0),g.camera);const hp=c.coils.map(n=>n.hp),before={hits:g.shotsHit,kills:g.kills,score:g.score};
   const random=Math.random;Math.random=()=>weapon==='rifle'?.5:0;try{g.shoot();}finally{Math.random=random;}
   const events=g.combatFeedback.events;const damage=hp.reduce((s,n,i)=>s+n-c.coils[i].hp,0);
   rows.push({mode,weapon,events:events.map(e=>({kind:e.kind,point:e.point})),damage,hits:g.shotsHit-before.hits,kills:g.kills-before.kills,score:g.score-before.score,rayAngle:g.ray.direction.angleTo(center.ray.direction),originError:g.ray.origin.distanceTo(g.player)});
  }
  for(const last of [false,true]){
   setup('exposed');if(last)c.coils.forEach(n=>n.hp=0);c.coils[1].hp=1;g.selectWeapon('breacher');g.fireTimer=0;const before={hits:g.shotsHit,kills:g.kills,score:g.score};const random=Math.random;Math.random=()=>0;try{g.shoot();}finally{Math.random=random;}
   rows.push({mode:last?'last-coil-overkill':'single-coil-overkill',weapon:'breacher',events:g.combatFeedback.events.map(e=>({kind:e.kind,point:e.point})),damage:1,hits:g.shotsHit-before.hits,kills:g.kills-before.kills,score:g.score-before.score,rayAngle:0,originError:0});
  }
  setup('housing');const random=Math.random;Math.random=()=>.5;try{for(let i=0;i<100;i++){g.fireTimer=0;g.reloading=false;g.ammo=30;g.shoot();}}finally{Math.random=random;}
  return {rows,poolSize:g.combatFeedback.pool.length,eventCount:g.combatFeedback.events.length};
 });
 mkdirSync('docs/media/build64-parent-feedback',{recursive:true});
 for(const mode of ['housing','spent']){
  await p.evaluate(async mode=>{const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js');g.restart();g.clearRun();g.cores=3;g.coreNodes.forEach(n=>n.collected=true);g.custodian.active=true;if(mode==='spent')g.custodian.coils[1].hp=0;g.custodian.cooldown=100;M.updateCustodian(g,0);g.player.set(11,1.7,23);g.aim=true;g.aimBlend=1;g.camera.fov=56;g.yaw=0;g.recoil=0;g.pitch=Math.atan2((mode==='housing'?1:2.18)-1.7,6.8);g.animate(0);const random=Math.random;Math.random=()=>.5;try{g.shoot();}finally{Math.random=random;}g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);},mode);
  await p.screenshot({path:`docs/media/build64-parent-feedback/${mode}.jpg`,type:'jpeg',quality:88});
 }
 const failed=[];
 for(const r of result.rows){
  if(r.rayAngle>1e-7||r.originError>1e-8)failed.push(`${r.weapon}/${r.mode}: centre-ray mismatch`);
  if(['housing','spent','dormant','dead'].includes(r.mode)&&(!r.events.length||r.events.some(e=>e.kind!=='surface')||r.damage!==0||r.hits!==0||r.kills!==0||r.score!==0))failed.push(`${r.weapon}/${r.mode}: physical inert impact must mark surface without combat reward`);
  if(r.mode==='armored'&&(!r.events.some(e=>e.kind==='armor')||r.damage<=0||r.hits!==1))failed.push(`${r.weapon}: active armor feedback changed`);
  if(r.mode==='exposed'&&(!r.events.some(e=>e.kind==='critical')||r.damage<=0||r.hits!==1))failed.push(`${r.weapon}: exposed coil feedback changed`);
  if(r.mode.endsWith('overkill')&&(r.events.length!==1||r.events[0].kind!=='kill'||r.hits!==1||r.kills!==(r.mode==='last-coil-overkill'?1:0)||r.score!==(r.mode==='last-coil-overkill'?100:0)))failed.push(`${r.mode}: same-shell later pellets must not obscure kill or duplicate reward`);
  if(r.mode==='air'&&(r.events.length||r.damage||r.hits))failed.push(`${r.weapon}: empty air fabricated impact`);
 }
 writeFileSync(process.env.SHOT_FEEDBACK_OUTPUT||'docs/quality-reviews/build64-parent-shot-feedback.json',JSON.stringify({method:'Arranged actual model/rifle/pellet queries, deterministic zero-spread centre rays compared with independent screen-centre unprojection. No ordinary-play or recoil-after-shot visual claim.',...result,failed,errors},null,2)+'\n');
 assert.deepEqual(failed,[]);assert.deepEqual(errors,[]);assert.equal(result.poolSize,48);assert.equal(result.eventCount,64);console.log(JSON.stringify({cases:result.rows.length,errors}));
}finally{await browser.close();}
