import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});
 await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js');
  const {custodianObjectiveVisible}=await import('/src/custodian.js');
  g.clearRun();g.cores=3;g.coreNodes.forEach(c=>c.collected=true);g.custodian.active=true;
  const checks=[],views=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  const inspect=(x,z,label)=>{
   g.player.set(x,1.7,z);g.grounded=true;g.yaw=Math.atan2(x-11,z-16);g.pitch=0;g.phase='playing';g.animate(0);g.emit();g.renderer.render(g.scene,g.camera);
   const markers=g.captureMarkers();g.onMarkers(markers);const marker=markers.find(m=>m.id==='custodian');
   const visibleMarkers=[...document.querySelectorAll('#waypoints .world-marker b')].map(e=>e.textContent);
   const note=document.querySelector('#blocked-signal');
   const view={label,x,z,occluded:marker?.occluded,note:note?.textContent,noteHidden:note?.classList.contains('hidden'),visibleMarkers};views.push(view);return view;
  };
  const blocked=inspect(11,8,'north blast wall');
  ok(blocked.occluded,'real four-metre north blast wall suppresses boss bearing');
  ok(!blocked.noteHidden&&blocked.note.includes('HALL OPENING'),'blocked state explains the architectural approach');
  ok(!blocked.visibleMarkers.includes('DISABLE CUSTODIAN'),'blocked objective is removed from visible marker DOM');
  const open=inspect(6,14,'west hall opening');
  ok(!open.occluded,'actual west opening retains a visible machine bearing');
  ok(open.noteHidden,'open approach clears blocked note');
  ok(open.visibleMarkers.includes('DISABLE CUSTODIAN'),'open objective returns to visible marker DOM');
  const shields=g.world.colliders.filter(b=>b.custodian),before=g.world.colliders.length;
  ok(shields.length>0&&custodianObjectiveVisible(g),'machine collision slices do not falsely hide its objective');
  const enclosing=new T.Box3(new T.Vector3(5.5,0,13.5),new T.Vector3(6.5,4,14.5));g.world.colliders.push(enclosing);
  ok(!custodianObjectiveVisible(g),'a foreign collider containing the camera blocks the bearing');g.world.colliders.pop();
  g.player.set(11,1.7,8);g.custodian.coils.forEach(n=>n.hp=0);g.custodian.dead=true;
  ok(!custodianObjectiveVisible(g),'defeated machine is not a visible live objective');
  ok(!g.captureMarkers().some(m=>m.id==='custodian'),'defeat removes boss objective and keeps extraction transition');
  ok(g.world.colliders.length===before,'visibility queries leave physical collision unchanged');
  g.phase='paused';ok(g.captureMarkers().length===0,'pause clears objective markers');
  return {checks,views,physicalColliderCount:before};
 });
 assert.deepEqual(errors,[]);
 mkdirSync('docs/quality-reviews',{recursive:true});
 writeFileSync('docs/quality-reviews/build52-parent-objective-occlusion.json',JSON.stringify({method:'Arranged actual hall positions and rendered marker DOM, not ordinary play or a third independent review.',...result,errors},null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close();}
