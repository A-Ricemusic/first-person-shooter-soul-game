import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const baseline=process.env.BASELINE==='1';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const errors=[];
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.wardenAsset,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
 const captures=[];
 for(const [label,pos,target]of [['spawn',[0,1.7,31],[0,10,-33]],['approach',[22,1.7,-3],[29,3,-20]],['receiver',[24,1.7,-12.5],[24,2,-15]],['interior',[27,1.7,-20],[34,2.2,-24]],['heart',[21,1.7,-19],[0,5,-33]]]){
  const budget=await p.evaluate(({pos,target})=>{const g=window.__SOULFALL__.game;g.player.set(...pos);g.yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]);g.pitch=Math.atan2(target[1]-pos[1],Math.hypot(target[0]-pos[0],target[2]-pos[2]));g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);return{calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles};},{pos,target});const path=`docs/media/build43-${baseline?'baseline':'final'}-${label}.png`;await p.screenshot({path});captures.push({path,budget});
 }
 let contracts;
 if(!baseline)contracts=await p.evaluate(async()=>{
 const T=await import('/node_modules/three/build/three.module.js'),g=window.__SOULFALL__.game,w=g.world.workshop,v=(x,y,z)=>new T.Vector3(x,y,z);
 const routes=[];for(const [a,b]of [[[22,-5],[24,-12.5]],[[24,-12.5],[0,-30]],[[31,-25],[24,-12.5]],[[16,-25],[27,-20]],[[27,-20],[-24,-13]],[[27,-20],[0,31]],[[30,-28],[27,-20]]]){const path=g.navigation.path({x:a[0],z:a[1]},{x:b[0],z:b[1]});if(!path.length)throw Error('No path '+JSON.stringify([a,b]));routes.push({a,b,nodes:path.length});}
 const solids=w.parts.filter(p=>p.solid);for(const part of solids){const a=part.center.map((x,i)=>x-part.size[i]/2),b=part.center.map((x,i)=>x+part.size[i]/2);if(!g.world.colliders.some(c=>c.min.toArray().every((x,i)=>Math.abs(x-a[i])<1e-6)&&c.max.toArray().every((x,i)=>Math.abs(x-b[i])<1e-6)))throw Error('Missing exact solid '+part.name);}
 const clear=[[24,-12.5],[31,-25],[16,-25],[22,-5],[23,-19],[26,-29],[29,-9]].map(([x,z])=>({x,z,clear:g.canOccupy(x,z,.55)}));if(clear.some(p=>!p.clear))throw Error('Clearance failure '+JSON.stringify(clear));
 const leaks=()=>{let n=0;const sh=g.world.shelters,r=g.world.rainPositions;for(let i=0;i<r.length;i+=6)if(sh.some(s=>r[i]>=s.minX&&r[i]<=s.maxX&&r[i+2]>=s.minZ&&r[i+2]<=s.maxZ&&r[i+4]<s.ceiling))n++;return n;};const initialLeaks=leaks();for(let i=0;i<180;i++)g.world.update(1/60,i/60);const updateLeaks=leaks();
 const los={westOpen:g.hasLineOfSight(v(20,1.3,-19),v(30,1.3,-19),0),rigBlocks:g.hasLineOfSight(v(31,1.3,-24),v(36.8,1.3,-24),0),southOpen:g.hasLineOfSight(v(27,1.3,-4),v(27,1.3,-24),0)};
 return{routes,solidCount:solids.length,clear,initialLeaks,updateLeaks,los,maxExpanded:g.navigation.maxExpanded};
 });
 if(contracts){assert.equal(contracts.initialLeaks,0);assert.equal(contracts.updateLeaks,0);assert.deepEqual(contracts.los,{westOpen:true,rigBlocks:false,southOpen:true});}
 assert.deepEqual(errors,[]);writeFileSync(`docs/quality-reviews/build43-${baseline?'baseline':'workshop'}.json`,JSON.stringify({method:'Arranged test=1 real Three.js renderer; software WebGL no hardware FPS claim',captures,contracts,errors},null,2));
}finally{await b.close()}
