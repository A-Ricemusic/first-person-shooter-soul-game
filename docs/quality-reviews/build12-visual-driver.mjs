import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[],observations=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{}});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.handsAsset,null,{polling:50});await page.click('#deploy',{force:true});
 for(const viewport of [{width:1280,height:800},{width:1440,height:900}]){
  await page.setViewportSize(viewport);
  for(const [quality,pose] of [['low','charge'],['high','open'],['high','side'],['high','rear'],['high','near-cover']]){
   const result=await page.evaluate(async({quality,pose})=>{
    const THREE=await import('/node_modules/three/build/three.module.js');const g=window.__SOULFALL__.game;g.restart();g.setSettings({quality});g.phase='playing';const e=g.enemies[0];e.cooldown=100;e.visible=true;
    if(pose==='charge')e.windup=1.6;if(pose==='open')e.armorOpen=3;
    g.player.set(pose==='side'?3:pose==='rear'?1:0,1.7,pose==='rear'?18:26);e.group.rotation.y=0;
    if(pose==='near-cover'){e.group.position.set(2,0,23);g.player.set(4,1.7,27);}
    for(let i=0;i<24;i++)g.updateEnemies(1/120);
    if(['side','rear'].includes(pose))e.group.rotation.y=0;
    const delta=e.group.position.clone().add(new THREE.Vector3(0,1.5,0)).sub(g.player);g.yaw=Math.atan2(-delta.x,-delta.z);g.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));g.animate(.5);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);
    const bounds=new THREE.Box3().setFromObject(e.wardenRig.model);const local=new THREE.Box3().setFromObject(g.wardenAsset);const optic=e.wardenRig.model.getObjectByName('WeakpointAnchor').getWorldPosition(new THREE.Vector3());e.group.worldToLocal(optic);
    const overlap=g.world.colliders.filter(b=>bounds.intersectsBox(b)).map(b=>({min:b.min.toArray(),max:b.max.toArray()}));return{quality,pose,localBounds:{min:local.min.toArray(),max:local.max.toArray()},worldBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},optic:optic.toArray(),shadow:g.renderer.shadowMap.enabled,emission:e.red.emissiveIntensity,overlap};
   },{quality,pose});
   result.viewport=viewport;result.screenshot=`docs/media/build12-visual-${viewport.width}-${pose}-${quality}.png`;await page.screenshot({path:result.screenshot});observations.push(result);
  }
 }
 writeFileSync('docs/quality-reviews/build12-visual-observations.json',JSON.stringify({method:'Explicitly arranged poses, test=1 controlled RAF/software WebGL. Not normal play. Near-cover fixture atx2,z23 tests ingress barricade adjacency, not autonomous route reachability.',observations,errors},null,2)+'\n');console.log(JSON.stringify({count:observations.length,errors}));
}finally{await browser.close()}
