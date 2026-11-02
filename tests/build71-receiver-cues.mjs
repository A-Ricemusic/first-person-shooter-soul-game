import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const baseline=process.env.RECEIVER_BASELINE==='1',variant=process.env.RECEIVER_FALLBACK==='1'?'fallback':'glb',prefix=`build71-parent-${baseline?'before':'after'}-${variant}`;
const report={method:'Privileged arranged actual-world visibility/UI fixtures, not ordinary play or independent discovery.',baseline,variant,errors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));
 if(variant==='fallback')await page.route('**/assets/build70-access-receiver.glb',r=>r.abort());
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)};});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 report.rows=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),{default:parts}=await import('/src/build70-access-terminal-parts.json');g.requestLock=()=>{};g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.phase='playing';
  const rows=[];
  for(const c of g.coreNodes)for(const distance of [2.7,3.2,3.8,6])for(const [side,dx,dz]of [['south',0,1],['north',0,-1],['east',1,0],['west',-1,0]]){
   g.player.set(c.position.x+dx*distance,1.7,c.position.z+dz*distance);g.grounded=true;g.vault=null;g.aim=false;g.yaw=Math.atan2(dx,dz);g.pitch=0;g.routeWaypoint=null;g.runTime=40;g.animate(0);g.emit();
   const markers=g.captureMarkers(),m=markers.find(m=>m.id===`core-${c.id}`);g.onMarkers(markers);
   const target=c.position.clone().setY(1.7),ray=new T.Ray(g.player.clone(),target.clone().sub(g.player).normalize());
   const blockers=g.world.colliders.map((b,index)=>({b,index,hit:ray.intersectBox(b,new T.Vector3())})).filter(x=>x.hit&&x.hit.distanceTo(g.player)<=distance).sort((a,b)=>a.hit.distanceTo(g.player)-b.hit.distanceTo(g.player));
   const first=blockers[0],part=first&&parts.find(p=>p.name!=='Progress'&&['x','y','z'].every((k,i)=>Math.abs(first.b.min[k]-(c.position[k]+p.position[i]-p.size[i]/2))<1e-5));
   const el=document.querySelector(`[data-marker-id="core-${c.id}"]`);
   rows.push({id:c.id,side,distance,legal:g.canOccupy(g.player.x,g.player.z,.35),occluded:m?.occluded,suppressed:m?.suppressed,approach:m?.approach,opacity:el?getComputedStyle(el).opacity:null,blockedNote:document.querySelector('#blocked-signal')?.textContent,firstBlockerOwnPart:part?.name||null,ready:g.captureState().recoveryReady,marker:m?{x:m.x,y:m.y,front:m.front}:null});
  }
  return rows;
 });
 if(!baseline){
  const valid=report.rows.filter(r=>r.legal);assert.ok(valid.length>=30);
  for(const id of [0,1,2])for(const side of ['north','south']){const r=valid.find(r=>r.id===id&&r.side===side&&r.distance===3.8);assert.ok(r&&!r.occluded&&!r.suppressed&&Number(r.opacity)>0,`Visible nearby ${id}/${side} keeps approach direction`);}
  assert.ok(valid.filter(r=>r.distance===2.7).every(r=>r.ready&&r.suppressed),'Ready interactions keep duplicate direction quiet');
  report.contracts=await page.evaluate(async()=>{
   const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),{receiverSight}=await import('/src/receiver-sight.js'),{CROUCHED,STANDING}=await import('/src/movement.js');
   const checks=[],ok=(v,name)=>{if(!v)throw Error(name);checks.push(name)};
   const originalBounds=g.world.colliders.map(b=>[...b.min.toArray(),...b.max.toArray()]);
   const pose=(id,d=3.8)=>{const c=g.coreNodes[id];g.player.set(c.position.x,1.7,c.position.z-d);g.profile=STANDING;g.grounded=true;g.phase='playing';g.yaw=Math.PI;g.pitch=0;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());return c;};
   for(let id=0;id<3;id++){
    const c=pose(id),point=receiverSight(g.world,g.player,id);ok(!!point,`real visible receiver surface ${id}`);
    ok(!g.canOccupy(c.position.x,c.position.z,.35),`receiver remains movement solid ${id}`);
    const face=c.position.clone().setY(.5);ok(!g.hasLineOfSight(g.player,face,0),`receiver still blocks a shot into its own housing ${id}`);
    const z=c.position.z-1.9,wall=new T.Box3(new T.Vector3(c.position.x-2,0,z-.08),new T.Vector3(c.position.x+2,5,z+.08));g.world.colliders.push(wall);
    try{ok(!receiverSight(g.world,g.player,id),`foreign full-height cover hides all probes ${id}`);g.onMarkers(g.captureMarkers());ok(!document.querySelector(`[data-marker-id="core-${id}"]`)&&document.querySelector('#blocked-signal').textContent.includes('BEHIND COVER'),`fully hidden terminal has no through-wall direction ${id}`);}
    finally{g.world.colliders.pop();}
    wall.max.y=1.5;g.world.colliders.push(wall);
    try{const high=receiverSight(g.world,g.player,id);ok(high&&high.y>1.5,`visible upper surface survives partial lower cover ${id}`);}finally{g.world.colliders.pop();}
    pose(id);g.profile=CROUCHED;g.player.y=1.05;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());ok(!g.captureState().recoveryReady&&!!receiverSight(g.world,g.player,id),`crouched outside-reach cue retains actual surface ${id}`);
    pose(id,2.7);g.grounded=false;g.emit();g.onMarkers(g.captureMarkers());const airborne=g.captureMarkers().find(m=>m.id===`core-${id}`);ok(!g.captureState().recoveryReady&&airborne.approach&&!airborne.suppressed,`airborne unavailable hold retains direction ${id}`);
    pose(id);g.yaw=0;g.animate(0);g.onMarkers(g.captureMarkers());const el=document.querySelector(`[data-marker-id="core-${id}"]`),symbol=el.querySelector('.marker-symbol'),style=getComputedStyle(symbol);ok(el.classList.contains('edge')&&style.display!=='inline'&&style.transform!=='none',`rear arrow is a transformable element ${id}`);
    const r=symbol.getBoundingClientRect(),p=document.querySelector('#interaction').getBoundingClientRect();ok(r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom,`direction glyph avoids interaction panel ${id}`);
    g.phase='paused';g.onMarkers(g.captureMarkers());ok(!document.querySelector(`[data-marker-id="core-${id}"]`),`pause clears receiver cue ${id}`);
    pose(id);c.collected=true;g.onMarkers(g.captureMarkers());ok(!document.querySelector(`[data-marker-id="core-${id}"]`),`collected receiver cue removed ${id}`);c.collected=false;
   }
   ok(JSON.stringify(originalBounds)===JSON.stringify(g.world.colliders.map(b=>[...b.min.toArray(),...b.max.toArray()])),'all physical bounds unchanged');
   return checks;
  });
 }
 mkdirSync(`docs/media/${prefix}`,{recursive:true});
 for(const [name,side,distance]of [['north-outside','north',3.8],['south-outside','south',3.8],['north-ready','north',2.7]]){
  await page.evaluate(({side,distance})=>{const g=window.__SOULFALL__.game,c=g.coreNodes[1];g.player.set(c.position.x,1.7,c.position.z+(side==='north'?-distance:distance));g.yaw=side==='north'?Math.PI:0;g.pitch=0;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);},{side,distance});
  await page.screenshot({path:`docs/media/${prefix}/${name}.jpg`,type:'jpeg',quality:85});
 }
 assert.deepEqual(report.errors,[]);
}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));await browser.close()}
