import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage();await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return original.call(this,type,type.startsWith('webgl')?{...options,preserveDrawingBuffer:true}:options);};});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await p.click('#deploy',{force:true});
 const out=await p.evaluate(async()=>{
 const T=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game;g.requestLock=()=>{};
 g.clearRun();g.phase='playing';g.player.set(-24,1.7,-24);const candidates=[];for(let x=-16;x<=-8;x+=.5)for(let z=-28;z<=-20;z+=.5){const c=new T.Vector3(x,0,z),eye=c.clone().setY(1.3);if(g.canOccupy(x,z,.55)&&!g.hasLineOfSight(eye,new T.Vector3(-24,1.7,-24))&&!g.hasLineOfSight(eye,new T.Vector3(-30,1.7,-27))&&g.hasLineOfSight(eye,new T.Vector3(-12,1.7,-18)))candidates.push(c);}candidates.sort((a,b)=>a.distanceToSquared(new T.Vector3(-12,0,-24))-b.distanceToSquared(new T.Vector3(-12,0,-24)));const seed=candidates[0];if(!seed)throw Error('No valid original-world fixture');g.spawnEnemy(seed,'stalker');const e=g.enemies[0];e.cooldown=100;
 const rows=[],snap=label=>rows.push({label,position:e.group.position.toArray(),goal:e.lastSeen.toArray(),duty:e.duty,unseen:e.unseen,target:e.target.toArray(),facing:e.group.rotation.y});
 const tick=(n,dt=1/60)=>{for(let i=0;i<n;i++){g.runTime+=dt;g.updateEnemies(dt);}};
 for(const [x,z] of [[-24,-24],[-30,-27]]){g.player.set(x,1.7,z);tick(10);snap('unacquired');}
 // Real visible contact on the east side of the medical wall.
 g.player.set(-12,1.7,-18);tick(1);snap('acquired');
 g.player.set(-24,1.7,-24);e.windup=.4;e.target.set(-12,1.7,-18);tick(10);snap('hidden committed');
 g.player.set(-30,1.7,-27);tick(10);snap('relocated');
 e.windup=0;tick(180);snap('search');tick(330);snap('after search / possible reacquisition');
 // The real weapon path emits exactly one event, with no pellet duplication.
 let events=0;const emit=g.emitShotNoise.bind(g);g.emitShotNoise=o=>{events++;emit(o);};
 g.player.set(-24,1.7,-24);g.fireTimer=0;g.reloading=false;g.ammo=30;g.shoot();snap('rifle heard');
 g.fireTimer=0;g.ammo=0;g.reserve=0;g.shoot();const afterEmpty=events;
 g.reloading=false;g.activeWeapon='breacher';g.fireTimer=0;g.ammo=6;g.shoot();snap('shell heard');
 const frozen=e.lastSeen.toArray();g.player.set(30,1.7,30);tick(1);snap('unheard relocation');
 const states=[];g.player.set(-30,1.7,-27);for(let i=0;i<10;i++){tick(60);states.push({duty:e.duty,position:e.group.position.toArray(),goal:e.searchGoal.toArray(),valid:g.canOccupy(e.group.position.x,e.group.position.z,.449)});}
 const weaponEvents=events;const branches=[];
 for(const hidden of [[-24,-24],[-30,-27]]){
  g.clearRun();g.phase='playing';g.player.set(hidden[0],1.7,hidden[1]);g.spawnEnemy(seed,'stalker');const h=g.enemies[0];h.cooldown=100;h.windup=.4;h.target.set(-12,1.7,-18);g.emitShotNoise(new T.Vector3(-20,1.7,-24));
  g.updateEnemies(.1);branches.push({position:h.group.position.toArray(),facing:h.group.rotation.y,unseen:h.unseen,contactAge:h.contactAge,target:h.target.toArray(),lastSeen:h.lastSeen.toArray(),visible:h.visible});
 }
 const h=g.enemies[0],before=h.unseen;g.pause();g.update(1);const paused=h.unseen;g.phase='planning';g.update(1);const planning=h.unseen;g.phase='playing';g.update(1/60);const resumed=h.unseen;
 g.start();return {medicalProbeValidity:[[-28,-25],[-12,-25],[-32,-5]].map(([x,z])=>({x,z,npc:g.canOccupy(x,z,.55),player:g.canOccupy(x,z,.4)})),seed:seed.toArray(),rows,events:weaponEvents,afterEmpty,frozen,states,branches,timers:{before,paused,planning,resumed},restart:g.enemies.map(e=>({duty:e.duty,unseen:e.unseen,lastSeen:e.lastSeen.toArray(),home:e.home.toArray()}))};
 });
 writeFileSync('docs/quality-reviews/build54-implementation-browser.json',JSON.stringify({out,errors},null,2));
 assert.deepEqual(out.branches[0],out.branches[1]);assert.equal(out.timers.paused,out.timers.before);assert.equal(out.timers.planning,out.timers.before);assert.ok(out.timers.resumed-out.timers.before<.02);
 assert.deepEqual(errors,[]);assert.equal(out.rows[0].duty,'hold');assert.equal(out.rows[1].duty,'hold');assert.deepEqual(out.rows[0].position,out.rows[1].position);assert.equal(out.rows[2].duty,'chase');assert.deepEqual(out.rows[3].target,out.rows[4].target);assert.deepEqual(out.rows[3].goal,out.rows[4].goal);assert.ok(out.rows[4].unseen>out.rows[3].unseen);assert.equal(out.events,2);assert.equal(out.afterEmpty,1);assert.deepEqual(out.rows[9].goal,out.frozen);assert.ok(out.states.every(s=>s.valid));
 // Render actual movement and rig poses through the original hall/medical geometry.
 const frames=[];
 for(let frame=0;frame<20;frame++){
  const state=await p.evaluate(async ({frame,seed})=>{
   const T=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game;g.requestLock=()=>{};
   if(frame===0){g.clearRun();g.phase='playing';g.player.set(-24,1.7,-24);g.spawnEnemy(new T.Vector3(...seed),'stalker');g.emitShotNoise(g.player);g.player.set(30,1.7,30);g.enemies[0].cooldown=100;}
   for(let i=0;i<60;i++){g.runTime+=1/60;g.updateEnemies(1/60);}
   const e=g.enemies[0];g.phase='playing';g.emit();g.animate(0);const optic=e.group.position.clone().setY(1.3);for(let j=0;j<8;j++){const angle=j*Math.PI/4,cam=e.group.position.clone().add(new T.Vector3(Math.sin(angle)*3.2,2.8,Math.cos(angle)*3.2));if(g.canOccupy(cam.x,cam.z,.1)&&g.hasLineOfSight(cam,optic,0)){g.camera.position.copy(cam);break;}}g.camera.lookAt(e.group.position.x,1,e.group.position.z);g.renderer.render(g.scene,g.camera);
   return {position:e.group.position.toArray(),duty:e.duty,rotation:e.group.rotation.y,goal:e.lastSeen.toArray(),search:e.searchGoal.toArray(),top:e.droneRig?.top.position.y};
  },{frame,seed:out.seed});
  const path=`docs/media/build54-implementation-motion-${frame}.png`;await p.screenshot({path});frames.push({...state,path});
 }
 assert.ok(frames.some(f=>f.duty==='search'));assert.ok(frames.some(f=>f.duty==='return'));assert.notDeepEqual(frames[0].position,frames[5].position);
 writeFileSync('docs/quality-reviews/build54-implementation-motion.json',JSON.stringify({method:'Arranged actual NPC simulation, original world geometry and rendered rig; camera arranged, not ordinary play.',frames},null,2));
 console.log(JSON.stringify(out));
}finally{await b.close();}
