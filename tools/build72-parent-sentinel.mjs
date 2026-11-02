import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const prefix=process.env.SENTINEL_AUDIT_PREFIX||'build72-parent-baseline';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={method:'Privileged arranged renderer/mesh audit of current Sentinel and complete visible actor including contact rig. Not ordinary play, independent review, fun or performance evidence.',errors:[]};
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)};});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy',{force:true});
 report.audit=await p.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),{animateContact}=await import('/src/contact-discharge.js');g.requestLock=()=>{};g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.spawnEnemy(new T.Vector3(-8,0,-15),'sentinel');const e=g.enemies[0];g.runTime=40;
  const bounds=root=>{let radius=0,triangles=0,meshes=0,min=new T.Vector3(Infinity,Infinity,Infinity),max=new T.Vector3(-Infinity,-Infinity,-Infinity);root.traverseVisible(n=>{if(!n.isMesh)return;meshes++;const a=n.geometry.attributes.position;triangles+=(n.geometry.index?.count||a.count)/3;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld).sub(e.group.position);radius=Math.max(radius,Math.hypot(v.x,v.z));min.min(v);max.max(v)}});return{radius,meshes,triangles,min:min.toArray(),max:max.toArray(),size:max.sub(min).toArray()}};
  const rows=[];
  for(const state of ['idle','charge','recovery','contact','flash','stagger'])for(const yaw of [0,Math.PI/4,Math.PI]){
   e.group.rotation.y=yaw;e.windup=state==='charge'?.1:0;e.fireRecovery=state==='recovery'?.45:0;e.contactWindup=state==='contact'?.1:0;e.contactFlash=state==='flash'?.22:0;e.stagger=state==='stagger'?.5:0;e.lastAttack=state==='recovery'?g.runTime:-100;e.group.position.x+=.01;
   g.animateDrone(e,1/60);animateContact(e,1/60);e.group.updateWorldMatrix(true,true);
   const optic=e.droneRig.model.getObjectByName('Optic').getWorldPosition(new T.Vector3()),expected=new T.Vector3(0,1.3,.418).applyAxisAngle(new T.Vector3(0,1,0),yaw).add(e.group.position);
   rows.push({state,yaw,authored:bounds(e.droneRig.model),fullVisibleActor:bounds(e.group),contact:bounds(e.contactRig.model),opticError:optic.distanceTo(expected)});
  }
  e.group.position.set(-8,0,-15);e.group.rotation.y=0;e.windup=0;e.fireRecovery=0;e.contactWindup=0;e.contactFlash=0;e.stagger=0;e.lastAttack=-100;g.animateDrone(e,1/60);animateContact(e,1/60);
  const names=['Optic','ShutterTop','ShutterBottom'];return{asset:!!g.sentinelAsset,rows,parts:names.map(name=>{const n=e.droneRig.model.getObjectByName(name);return{name,position:n.position.toArray()}}),movementRadius:.45,navigationRadius:.55};
 });
 mkdirSync(`docs/media/${prefix}`,{recursive:true});await p.waitForTimeout(2900);
 for(const distance of [3,12,24]){
  await p.evaluate(distance=>{const g=window.__SOULFALL__.game;g.player.set(-8,1.7,-15+distance);g.yaw=0;g.pitch=Math.atan2(-.4,distance);g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);},distance);
  await p.screenshot({path:`docs/media/${prefix}/front-${distance}m.jpg`,type:'jpeg',quality:85});
 }
}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));await browser.close()}
