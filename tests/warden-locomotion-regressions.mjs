import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
  const {animateWarden,steerWarden}=await import('/src/warden.js'), THREE=await import('/node_modules/three/build/three.module.js');
  const g=window.__SOULFALL__.game;g.restart();const e=g.enemies[0],r=e.wardenRig; e.cooldown=100;
  const snapshot=()=>({travel:r.tracks.map(t=>t.travel),position:e.group.position.toArray(),anchor:r.model.getObjectByName('WeakpointAnchor').position.toArray()});
  const before=snapshot();for(let i=0;i<30;i++)g.updateEnemies(1/60);const moving=snapshot();
  const move=g.moveEntity;g.moveEntity=()=>{};for(let i=0;i<5;i++)g.updateEnemies(1/60);const blocked=snapshot();g.moveEntity=move;
  e.stagger=.8;for(let i=0;i<20;i++)g.updateEnemies(1/60);const stagger=snapshot();
  e.stagger=0;for(let i=0;i<10;i++)g.updateEnemies(1/60);const recovery=snapshot();
  // Arranged pure pivot, then settled stop; test actual transforms independent of intention.
  steerWarden(e,new THREE.Vector3(1,0,0),1/60);animateWarden(e,1/60);const turn=snapshot();animateWarden(e,1/60);const stop=snapshot();
  let minY=Infinity,maxRadius=0;const box=new THREE.Box3(),m=new THREE.Matrix4(),v=new THREE.Vector3();
  for(const t of r.tracks){t.belt.geometry.computeBoundingBox();for(let i=0;i<t.belt.count;i++){t.belt.getMatrixAt(i,m);box.copy(t.belt.geometry.boundingBox).applyMatrix4(m);minY=Math.min(minY,box.min.y);for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z])maxRadius=Math.max(maxRadius,Math.hypot(x,z));}}
  const geometry=r.tracks[0].belt.geometry===r.tracks[1].belt.geometry;
  // Equal distance sampled with different dt must yield the same belt phase.
  function sample(n){r.previous.copy(e.group.position);r.yaw=0;r.heading=0;e.group.rotation.y=0;r.tracks.forEach(t=>t.travel=0);for(let i=0;i<n;i++){e.group.position.z+=.6/n;animateWarden(e,.3/n)}return r.tracks.map(t=>t.travel)}
  const dt=[sample(1),sample(36)];
  // Cross a belt-loop wrap: wheel circumference has a different period.
  r.tracks.forEach(t=>{t.travel=1.47;t.wheelPhase=1;});r.previous.copy(e.group.position);r.yaw=0;r.heading=0;e.group.rotation.y=0;
  e.group.position.z+=.01;animateWarden(e,1/60);const wrapWheel=r.tracks.map(t=>t.wheelPhase);
  let instanceDisposals=0,geometryDisposals=0;
  r.tracks.forEach(t=>t.belt.addEventListener('dispose',()=>instanceDisposals++));
  r.tracks[0].belt.geometry.addEventListener('dispose',()=>geometryDisposals++);
  g.restart();const restart=g.enemies[0].wardenRig.tracks.map(t=>t.travel);
  return{before,moving,blocked,stagger,recovery,turn,stop,minY,maxRadius,geometry,dt,restart,wrapWheel,instanceDisposals,geometryDisposals};
 });
 assert.notDeepEqual(result.moving.travel,result.before.travel);assert.deepEqual(result.blocked.travel,result.moving.travel);assert.deepEqual(result.stagger.travel,result.blocked.travel);assert.notDeepEqual(result.recovery.travel,result.stagger.travel);assert.notDeepEqual(result.turn.travel,result.recovery.travel);assert.deepEqual(result.stop.travel,result.turn.travel);assert.ok(result.minY>=-.001);assert.ok(result.minY<.015);assert.ok(result.maxRadius<.45);assert.ok(result.geometry);result.dt[0].forEach((v,i)=>assert.ok(Math.abs(v-result.dt[1][i])<1e-6));assert.deepEqual(result.restart,[0,0]);assert.equal(result.instanceDisposals,2);assert.equal(result.geometryDisposals,0);result.wrapWheel.forEach(v=>assert.ok(Math.abs(v-(1+.01/.12))<1e-6));for(const state of ['before','moving','blocked','stagger','recovery','turn','stop'])result[state].anchor.forEach((v,i)=>assert.ok(Math.abs(v-[0,2,.3][i])<1e-6));
 // Render an actual sequence, arranged orbiting camera and moving enemy, not normal play.
 const frames=[];
 for(let i=0;i<8;i++){
  const s=await p.evaluate(i=>{const g=window.__SOULFALL__.game,e=g.enemies[0];g.player.set(3,1.7,32);g.yaw=.46;g.pitch=-.03;e.cooldown=100;for(let j=0;j<8;j++)g.updateEnemies(1/60);g.animate(0);g.renderer.render(g.scene,g.camera);return{position:e.group.position.toArray(),travel:e.wardenRig.tracks.map(t=>t.travel)}},i);
  const path=`docs/media/${process.env.WARDEN_CAPTURE_PREFIX||'current-warden'}-motion-${i}.png`;await p.screenshot({path});frames.push({...s,path});
 }
 writeFileSync('docs/current-warden-locomotion.json',JSON.stringify({method:'Explicit arranged actual WebGL controlled-frame sequence; no natural-play/performance claim.',...result,frames},null,2));console.log('Crawler moving/blocked/stagger/recovery/turn/stop/restart/dt/ground/radius/geometry: passed');
}finally{await b.close()}
