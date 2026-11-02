// Retained pre-change behavior audit. This is not a desired future AI contract.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const T=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game;
  g.clearRun();g.player.set(-24,1.7,-24);g.spawnEnemy(new T.Vector3(-12,0,-24),'sentinel');
  const hunter=g.enemies[0],trace=[],steer=g.navigation.steer.bind(g.navigation);
  g.navigation.steer=(enemy,goal,time)=>{trace.push({goal:{x:goal.x,z:goal.z},player:{x:g.player.x,z:g.player.z},visible:enemy.visible,home:{x:enemy.home.x,z:enemy.home.z},lastSeen:{x:enemy.lastSeen.x,z:enemy.lastSeen.z}});return steer(enemy,goal,time);};
  const observations=[];
  for(const [x,z] of [[-24,-24],[-30,-27]]){
   g.player.set(x,1.7,z);const eye=hunter.group.position.clone().add(new T.Vector3(0,1.3,0));
   const visible=g.hasLineOfSight(eye,g.player);g.updateEnemies(1/60);
   observations.push({visible,position:hunter.group.position.toArray(),routing:trace.at(-1)});
  }
  g.navigation.steer=steer;
  return {role:hunter.role,observations,worldColliderCount:g.world.colliders.length};
 });
 assert.deepEqual(errors,[]);assert.equal(result.role,'hunter');
 assert.equal(result.observations.length,2);
 for(const o of result.observations){assert.equal(o.visible,false);assert.equal(o.routing.visible,false);assert.deepEqual(o.routing.goal,o.routing.player);assert.notDeepEqual(o.routing.goal,o.routing.lastSeen);}
 const report={baseline:'0b881e1cee316cb104e8880800572ad5ca1d4838',method:'Arranged original-world medical wall positions, actual updateEnemies/navigation call, no added wall or changed navigation. Callback records arguments and forwards to existing steering. Not ordinary play or a review.',finding:'An unacquired hunter routes to both exact concealed player positions; the route goal changes when the unseen player moves, rather than remaining at a last perceived location.',...result,errors,limits:'Two arranged poses establish the current routing behavior, not fairness or human enjoyment. This file intentionally audits the pre-Build54 behavior and is not a future expected-behavior regression.'};
 writeFileSync('docs/quality-reviews/build54-parent-perception-baseline.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
