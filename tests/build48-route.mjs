import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const errors=[];
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
 const g=window.__SOULFALL__.game,{canPlayerOccupy,movePlayer}=await import('/src/movement.js'),{recoveryDistance,isInsideExtraction}=await import('/src/mission.js');g.clearRun();
 const checks=[],routes=[];const ok=(v,label)=>{if(!v)throw Error(label);checks.push(label)};
 const n=g.playerRoute,starts=[{x:0,z:31},{x:-26,z:-21},{x:-14.6,z:-24},{x:-14.8,z:-24},...g.coreNodes.map(c=>({x:c.position.x,z:c.position.z+2}))];
 for(const start of starts)for(const key of ['core-0','core-1','core-2','custodian','extraction']){
 const pose={...start,y:1.7};if(!n.can(pose)){routes.push({start,key,invalidStart:true});continue;}
 const route=n.path(pose,key);ok(route.length>1,`${JSON.stringify(start)} to ${key} connected`);
 for(let j=1;j<route.length;j++){
 const a=route[j-1],b=route[j],steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.025));
 for(let k=0;k<=steps;k++)ok(canPlayerOccupy(g.world,a.x+(b.x-a.x)*k/steps,1.7,a.z+(b.z-a.z)*k/steps),'actual capsule sweep');
 }
 const end={...route.at(-1),y:1.7};if(key.startsWith('core'))ok(recoveryDistance(end,g.coreNodes[Number(key.at(-1))].position)<=2.3,'real recovery endpoint');if(key==='extraction')ok(isInsideExtraction(end,g.world.playerSpawn),'real upload endpoint');
 // Follow each segment using the real movement implementation, with no pose snaps between waypoints.
 const body={player:{...pose},grounded:true,velocityY:0};for(const target of route.slice(1)){while(Math.hypot(target.x-body.player.x,target.z-body.player.z)>.001){const dx=target.x-body.player.x,dz=target.z-body.player.z,d=Math.hypot(dx,dz),scale=Math.min(.05,d)/d;const old={...body.player};movePlayer(body,g.world,dx*scale,dz*scale,1/120);ok(Math.hypot(body.player.x-old.x,body.player.z-old.z)>.00001,'controlled traversal progresses');}}
 ok(Math.hypot(end.x-body.player.x,end.z-body.player.z)<.01,'controlled traversal arrives');routes.push({start,key,waypoints:route.length,end});
 }
 ok(!canPlayerOccupy(g.world,9,1.7,18),'low Custodian foot blocks actual player');ok(!n.can({x:9,z:18}),'low foot excluded from route');
 ok(n.path({x:0,y:2.2,z:31},'core-0').length===0,'raised start unavailable');ok(n.path({x:0,y:1.7,z:31},'core-0',false).length===0,'air unavailable');
 g.player.set(0,1.7,31);g.updateRouteGoal();const selected=g.routeGoal;g.player.set(-26,1.7,-21);g.updateRouteGoal();ok(g.routeGoal===selected,'Auto stable across movement');
 g.openPlanning();g.selectRoute('core-2');ok(g.phase==='planning'&&g.routeGoal==='core-2','manual does not resume');const time=g.runTime;g.update(1);ok(time===g.runTime,'planning freezes time');ok(!g.audio.active,'planning audio suspended');
 g.coreNodes[2].collected=true;g.updateRouteGoal();ok(g.routeGoal!=='core-2','collected target advances');g.coreNodes.forEach(c=>c.collected=true);g.updateRouteGoal();ok(g.routeGoal==='custodian','three cores to boss');g.custodian.dead=true;g.updateRouteGoal();ok(g.routeGoal==='extraction','boss defeat to upload');
 g.start();g.clearRun();g.updateRouteGoal();g.keys.add('Tab');g.updateRouteTrace();ok(g.routeTrace.visible,'held Tab draws');const queries=n.queries;g.updateRouteTrace();ok(n.queries===queries,'cached route cadence');g.openPlanning();ok(!g.routeTrace.visible&&!g.keys.has('Tab'),'map clears trace');
 g.closePlanning();g.keys.add('Tab');g.updateRouteTrace();g.pause();ok(!g.routeTrace.visible,'pause clears trace');g.resume();g.keys.add('Tab');g.updateRouteTrace();g.finish(false);ok(!g.routeTrace.visible,'end clears trace');g.start();g.clearRun();
 for(let id=0;id<3;id++){const route=n.path(g.player,`core-${id}`),end=route.at(-1);g.player.set(end.x,1.7,end.z);g.keys.add('KeyE');for(let j=0;j<100;j++)g.update(.01);g.keys.delete('KeyE');ok(g.coreNodes[id].collected,'actual E recovery at routed endpoint '+id);ok(g.captureState().routeGoal!==`core-${id}`,'state cannot expose collected selection');g.clearRun();}
 g.start();ok(!g.routeManual&&!g.keys.has('Tab'),'restart clears manual selection and hold');g.clearRun();
 return {checks:checks.length,routes,gridCells:n.open.length,fieldCount:n.fields.size,queries:n.queries,bufferBytes:g.routeTrace.geometry.attributes.position.array.byteLength};
 });
 assert.deepEqual(errors,[]);
 await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.phase='playing';g.player.set(-20,1.7,-18);g.routeGoal='core-2';g.routeNext=0;g.keys.add('Tab');g.pitch=-.65;g.updateRouteTrace();const next=g.routePath?.find(p=>Math.hypot(p.x-g.player.x,p.z-g.player.z)>1);if(next)g.yaw=Math.atan2(g.player.x-next.x,g.player.z-next.z);g.animate(0);g.emit();g.renderer.render(g.scene,g.camera)});
 for(const width of [1280,1440]){await p.setViewportSize({width,height:900});for(const mode of ['hip','ads','tab','map']){await p.evaluate(mode=>{const g=window.__SOULFALL__.game;g.phase='playing';g.aim=mode==='ads';g.keys.clear();if(mode==='tab')g.keys.add('Tab');g.updateRouteTrace();g.animate(.2);if(mode==='map')g.openPlanning();g.emit();g.renderer.render(g.scene,g.camera)},mode);await p.screenshot({path:`docs/media/build48-implementation-${width}-${mode}.png`});}}
 writeFileSync('docs/quality-reviews/build48-implementation-route.json',JSON.stringify({method:'Arranged static-world capsule sweeps and actual movement traversal; not ordinary combat/discovery.',...result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
