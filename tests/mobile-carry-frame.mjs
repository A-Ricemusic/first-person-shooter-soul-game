import {chromium} from '@playwright/test';
import {mobileTouch} from '../tools/mobile-touch.mjs';
import {phoneHipLowering} from '../src/mobile-viewmodel.js';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const base=process.env.MOBILE_URL||'http://127.0.0.1:5173/';
const prefix=process.env.MOBILE_FRAME_PREFIX||'mobile-carry-frame';
const baseline=process.env.MOBILE_FRAME_BASELINE==='1';
const report={method:'ENGINEERING fixed entrance view, no actors/encounters, invulnerability, no bob/recoil. Native zoom, tool swap/reload and lifecycle. A5/60 rifle inventory is arranged for reload. Diagnostic white geometry mask counts on-screen weapon triangles, including transparent surfaces; it is not a human visibility, aiming, ergonomics or FPS score. Diagnostic renders occur only in this fixture, never the product.',baseline,profiles:[],errors:[]};
for(const ads of [0,.25,.5,.75,1])assert.equal(phoneHipLowering(false,ads),0);
assert.equal(phoneHipLowering(true,0),.08);
assert.equal(phoneHipLowering(true,1),0);
assert.equal(phoneHipLowering(true,.5),.04);
mkdirSync('docs/media/'+prefix,{recursive:true});
const server=await chromium.launchServer({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
report.chromePid=server.process().pid;
try{
 const browser=await chromium.connect(server.wsEndpoint());
 const profiles=baseline?[[844,390],[390,844]]:[[844,390],[390,844],[568,320],[320,640],[844,390,true],[390,844,true],[390,844,false,true]];
 for(const [width,height,insets=false,fallback=false] of profiles){
  const p=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  const t=await mobileTouch(p),row={width,height,insets,fallback,checks:[]};report.profiles.push(row);
  p.on('pageerror',e=>report.errors.push(e.message));
  if(fallback)await p.route(/assets\/(coil-rifle-handling|operator-hands|pump-breacher)\.glb$/,r=>r.abort());
  await p.goto(base+'?test');await p.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});
  if(!fallback)await p.waitForFunction(()=>{const g=window.__SOULFALL__.game;return g.weaponAsset&&g.handsAsset&&g.breacherModel.getObjectByName('Shell')},null,{timeout:30000});
  await t.tap('#deploy');
  if(insets)await p.addStyleTag({content:'body.touch-mode{--touch-left:44px;--touch-top:44px;--touch-right:12px;--touch-bottom:21px}'});
  await p.evaluate(()=>{
   const g=window.__SOULFALL__.game;g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.invulnerable=999;g.updateEnemies=()=>{};
   g.player.copy(g.world.playerSpawn);g.player.y=1.7;g.yaw=g.pitch=g.recoil=g.kick=0;g.grounded=true;g.velocityY=0;g.options.reducedMotion=true;
   g.custodian.active=false;g.custodian.group.position.set(300,0,300);g.syncCamera();g.emit();
   document.getElementById('announcement').classList.remove('visible');document.getElementById('memory-card').classList.add('hidden');
  });
  await p.waitForTimeout(120);
  const read=()=>p.evaluate(()=>{
   const g=window.__SOULFALL__.game,controls={};
   for(const e of document.querySelectorAll('#touch-actions>button,#touch-stick,#touch-use')){
    const r=e.getBoundingClientRect(),c=getComputedStyle(e);controls[e.id]={x:r.x,y:r.y,width:r.width,height:r.height,label:e.innerText,background:c.backgroundColor,pointer:c.pointerEvents};
   }
   return{phase:g.phase,time:g.runTime,weapon:g.activeWeapon,aim:g.aim,blend:g.aimBlend,reference:g.referenceFov,vertical:g.camera.fov,yaw:g.yaw,pitch:g.pitch,position:g.weapon.position.toArray(),ammo:g.ammo,reserve:g.reserve,shots:g.shotsFired,controls};
  });
  const mask=()=>p.evaluate(()=>{
   const g=window.__SOULFALL__.game,scene=new g.scene.constructor(),camera=g.camera.clone(false),weapon=g.weapon.clone(true),mat=g.weaponFallback.children[0].material.clone();
   mat.color.setHex(0xffffff);mat.emissive.setHex(0xffffff);mat.emissiveIntensity=1;mat.toneMapped=false;mat.transparent=false;mat.opacity=1;mat.map=null;mat.emissiveMap=null;mat.alphaMap=null;
   scene.overrideMaterial=mat;scene.add(camera);camera.add(weapon);
   const color=g.renderer.getClearColor(mat.color.clone()),alpha=g.renderer.getClearAlpha();g.renderer.setClearColor(0,1);g.renderer.render(scene,camera);
   const gl=g.renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,data=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
   let pixels=0,upperPixels=0,top=h;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(data[i]>240&&data[i+1]>240&&data[i+2]>240){pixels++;const sy=h-1-y;top=Math.min(top,sy);if(sy<h*.65)upperPixels++;}}
   g.renderer.setClearColor(color,alpha);mat.dispose();g.renderer.render(g.scene,g.camera);
   const anchor=g.activeWeapon==='rifle'?g.weaponAsset?.getObjectByName('MuzzleAnchor'):g.breacherModel?.getObjectByName('MuzzleAnchor');
   const muzzleGap=anchor?g.muzzle.getWorldPosition(g.player.clone()).distanceTo(anchor.getWorldPosition(g.player.clone())):null;
   return{width:w,height:h,pixels,upperPixels,top,muzzleGap,drawCalls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};
  });
  const check=async(name,fn)=>{try{await fn();row.checks.push({name,passed:true})}catch(e){row.checks.push({name,passed:false,error:e.message});throw e}finally{await t.clear()}};
  const zoom=async()=>{await t.tap('#touch-ads');await p.waitForFunction(()=>window.__SOULFALL__.game.aimBlend>.99999);};
  const wide=async()=>{await t.tap('#touch-ads');await p.waitForFunction(()=>window.__SOULFALL__.game.aimBlend<.00001);};
  for(const weapon of ['rifle','breacher']){
   if(weapon==='breacher'){await t.tap('#touch-more');await t.tap('#touch-swap');await p.waitForFunction(()=>window.__SOULFALL__.game.activeWeapon==='breacher');}
   row[weapon]={hip:{state:await read(),mask:await mask()}};
   await p.screenshot({path:`docs/media/${prefix}/${width}-${insets}-${fallback}-${weapon}-hip.jpg`,type:'jpeg',quality:80});
   await zoom();row[weapon].zoom={state:await read(),mask:await mask()};
   await p.screenshot({path:`docs/media/${prefix}/${width}-${insets}-${fallback}-${weapon}-zoom.jpg`,type:'jpeg',quality:80});
   if(!baseline)await check(weapon+' lowers only hip carry and keeps authored muzzle connected with exact original ADS pose',async()=>{
    const {hip,zoom:z}=row[weapon];assert(Math.abs(hip.state.position[1]-(weapon==='rifle'?-.35:-.36))<.00001);
    assert(Math.abs(z.state.position[1]-(weapon==='rifle'?-.155:-.15))<.00001);assert(z.state.aim&&z.state.ammo===hip.state.ammo&&z.state.shots===hip.state.shots);
    assert(Math.abs(z.state.reference-40)<.0005);assert.equal(z.state.yaw,hip.state.yaw);assert.equal(z.state.pitch,hip.state.pitch);
    assert.equal(z.state.controls['touch-ads'].label,'AIM');assert.equal(z.state.controls['touch-ads'].width,hip.state.controls['touch-ads'].width);
    if(!fallback){assert(hip.mask.muzzleGap<1e-6);assert(z.mask.muzzleGap<1e-6);}assert(hip.mask.pixels>0&&z.mask.pixels>0);
   });
   await wide();const returned=await read();if(!baseline){assert(Math.abs(returned.position[1]-row[weapon].hip.state.position[1])<.00001);assert.equal(returned.ammo,row[weapon].hip.state.ammo);}
  }
  if(!baseline){
   await check('secondary button opacity is quiet, active zoom stays distinct and all hit areas remain usable',async()=>{
    const s=await read();for(const id of ['touch-ads','touch-dash','touch-more','touch-jump']){const c=s.controls[id];assert(c.width>=44&&c.height>=44&&c.pointer==='auto');const alpha=Number(c.background.match(/,\s*([\d.]+)\)$/)?.[1]??1);assert(alpha>=.4&&alpha<=.55,c.background);}
    await zoom();assert.notEqual((await read()).controls['touch-ads'].background,s.controls['touch-ads'].background);await wide();
   });
   await check('native reload, rotation, planning and pause preserve input ownership and return to hip carry',async()=>{
    await t.tap('#touch-more');await t.tap('#touch-swap');await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.ammo=5;g.reserve=60;g.fireTimer=0;g.emit()});
    await t.tap('#touch-more');await t.tap('#touch-reload');await p.waitForTimeout(450);row.reload={state:await read(),mask:await mask()};assert(await p.evaluate(()=>window.__SOULFALL__.game.reloading));
    await p.screenshot({path:`docs/media/${prefix}/${width}-${insets}-${fallback}-reload.jpg`,type:'jpeg',quality:80});
    await p.waitForFunction(()=>!window.__SOULFALL__.game.reloading);assert.equal((await read()).ammo,30);
    await zoom();await t.tap('#touch-map');const paused=await read();assert.equal(paused.phase,'planning');assert(!paused.aim);await p.setViewportSize({width:height,height:width});await p.waitForTimeout(80);assert.equal((await read()).time,paused.time);await p.setViewportSize({width,height});await t.tap('#close-map');await p.waitForFunction(()=>window.__SOULFALL__.game.aimBlend<.00001);assert(Math.abs((await read()).position[1]+.35)<.00001);
    await t.tap('#pause-button');const a=await read();await p.waitForTimeout(100);assert.equal((await read()).time,a.time);await t.tap('#resume');
   });
  }
  await p.close();
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;process.exitCode=1}finally{
 await server.close();report.browserClosed=true;
 try{execFileSync('ps',['-p',String(report.chromePid),'-o','pid=']);report.chromePidAbsent=false}catch(e){report.chromePidAbsent=e.status===1}
 writeFileSync('docs/quality-reviews/'+prefix+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,failure:report.failure,profiles:report.profiles.map(p=>({width:p.width,height:p.height,fallback:p.fallback,checks:p.checks.length,rifle:p.rifle&&{hip:p.rifle.hip.mask,zoom:p.rifle.zoom.mask}}))}));
}
