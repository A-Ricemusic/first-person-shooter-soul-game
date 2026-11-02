import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const variants=[];
try{for(const fallback of [false,true]){
 const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 if(fallback)await p.route('**/induction-hall.glb',r=>r.abort());
 await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),w=g.world.induction,checks=[];
  const ok=(v,s)=>{if(!v)throw Error(s);checks.push(s)};
  for(const part of w.parts.filter(p=>p.solid))ok(g.world.colliders.some(b=>b.induction&&b.min.toArray().every((x,i)=>Math.abs(x-part.center[i]+part.size[i]/2)<1e-5)&&b.max.toArray().every((x,i)=>Math.abs(x-part.center[i]-part.size[i]/2)<1e-5)),'exact solid '+part.name);
  const routes=[];for(const [a,b]of [[[1,14],[7,19]],[[21,18],[15,19]],[[7,19],[0,29]],[[15,19],[0,29]],[[7,12],[15,12]],[[6,18],[6,24]]]){const route=g.navigation.path({x:a[0],z:a[1]},{x:b[0],z:b[1]});ok(route.length>0,'capsule route '+JSON.stringify([a,b]));ok(route.every(p=>g.canOccupy(p.x,p.z,.55)),'route clearance');routes.push({a,b,nodes:route.length});}
  for(const [a,b,expected]of [[[2,1.7,20],[6,1.7,20],false],[[11,1.7,8],[11,1.7,12],false],[[20,1.7,18],[15,1.7,18],true],[[6,1.7,18],[6,1.7,24],true]])ok(g.hasLineOfSight(new T.Vector3(...a),new T.Vector3(...b),0)===expected,'LOS '+JSON.stringify([a,b]));
  for(let i=0;i<180;i++)g.world.update(1/60,i/60);
  const sh=w.shelter,r=g.world.rainPositions;let leaks=0;for(let i=0;i<r.length;i+=6)if(r[i]>=sh.minX&&r[i]<=sh.maxX&&r[i+2]>=sh.minZ&&r[i+2]<=sh.maxZ&&r[i+4]<sh.ceiling)leaks++;ok(leaks===0,'roof masks rain');
  const c=g.custodian;c.active=true;c.open=3;M.updateCustodian(g,0);c.group.updateWorldMatrix(true,true);
  const angles=[];for(const pos of [[9.35,1.7,20],[11,1.7,20],[12.65,1.7,20],[7,1.7,16],[15,1.7,16],[9.35,1.7,12]]){let visible=0;for(const n of c.coils){const target=new T.Vector3(...n.metadata.target).add(c.group.position),origin=new T.Vector3(...pos);g.raycaster.set(origin,target.clone().sub(origin).normalize());const hit=g.raycaster.intersectObject(c.model,true)[0];if(hit?.object.userData.coil===n.metadata.id&&!hit.object.userData.shutter&&g.hasLineOfSight(origin,hit.point,.05))visible++;}angles.push({pos,visible});}ok(angles.slice(0,3).every(a=>a.visible>0),'standing front firing bays retain mesh angles');
  g.clearRun();c.active=false;g.phase='playing';
  const coverShots=[];
  for(const reverse of [false,true]){g.clearRun();g.player.set(reverse?2:6,1.7,20);g.spawnEnemy(new T.Vector3(reverse?6:2,0,20),'sentinel');const e=g.enemies[0];e.cooldown=100;const hp=e.health;g.debug.aimAtEnemy(0);g.selectWeapon('rifle');g.fireTimer=0;g.debug.shoot();g.selectWeapon('breacher');g.fireTimer=0;g.debug.shoot();ok(e.health===hp,'foreign wall blocks rifle and pellets '+reverse);g.shield=60;g.enemyFire({group:{position:e.group.position},target:g.player.clone(),type:'sentinel'});for(let i=0;i<200&&g.projectiles.length;i++)g.updateProjectiles(1/120);ok(g.shield===60,'foreign wall blocks return projectile '+reverse);coverShots.push({reverse,hp:e.health,shield:g.shield});}
  g.clearRun();g.player.set(16,1.7,17);g.yaw=0;g.keys.add('KeyS');g.dashCooldown=0;g.dash();for(let i=0;i<27;i++)g.update(1/120);g.clearInput();ok(g.player.z>22.7&&Math.abs(g.player.y-1.7)<1e-6,'grounded six metre phase aisle '+g.player.toArray());
  const phaseEnd=g.player.toArray(),pursuits=[];
  for(const [role,a,b]of [['hunter',[2,20],[7,20]],['hunter',[21,18],[15,18]],['guard',[21,18],[15,18]],['hunter',[6,20],[6,26]]]){g.clearRun();g.player.set(b[0],1.7,b[1]);g.spawnEnemy(new T.Vector3(a[0],0,a[1]),'sentinel');const e=g.enemies[0];e.role=role;e.cooldown=100;let invalid=0;for(let i=0;i<2400;i++){g.updateEnemies(1/120);g.runTime+=1/120;if(!g.canOccupy(e.group.position.x,e.group.position.z,.45))invalid++;if(Math.hypot(e.group.position.x-b[0],e.group.position.z-b[1])<2.8)break;}const end=e.group.position.toArray();ok(invalid===0&&Math.hypot(end[0]-a[0],end[2]-a[1])>1&&e.visible,'grounded pursuit engages across approach '+role+JSON.stringify(a)+JSON.stringify(end));pursuits.push({role,a,b,end,invalid});}
  return {checks,routes,angles,leaks,coverShots,phaseEnd,pursuits,parts:w.parts.length};
 });
 for(const [label,pos,target]of [['south',[6,1.7,25],[11,2.6,16]],['bay',[11,1.7,20],[11,2.18,16.2]],['east',[21,1.7,18],[11,2.6,16]],['service',[7,1.7,12],[11,2.4,16]]]){
 await p.evaluate(({pos,target})=>{const g=window.__SOULFALL__.game;g.player.set(...pos);g.yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]);g.pitch=Math.atan2(target[1]-pos[1],Math.hypot(target[0]-pos[0],target[2]-pos[2]));g.animate(0);g.renderer.render(g.scene,g.camera);},{pos,target});await p.screenshot({path:`docs/media/build51-implementation-${fallback?'fallback':'authored'}-${label}.png`});}
 variants.push({fallback,result,errors});assert.deepEqual(errors,[]);await p.close();
}writeFileSync('docs/quality-reviews/build51-implementation-geometry.json',JSON.stringify({method:'Arranged real-renderer geometry checks; not ordinary play or proof of enemy pursuit/combat success',variants},null,2));}finally{await b.close()}
