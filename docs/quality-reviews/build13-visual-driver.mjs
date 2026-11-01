import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50});await page.click('#deploy',{force:true});
 await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.restart();g.player.set(0,1.7,32);const e=g.enemies[0];e.cooldown=100;g.options.quality='high';});
 for(const label of ['move0','move1','move2','move3','move4','move5','turn','blocked','stagger','recovery']){
  const row=await page.evaluate(async label=>{
   const THREE=await import('/node_modules/three/build/three.module.js');const g=window.__SOULFALL__.game,e=g.enemies[0],r=e.wardenRig;
   if(label==='turn')g.player.set(10,1.7,28);
   if(label==='stagger'){e.stagger=.8;e.armorOpen=3;}
   if(label==='recovery')e.stagger=0;
   const move=g.moveEntity;if(label==='blocked')g.moveEntity=()=>{};
   for(let j=0;j<6;j++)g.updateEnemies(1/60);
   g.moveEntity=move;g.animate(0);
   g.camera.position.set(e.group.position.x+2.1,.65,e.group.position.z+.85);g.camera.lookAt(e.group.position.x,.38,e.group.position.z);g.renderer.render(g.scene,g.camera);g.scene.updateMatrixWorld(true);
   const anchor=r.model.getObjectByName('WeakpointAnchor').getWorldPosition(new THREE.Vector3());e.group.worldToLocal(anchor);
   const meshes=[];r.model.traverse(n=>{if(n.isMesh){const box=new THREE.Box3().setFromObject(n);meshes.push({name:n.name,min:box.min.toArray(),max:box.max.toArray()})}});
   return{label,position:e.group.position.toArray(),yaw:e.group.rotation.y,baseYaw:r.yaw,travel:r.tracks.map(t=>t.travel),roller:r.tracks.map(t=>t.rollers.map(a=>a.rotation.x)),anchor:anchor.toArray(),meshes,render:g.renderer.info.render};
  },label);
  row.screenshot=`docs/media/build13-visual-${label}.png`;await page.screenshot({path:row.screenshot});rows.push(row);
 }
 // Explicit pure transform sequence crossing belt wrap with .01m steps.
 const wrap=await page.evaluate(async()=>{const {animateWarden}=await import('/src/warden.js');const g=window.__SOULFALL__.game,e=g.enemies[0],r=e.wardenRig;const out=[];e.group.rotation.y=0;r.yaw=0;r.groupYaw=0;r.previous.copy(e.group.position);r.tracks.forEach(t=>t.travel=1.46);for(let i=0;i<4;i++){e.group.position.z+=.01;animateWarden(e,1/60);out.push({travel:r.tracks[0].travel,roller:r.tracks[0].rollers[0].rotation.x})}return out});
 writeFileSync('docs/quality-reviews/build13-visual-observations.json',JSON.stringify({method:'Arranged test=1 direct simulation with actual Three/WebGL renderer; close following camera; not normal play.',rows,wrap,errors},null,2));
 console.log(JSON.stringify({wrap,errors,screenshots:rows.map(r=>r.screenshot)}));
}finally{await browser.close()}
