import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const before=process.env.BUILD68_BEFORE==='1',rows=[];
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{for(const fallback of [false,true]){
const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));if(fallback)await p.route('**/induction-hall*.glb',r=>r.abort());
await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
const result=await p.evaluate(async before=>{
const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),P=await import('/src/movement.js');g.clearRun();g.custodian.active=false;const checks=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
const ray=(x,y)=>g.hasLineOfSight(new T.Vector3(x,y,9),new T.Vector3(x,y,11),0);
ok(ray(10,1.7)===!before,'centre physical LOS '+!before);ok(!ray(7.25,1.7)&&!ray(12.5,1.7)&&!ray(10,3.9),'cheeks and header solid');
const mesh=[];g.world.group?.updateMatrixWorld(true);g.scene.updateMatrixWorld(true);for(const x of [7.25,10,12.5]){g.raycaster.set(new T.Vector3(x,1.7,9),new T.Vector3(0,0,1));mesh.push({x,hits:g.raycaster.intersectObjects(g.scene.children,true).filter(h=>h.distance<2).map(h=>h.object.name)});}ok((mesh[1].hits.length===0)===!before,'render mesh aperture agrees');
const movement=[];
if(!before){for(const crouch of [false,true])for(const x of [7.95,8.5,9.5,10.5,11.05])for(const dir of [-1,1]){g.profile=crouch?P.CROUCHED:P.STANDING;g.player.set(x,g.profile.eyeHeight,dir>0?8.5:11.5);g.grounded=true;g.velocityY=0;for(let i=0;i<180;i++)P.movePlayer(g,g.world,0,dir*.02,1/120);ok(dir>0?g.player.z>11.5:g.player.z<8.5,'ground crossing '+[x,dir,crouch]+' end '+g.player.toArray()+' nearby '+JSON.stringify(g.world.colliders.filter(b=>b.min.z<12&&b.max.z>8&&b.min.x<12&&b.max.x>11).map(b=>[b.min.toArray(),b.max.toArray()])));ok(g.grounded,'grounded');movement.push(g.player.toArray());}
for(const action of ['jump','dash'])for(const dir of [-1,1]){g.profile=P.STANDING;g.player.set(10,1.7,dir>0?8.5:11.5);g.grounded=true;g.velocityY=0;if(action==='jump')P.jumpPlayer(g,g.world);let top=0;for(let i=0;i<150;i++){P.movePlayer(g,g.world,0,dir*(action==='dash'&&i<27?27/120:action==='jump'?.03:0),1/120);top=Math.max(top,g.player.y+.2);}ok(dir>0?g.player.z>10.5:g.player.z<9.5,action+' crosses');ok(g.grounded&&Math.abs(g.player.y-1.7)<1e-6,action+' lands');movement.push({action,dir,top,end:g.player.toArray()});}
const {PlayerRoute}=await import('/src/player-route.js');const r=new PlayerRoute(g.world,g.coreNodes),path=r.path({x:10,y:1.7,z:8},'custodian');ok(path.length>1&&path.at(-1).z>=11&&path.at(-1).z<=12,'real north firing route');ok(path.every((a,i)=>!i||r.clear(path[i-1],a)),'route clearance');movement.push({path});
const route=g.navigation.path({x:10,z:8},{x:10,z:12});ok(route.length>0,'NPC north path');
}
const shots=[];for(const x of [10,7.25,12.5])for(const weapon of ['rifle','breacher']){g.clearRun();g.phase='playing';g.player.set(x,1.7,9);g.spawnEnemy(new T.Vector3(x,0,11.5),'sentinel');const e=g.enemies[0],hp=e.health;g.debug.aimAtEnemy(0);g.selectWeapon(weapon);g.fireTimer=0;g.reloading=false;g.debug.shoot();shots.push({x,weapon,damage:hp-e.health});ok((e.health<hp)===(x===10&&!before),'actual foreign-cover shot '+x+weapon);}
return{checks,mesh,movement,shots};},before);
for(const [label,pos,target]of [['north',[10,1.7,7.5],[10,2.4,12]],['inside',[10,1.7,12],[10,2.4,8]]]){await p.evaluate(({pos,target})=>{const g=window.__SOULFALL__.game;g.player.set(...pos);g.yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]);g.pitch=Math.atan2(target[1]-pos[1],Math.hypot(target[0]-pos[0],target[2]-pos[2]));g.animate(0);g.renderer.render(g.scene,g.camera);},{pos,target});await p.screenshot({path:`docs/media/build68-${before?'before':'after'}-${fallback?'fallback':'glb'}-${label}.png`});}
rows.push({fallback,result,errors});assert.deepEqual(errors,[]);await p.close();
}}finally{await b.close();writeFileSync(`docs/quality-reviews/build68-${before?'before':'after'}-portal.json`,JSON.stringify({method:'Arranged fixed legal views and real physics/rays, not ordinary discovery',rows},null,2));}
