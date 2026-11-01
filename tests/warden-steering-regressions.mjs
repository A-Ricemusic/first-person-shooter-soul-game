import {chromium} from '@playwright/test';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {steerWarden} from '../src/warden.js';

const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const fixture=heading=>({wardenRig:{heading}});
const turn=fixture(0), request=new THREE.Vector3(1,0,0);
steerWarden(turn,request,1/60);
assert.ok(turn.wardenRig.heading>0 && turn.wardenRig.heading<.1,'A right-angle request begins a pivot rather than snapping');
assert.ok(request.length()<.01,'Translation slows during a sharp pivot');
for(let i=0;i<60;i++)steerWarden(turn,request.set(1,0,0),1/60);
assert.ok(Math.abs(delta(turn.wardenRig.heading,Math.PI/2))<1e-6 && request.x>.99,'Crawler finishes turn and resumes full travel');
const reverse=fixture(0);steerWarden(reverse,request.set(0,0,-1),1/60);
assert.ok(Math.abs(reverse.wardenRig.heading)<1e-8);assert.ok(request.z<-.99,'Retreat reverses the drive without spinning the chassis');
const seam=fixture(Math.PI-.01);steerWarden(seam,request.set(Math.sin(-Math.PI+.04),0,Math.cos(-Math.PI+.04)),1/60);
assert.ok(Math.abs(delta(seam.wardenRig.heading,Math.PI-.01))<.05,'Heading wraps through the short turn');

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[],frames=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset && window.__SOULFALL__.game.wardenAsset,null,{polling:50});
 await page.click('#deploy',{force:true});
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();// Build32: the authored induction guard acquires strictly inside 12m.
 g.player.set(11,1.7,22);g.enemies[0].cooldown=100;});
 for(let frame=0;frame<8;frame++){
  const row=await page.evaluate(async()=>{
   const THREE=await import('/node_modules/three/build/three.module.js');
   const g=window.__SOULFALL__.game,e=g.enemies[0],r=e.wardenRig,samples=[];
   for(let j=0;j<12;j++){
    const heading=r.heading,upper=e.group.rotation.y,p=e.group.position.clone();g.updateEnemies(1/120);
    const dx=e.group.position.x-p.x,dz=e.group.position.z-p.z;
    samples.push({turn:Math.atan2(Math.sin(r.heading-heading),Math.cos(r.heading-heading)),upper:Math.atan2(Math.sin(e.group.rotation.y-upper),Math.cos(e.group.rotation.y-upper)),slip:Math.abs(dx*Math.cos(r.heading)-dz*Math.sin(r.heading))});
   }
   g.animate(0);g.camera.position.set(e.group.position.x+2.3,1.5,e.group.position.z+3.3);g.camera.lookAt(e.group.position.x,1.1,e.group.position.z);g.renderer.render(g.scene,g.camera);g.scene.updateMatrixWorld(true);
   const anchor=r.model.getObjectByName('WeakpointAnchor').getWorldPosition(new THREE.Vector3());e.group.worldToLocal(anchor);
   return{position:e.group.position.toArray(),heading:r.heading,upper:e.group.rotation.y,travel:r.tracks.map(t=>t.travel),anchor:anchor.toArray(),samples};
  });
  const path=`docs/media/${process.env.WARDEN_CAPTURE_PREFIX||'current-warden'}-steering-${frame}.png`;
  await page.screenshot({path});frames.push({...row,path});
 }
 for(const frame of frames){for(const s of frame.samples){assert.ok(Math.abs(s.turn)<=2.8/120+1e-8);assert.ok(Math.abs(s.upper)<=4/120+1e-8);assert.ok(s.slip<1e-7,'Unobstructed crawler follows its mechanical heading');}frame.anchor.forEach((v,i)=>assert.ok(Math.abs(v-[0,2,.3][i])<1e-5));}
 assert.ok(frames.at(-1).heading>1.3 && frames.at(-1).position[0]>.6,'Real AI turns and travels after a sharp side request');
 const stationary=await page.evaluate(()=>{
  const g=window.__SOULFALL__.game;g.restart();g.player.set(4,1.7,26);const e=g.enemies[0];e.cooldown=100;
  for(let i=0;i<30;i++)g.updateEnemies(1/120);
  return{position:e.group.position.toArray(),heading:e.wardenRig.heading,upper:e.group.rotation.y,travel:e.wardenRig.tracks.map(t=>t.travel)};
 });
 assert.deepEqual(stationary.position,[0,0,22]);assert.equal(stationary.heading,0);assert.deepEqual(stationary.travel,[0,0]);assert.ok(stationary.upper>.7,'Upper assembly tracks the player without a false undercarriage pivot');
 assert.deepEqual(errors,[]);
 writeFileSync(process.env.WARDEN_OBSERVATIONS||'docs/current-warden-steering.json',JSON.stringify({method:'Explicit arranged test=1 AI updates and actual WebGL sequence. Numerical heading/contact checks; no human perception, natural-play, or hardware-performance claim.',frames,stationary,errors},null,2)+'\n');
 console.log('Crawler sharp turn, reverse, angular seam, real AI travel, fixed optic and stationary turret: passed');
} finally {await browser.close();}
