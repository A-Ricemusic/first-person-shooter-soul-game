import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,statSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});await p.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.wardenAsset,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
 const result=await p.evaluate(async()=>{
 const THREE=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game,m=g.world.medical,checks=[];
 const v=(x,y,z)=>new THREE.Vector3(x,y,z);
 for(const [x,z]of m.spawns)if(!g.canOccupy(x,z,.55))throw Error('Blocked medical spawn');
 for(const [a,c] of [[[-25,-3],[-32,-25]],[[-7,-16],[-34,-16]],[[-24,-13.5],[0,31]]]){const path=g.navigation.path({x:a[0],z:a[1]},{x:c[0],z:c[1]});if(!path.length)throw Error('Unreachable approach');checks.push({route:[a,c],nodes:path.length});}
 const los={wall:g.hasLineOfSight(v(-18,1.3,-5),v(-18,1.3,-13),0),south:g.hasLineOfSight(v(-25,1.3,-5),v(-25,1.3,-13),0),east:g.hasLineOfSight(v(-9,1.3,-16),v(-20,1.3,-16),0)};
 for(let i=0;i<120;i++)g.world.update(1/60,i/60);
 const sh=m.shelter,r=g.world.rainPositions;let rainLeaks=0;
 for(let i=0;i<r.length;i+=6)if(r[i]>=sh.minX&&r[i]<=sh.maxX&&r[i+2]>=sh.minZ&&r[i+2]<=sh.maxZ&&r[i+4]<sh.ceiling)rainLeaks++;
 const pursuit=[];
 for(const type of ['sentinel','stalker','warden'])for(const [name,start,end,axis,threshold,sign]of [
 ['south-enter',[-25,-3],[-32,-25],'z',-10,-1],['south-leave',[-32,-25],[-25,15],'z',-8,1],['east-enter',[-7,-16],[-34,-16],'x',-15,-1],['east-leave',[-32,-16],[10,-16],'x',-13,1]]){
 g.clearRun();g.player.set(end[0],1.7,end[1]);g.spawnEnemy(v(start[0],0,start[1]),type,5);const e=g.enemies[0];e.cooldown=1000;let crossed=false,penetrations=0,t=0;
 for(;t<40;t+=1/60){g.runTime+=1/60;g.updateEnemies(1/60);if(!g.canOccupy(e.group.position.x,e.group.position.z,.449))penetrations++;if((e.group.position[axis]-threshold)*sign>0){crossed=true;break;}}
 pursuit.push({type,name,crossed,penetrations,seconds:t,end:e.group.position.toArray()});
 }
 // Projectile swept into the sealed front return, never reaches player behind it.
 g.clearRun();g.player.set(-18,1.7,-13);g.spawnEnemy(v(-18,0,-5),'sentinel',5);const e=g.enemies[0];e.target.copy(g.player);g.enemyFire(e);g.updateProjectiles(1);const blocked=g.projectiles.length===0&&g.health===100;
 return{checks,los,rainLeaks,pursuit,blocked,queries:g.navigation.queries,maxExpanded:g.navigation.maxExpanded};
 });
 assert.equal(result.los.wall,false);assert.equal(result.los.south,true);assert.equal(result.los.east,true);assert.equal(result.rainLeaks,0);assert.ok(result.blocked);for(const t of result.pursuit){assert.ok(t.crossed,JSON.stringify(t));assert.equal(t.penetrations,0);}
 const captures=[];
 for(const [label,pos,target]of [['south',[-25,2,-2],[-25,2,-22]],['service',[-6,2,-16],[-28,2,-18]],['interior',[-25,2,-12],[-31,1.7,-23]]]){
  const budget=await p.evaluate(({pos,target})=>{const g=window.__SOULFALL__.game;g.player.set(...pos);const dx=target[0]-pos[0],dz=target[2]-pos[2];g.yaw=Math.atan2(-dx,-dz);g.pitch=Math.atan2(target[1]-pos[1],Math.hypot(dx,dz));g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{pos,target});const path=`docs/media/current-${label}.png`;await p.screenshot({path});captures.push({path,budget});
 }
 writeFileSync('docs/quality-reviews/current-medical-checks.json',JSON.stringify({method:'Arranged test=1 actual WebGL. Twelve real AI pursuits, swept projectile, LOS and weather checks. Software rendering; no audio/hardware claim.',result,captures,assetBytes:statSync('public/assets/west-triage.glb').size},null,2));console.log(JSON.stringify(result));
}finally{await b.close()}
