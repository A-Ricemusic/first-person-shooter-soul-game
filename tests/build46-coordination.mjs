import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {AttackCoordinator} from '../src/attack-coordinator.js';
const out='docs/quality-reviews/build46-implementation-coordination.json', checks=[];
const ok=(v,m)=>{assert.ok(v,m);checks.push(m)};
const a=new AttackCoordinator(),ready={alive:true,charging:false,ready:true};
ok(a.advance(.01,ready)&&a.pending,'ready boss reserves before admission');
ok(!a.advance(.01,{...ready,ready:false})&&a.retry===2,'lost sight releases immediately with bounded retry');
for(let i=0;i<100;i++)ok(!a.advance(.01,{...ready,ready:i%2===0}),'flicker cannot renew priority during retry');
a.reset();a.advance(0,ready);ok(!a.advance(3,ready)&&a.retry===2,'long step expires lease without renewal');
a.reset();a.resolve();ok(a.advance(.8,ready)&&a.recovery===0,'recovery includes boundary tick');ok(a.advance(.01,ready),'next ready request allowed');ok(!a.advance(0,{...ready,alive:false})&&!a.pending,'inactive resets');
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const requests=[],errors=[];
try{
 const p=await b.newPage();p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});ok(!requests.some(u=>u.includes('custodian-surfaces')),'successful GLB path makes no surface request');await p.click('#deploy');
 checks.push(...await p.evaluate(async()=>{
 const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),c=g.custodian,checks=[];const ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 function setup(){g.clearRun();M.resetCustodian(g);g.player.set(7.8,1.7,20);g.health=10000;g.shield=0;g.cores=3;g.phase='playing';g.encounters=new Set(['ingress','medical','engineering','heart']);c.active=true;c.cooldown=0;g.spawnEnemy(new T.Vector3(0,0,15),'sentinel');g.spawnEnemy(new T.Vector3(15.5,0,19.6),'stalker');g.enemies.forEach(e=>e.cooldown=0);}
 setup();g.enemies[0].windup=.2;g.enemies[0].target.copy(g.player);g.update(.01);ok(c.coordination.pending&&c.windup===0&&g.enemies[1].windup===0,'request drains committed charge without admitting another');ok(!c.coils.some(n=>n.line),'queued turn has no false telegraph');const fired=[];const fire=g.enemyFire.bind(g);g.enemyFire=e=>{fired.push(e);fire(e)};g.update(.2);ok(fired.length===1&&c.windup===1.8,'committed fire finishes then real charge begins');ok(g.projectiles.some(p=>!p.custodianCoil),'committed projectile retained');
 for(let i=0;i<181;i++){const old=c.windup;g.update(.01);ok(g.enemies.every(e=>e.windup<=0),'no patrol starts in boss turn');if(old>0&&c.windup<=0)break;}
 ok(c.open===2.6&&c.coordination.recovery===.8,'volley enters original opening and recovery');const health=g.health;for(let i=0;i<79;i++)g.update(.01);ok(g.enemies.every(e=>e.windup<=0),'no new patrol starts before recovery');ok(g.health<health,'live projectile damage continues through recovery');
 for(let i=0;i<5;i++)g.update(.01);ok(g.enemies.some(e=>e.windup>0),'patrol fire resumes after recovery');
 setup();g.yaw+=Math.PI;g.update(.01);ok(c.windup>0,'looking away cannot pacify boss');
 setup();c.cooldown=0;g.player.set(11,1.7,20);g.update(.01);g.dashTime=.1;g.dashVector.set(0,0,-1);M.updateCustodian(g,.01);ok(c.windup===0&&c.open===3&&c.stagger===.8&&c.coordination.recovery===.8,'actual phase break resolves with original opening/stagger');
 setup();c.coordination.advance(0,{alive:true,ready:true,charging:false});const wall=new T.Box3(new T.Vector3(-30,0,18),new T.Vector3(30,9,19));g.world.colliders.push(wall);g.updateEnemies(.01);ok(!c.coordination.pending&&c.coordination.retry===2,'foreign cover cancels reservation');g.world.colliders.pop();
 for(const mode of ['inactive','dead','range']){setup();if(mode==='inactive')c.active=false;if(mode==='dead')c.dead=true;if(mode==='range')g.player.set(0,1.7,-30);g.updateEnemies(.01);ok(!c.coordination.pending,mode+' cannot reserve');}
 setup();c.active=false;g.updateEnemies(.01);ok(g.enemies.filter(e=>e.windup>0).length===2,'ordinary nonboss admission remains two');
 setup();g.update(.01);g.pause();const before=JSON.stringify(c.coordination);g.update(1);ok(JSON.stringify(c.coordination)===before,'pause freezes simulation coordination');g.resume();g.clearRun();ok(!c.coordination.pending&&c.coordination.recovery===0,'fixture clearRun resets state');g.restart();ok(!c.coordination.pending&&c.windup===0,'restart resets');
 setup();g.player.set(7.8,1.7,20);g.enemies[0].group.position.set(7.8,0,19.2);c.coordination.resolve();const meleeHealth=g.health;g.enemies[0].windup=0;g.updateEnemies(0);ok(g.health===meleeHealth,'contact arms without instant damage during recovery');for(let i=0;i<55;i++)g.updateEnemies(.01);ok(g.health<meleeHealth,'armed proximity discharge damages during recovery');
 setup();g.update(.01);g.openPlanning();const planned=JSON.stringify(c.coordination);g.update(10);ok(JSON.stringify(c.coordination)===planned,'planning freezes coordination');g.closePlanning();g.finish(false);g.update(10);ok(JSON.stringify(c.coordination)===planned,'terminal freezes coordination');
 setup();g.update(.01);c.coils.forEach(n=>n.hp=17);for(const n of c.coils)M.hitCustodian(g,{object:n.shutters[0]});ok(c.dead&&!c.coordination.pending&&c.coordination.recovery===0&&g.kills===1,'last defeat releases immediately and rewards once');M.hitCustodian(g,{object:c.coils[0].shutters[0]});ok(g.kills===1,'spent body cannot reward twice');
 setup();const starts=[];for(let i=0;i<1200;i++){const old=c.windup;g.update(.01);if(old<=0&&c.windup>0)starts.push(g.runTime);}ok(starts.length>=2,'eligible boss not starved across cycles');ok(fired.length>1,'patrols not starved between cycles');
 return checks;
 }));
 await p.close();const f=await b.newPage();await f.route('**/assets/custodian.glb',r=>r.abort());await f.addInitScript(()=>window.requestAnimationFrame=()=>1);await f.goto('http://127.0.0.1:5173/?test=1');await f.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});ok(await f.evaluate(()=>window.__SOULFALL__.game.custodian.fallback),'forced GLB failure starts exact backup');
 const surfaces=JSON.parse(readFileSync('src/custodian-surfaces.json')),layout=JSON.parse(readFileSync('src/custodian-layout.json'));const exact=await f.evaluate(()=>{const c=window.__SOULFALL__.game.custodian;return [...c.model.children.filter(m=>m.isMesh),...c.coils.flatMap(n=>n.pivot.children.filter(m=>m.isMesh))].map(m=>({name:m.name,positions:Array.from(m.geometry.attributes.position.array),normals:Array.from(m.geometry.attributes.normal.array)}));});ok(exact.length===layout.parts.length&&exact.every(m=>['positions','normals'].every(k=>m[k].every((v,i)=>v===Math.fround(surfaces[m.name][k][i])))),'all fallback vertices/normals exactly match authored payload');
 ok(errors.length===0,'no runtime errors');
}finally{await b.close();writeFileSync(out,JSON.stringify({checks:[...new Set(checks)],requests,errors},null,2)+'\n');}
console.log([...new Set(checks)]);
