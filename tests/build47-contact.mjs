import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('console',m=>{if(m.type()==='error')console.error(m.text())});p.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{timeout:60000,polling:50});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
 const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),C=await import('/src/contact-discharge.js'),checks=[];
 const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
 function setup(type='sentinel'){g.clearRun();g.phase='playing';g.player.set(0,1.7,31);g.health=100;g.shield=60;g.invulnerable=0;g.spawnEnemy(new T.Vector3(0,0,29.9),type);const e=g.enemies[0];e.cooldown=100;return e;}
 for(const type of ['warden','sentinel','stalker']){
 let e=setup(type);g.updateEnemies(0);ok(g.shield===60&&e.contactWindup===.55,type+' no immediate damage');const pose=e.group.position.clone();g.updateEnemies(.54);ok(g.shield===60&&e.contactWindup>0,type+' full lead');ok(e.group.position.equals(pose),type+' braced');g.updateEnemies(.01);ok(g.shield===45&&e.meleeCooldown===1,type+' one discharge');g.updateEnemies(.01);ok(g.shield===45,type+' no duplicate');ok(g.damageSource===e,type+' source');
 e=setup(type);g.updateEnemies(9);ok(e.contactWindup===.55&&g.shield===60,type+' long start never unseen resolution');
 e=setup(type);g.updateEnemies(0);g.player.z=33;g.updateEnemies(.55);ok(g.shield===60&&e.meleeCooldown===1,type+' stepping out miss cooldown');
 e=setup(type);g.updateEnemies(0);g.player.y=4;g.updateEnemies(.55);ok(g.shield===60,type+' vertical miss');
 e=setup(type);g.updateEnemies(0);const wall=new T.Box3(new T.Vector3(-1,0,30.3),new T.Vector3(1,4,30.5));g.world.colliders.push(wall);g.updateEnemies(.55);ok(g.shield===60,type+' foreign cover at resolution');g.world.colliders.pop();
 e=setup(type);g.world.colliders.push(wall);g.updateEnemies(0);ok(!e.contactWindup,type+' no arming through cover');g.world.colliders.pop();
 e=setup(type);g.updateEnemies(0);g.dashTime=.1;g.dashVector.set(0,0,-1);g.updatePhaseInterrupts();ok(e.contactWindup===0&&e.stagger===.8&&e.meleeCooldown>=1,type+' phase cancel');g.dashTime=0;g.updateEnemies(.55);ok(g.shield===60,type+' canceled no strike');ok(!e.contactCanceled,type+' canceled glow expires');
 e=setup(type);g.updateEnemies(0);e.stagger=.2;g.updateEnemies(.55);ok(g.shield===60&&!e.contactWindup,type+' stagger clears charge');
 e=setup(type);e.windup=.001;e.target.copy(g.player);g.updateEnemies(.01);ok(g.projectiles.length===1&&!e.contactWindup&&g.shield===60,type+' committed ranged finishes alone');
 e=setup(type);e.cooldown=0;g.updateEnemies(0);ok(e.contactWindup===.55&&!e.windup,type+' contact excludes ranged');g.updateProjectiles(0);ok(g.projectiles.length===0,type+' no budget projectile');
 for(const phase of ['paused','planning']){g.phase=phase;g.update(1);ok(e.contactWindup===.55,type+' '+phase+' freezes');}g.phase='playing';g.finish(false);ok(!e.contactWindup&&!e.contactFlash,type+' terminal clears');
 e=setup(type);g.updateEnemies(0);g.killEnemy(e);g.updateEnemies(1);ok(g.shield===60&&g.enemies.length===0,type+' death removes queued strike');
 e=setup(type);g.updateEnemies(0);g.clearRun();ok(g.enemies.length===0,type+' reset removes actors');
 e=setup(type);g.player.z=28.8;g.updateEnemies(0);ok(e.contactWindup===.55,type+' radial behind arming');
 e=setup(type);g.updateEnemies(0);e.group.position.z=29.39;g.updateEnemies(.55);ok(g.shield===60,type+' current pose range revalidation');
 const fallback=C.fallbackContact();const old=g.contactAsset;g.contactAsset=fallback;e=setup(type);g.contactAsset=old;g.updateEnemies(0);C.animateContact(e,0);ok(e.contactRig.shutters.every(s=>s.node.position.y>s.y),type+' fallback mechanical tell');
 const original=old.getObjectByName('Shutter0'),owned=e.contactRig.shutters[0].node;ok(owned.material!==original.material,type+' owned material');
 }
 const hazard=setup();hazard.target.copy(g.player);g.enemyFire(hazard);g.updateEnemies(0);const charge=hazard.contactWindup;g.updateProjectiles(.2);ok(g.shield===41&&hazard.contactWindup===charge,'existing projectile remains dangerous during contact');
 const marker=g.captureMarkers().find(m=>m.id===`enemy-${hazard.id}`);ok(marker?.charging&&marker.label.includes('DISCHARGE'),'contact uses focus/source charging cue');
 const mat=hazard.contactRig.shutters[0].node.material,geo=hazard.contactRig.shutters[0].node.geometry;let md=0,gd=0;mat.addEventListener('dispose',()=>md++);geo.addEventListener('dispose',()=>gd++);g.killEnemy(hazard);ok(md===1&&gd===0,'death disposes owned material once and retains template geometry');
 setup();for(const type of ['warden','sentinel','stalker'])g.spawnEnemy(g.player.clone().set(3,0,29),type);
 const geometries=new Map();
 for(const root of [g.scene,g.contactAsset,g.wardenAsset,g.sentinelAsset,g.interceptorAsset,g.weaponAsset,g.handsAsset])root?.traverse(n=>{if(n.geometry&&!geometries.has(n.geometry)){const counter={count:0};geometries.set(n.geometry,counter);n.geometry.addEventListener('dispose',()=>counter.count++);}});
 g.dispose();const bad=[...geometries.values()].filter(c=>c.count!==1);
 ok(bad.length===0,'final teardown disposes every shared/unused template geometry once; incorrect counts '+JSON.stringify(bad.slice(0,8)));
 return {checks,teardownGeometries:geometries.size};
 });
 if(errors.length)throw Error(JSON.stringify(errors));writeFileSync(process.env.CONTACT_CHECK_OUTPUT||'docs/quality-reviews/build47-implementation-contact.json',JSON.stringify({...result,errors},null,2));console.log(result);
}finally{await b.close()}
