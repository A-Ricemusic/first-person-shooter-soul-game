import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const prefix=process.env.SENTINEL_AUDIT_PREFIX||'build72-implementation-final';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={method:'Privileged arranged renderer/mesh audit of current Sentinel and complete visible actor including contact rig. Not ordinary play, independent review, fun or performance evidence.',errors:[]};
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options)};});
 if(process.env.SENTINEL_FORCE_FAILURE)await p.route('**/assets/build72-implementation-sentinel.glb',r=>r.abort());
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
 report.mechanism=await p.evaluate(async()=>{
 const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),{GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js'),{attachLegs,animateLegs}=await import('/src/drone-motion.js');
 const e=g.enemies[0],r=e.droneRig;
 const old=(await new GLTFLoader().loadAsync('/assets/sentinel.glb')).scene;
 const oldGroup=new T.Group();oldGroup.add(old);const lr={legs:attachLegs(old,oldGroup)};animateLegs(lr,oldGroup,new T.Vector3(),1/60);oldGroup.updateMatrixWorld(true);
 e.group.position.set(0,0,0);e.group.rotation.y=0;r.previous.copy(e.group.position);g.animateDrone(e,1/60);e.group.updateMatrixWorld(true);
 const sample=model=>{const rc=new T.Raycaster(),hits=[];for(let y=.1;y<=1.7;y+=.025)for(let x=-.45;x<=.45;x+=.025){rc.set(new T.Vector3(x,y,3),new T.Vector3(0,0,-1));if(rc.intersectObject(model,true).length)hits.push([+x.toFixed(3),+y.toFixed(3)]);}return hits;};
 const legacy=sample(old),current=sample(r.model),a=new Set(legacy.map(JSON.stringify)),b=new Set(current.map(JSON.stringify));
 const states=[];let maxRadius=0,maxOpticError=0,maxLinkGap=0,minFoot=Infinity;
 for(const state of ['walk','strafe','turn','stop','windup','fireRecovery','contact','hit','stagger','reset']){
  for(let frame=0;frame<24;frame++){
   e.windup=state==='windup'?.65*(1-frame/24):0;e.fireRecovery=state==='fireRecovery'?.45*(1-frame/24):0;e.contactWindup=state==='contact'?.55*(1-frame/24):0;e.hitFlash=state==='hit'?.16*(1-frame/24):0;e.stagger=state==='stagger'?.3:0;
   if(state==='walk')e.group.position.z+=.018;if(state==='strafe')e.group.position.x+=.018;if(state==='turn')e.group.rotation.y+=.035;
   g.animateDrone(e,1/60);e.group.updateMatrixWorld(true);
   const optic=r.model.getObjectByName('Optic').getWorldPosition(new T.Vector3()),expected=new T.Vector3(0,1.3,.418).applyAxisAngle(new T.Vector3(0,1,0),e.group.rotation.y).add(e.group.position);maxOpticError=Math.max(maxOpticError,optic.distanceTo(expected));
   e.group.traverseVisible(n=>{if(!n.isMesh)return;const p=n.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld).sub(e.group.position);maxRadius=Math.max(maxRadius,Math.hypot(v.x,v.z));}});
   for(const l of r.legs){const end=(m,y)=>new T.Vector3(0,y,0).applyMatrix4(m.matrix);maxLinkGap=Math.max(maxLinkGap,end(l.upper,.5).distanceTo(l.knee.position),end(l.lower,-.5).distanceTo(l.knee.position),end(l.lower,.5).distanceTo(l.foot.position));minFoot=Math.min(minFoot,l.foot.position.y-.065);}
  }
  states.push({state,feet:r.legs.map(l=>l.foot.position.toArray()),top:r.top.position.y,damper:r.vanes.map(v=>v.rotation.x)});
 }
 e.group.position.set(-8,0,-15);e.group.rotation.y=0;r.previous.copy(e.group.position);for(const l of r.legs){l.world.set(l.x,.065,0).add(e.group.position);l.heading=0;}e.windup=e.fireRecovery=e.contactWindup=e.hitFlash=e.stagger=0;g.animateDrone(e,1/60);
 const emitterRay=new T.Raycaster(new T.Vector3(-8,1.3,-15+.43001),new T.Vector3(0,0,1));e.group.updateMatrixWorld(true);const forwardObstructions=emitterRay.intersectObject(e.group,true).filter(h=>h.object.visible&&h.distance<.2).map(h=>({name:h.object.name,distance:h.distance}));
 return {forwardObstructions,finiteSamples:240,maxRadius,maxOpticError,maxLinkGap,minFoot,states,bodySilhouette:{method:'Front parallel physical mesh rays on .025m grid. No precision spheres in either sample. Deliberate physical body eligibility change, not a damage/health tuning.',legacyHits:legacy.length,newHits:current.length,added:current.filter(v=>!a.has(JSON.stringify(v))),removed:legacy.filter(v=>!b.has(JSON.stringify(v)))}};
 });
 mkdirSync(`docs/media/${prefix}`,{recursive:true});await p.waitForTimeout(2900);
 for(const distance of [3,12,24]){
  await p.evaluate(distance=>{const g=window.__SOULFALL__.game;g.player.set(-8,1.7,-15+distance);g.yaw=0;g.pitch=Math.atan2(-.4,distance);g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);},distance);
  await p.screenshot({path:`docs/media/${prefix}/front-${distance}m.jpg`,type:'jpeg',quality:85});
 }
 for(const distance of [3,12,24])for(const [name,yaw,height,ads] of [['side',Math.PI/2,1.7,false],['rear',Math.PI,1.7,false],['crouch',0,1.05,false],['ads',0,1.7,true]]){
  await p.evaluate(async({yaw,height,ads,distance})=>{const g=window.__SOULFALL__.game,{STANDING,CROUCHED}=await import('/src/movement.js');g.profile=height<1.7?CROUCHED:STANDING;g.crouchRequested=height<1.7;g.enemies[0].group.rotation.y=yaw;g.player.set(-8,height,-15+distance);g.aim=ads;g.yaw=0;g.pitch=Math.atan2(1.3-height,distance);g.animate(1);g.renderer.render(g.scene,g.camera);},{yaw,height,ads,distance});
  await p.screenshot({path:`docs/media/${prefix}/${name}-${distance}m.jpg`,type:'jpeg',quality:85});
 }
 report.motion=[];
 for(const [state,windup,recovery,hit]of [['plant',0,0,0],['brace',.15,0,0],['recovery',0,.45,0],['impact',0,0,.16],['settled',0,0,0]]){
  report.motion.push(await p.evaluate(({state,windup,recovery,hit})=>{const g=window.__SOULFALL__.game,e=g.enemies[0];g.profile={eyeHeight:1.7,bodyHeight:1.9};g.player.set(-8,1.7,-12);g.aim=false;g.yaw=0;g.pitch=-.13;e.group.rotation.y=0;e.windup=windup;e.fireRecovery=recovery;e.hitFlash=hit;g.animateDrone(e,1/60);g.animate(0);g.renderer.render(g.scene,g.camera);return{state,shutterY:e.droneRig.top.position.y,damper:e.droneRig.vanes[0].rotation.x,drawCalls:g.renderer.info.render.calls};},{state,windup,recovery,hit}));
  await p.screenshot({path:`docs/media/${prefix}/motion-${state}.jpg`,type:'jpeg',quality:85});
 }
 if(report.mechanism.maxRadius>.45118||report.mechanism.maxOpticError>1e-6||report.mechanism.maxLinkGap>1e-5||report.mechanism.minFoot< -1e-6)throw Error('Mechanism constraints failed; see retained report');

}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));await browser.close()}
