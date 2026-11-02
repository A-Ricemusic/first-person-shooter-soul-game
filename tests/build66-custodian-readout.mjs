import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];if(process.env.READOUT_FORCE_FALLBACK==='1')await page.route('**/assets/custodian.glb',route=>route.abort());page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy',{force:true});
 const result=await page.evaluate(async()=>{
  const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),V=await import('/src/threat-visor.js'),c=g.custodian,rows=[];
  g.clearRun();g.phase='playing';g.cores=3;c.active=true;c.dead=false;c.cooldown=100;c.windup=0;g.runTime=30;g.grounded=true;
  const independent=new T.Raycaster(),hit=new T.Vector3();
  function aim(p){g.recoil=0;g.yaw=Math.atan2(g.player.x-p.x,g.player.z-p.z);g.pitch=Math.atan2(p.y-g.player.y,Math.hypot(p.x-g.player.x,p.z-g.player.z));g.syncCamera();}
  const expectedLabel=h=>{const n=c.coils[h.object.userData.coil];return n?`COIL ${h.object.userData.coil+1} / ${n.hp<=0?'INERT COVER':c.open>0&&!h.object.userData.shutter?'EXPOSED COMPONENT':'ARMORED'}`:'INERT HOUSING / AIM AT NUMBERED COILS';};
  for(const open of [false,true])for(const dead of [false,true])for(const [x,z] of [[7,16],[6,18],[11,23],[16,16],[11,9],[7,12],[15,12],[15,20]]){
   c.open=open?3:0;c.coils.forEach((n,i)=>n.hp=dead&&i===0?0:160);M.updateCustodian(g,0);g.player.set(x,1.7,z);
   for(const name of ['Bearing_0','Bearing_1','Cast_power_housing','Coil0','Coil1','Coil2']){
    const mesh=c.model.getObjectByName(name);if(!mesh)continue;const point=mesh.getWorldPosition(new T.Vector3());if(name.startsWith('Bearing'))point.y=1.7;aim(point);
    independent.setFromCamera(new T.Vector2(0,0),g.camera);const surface=independent.intersectObject(c.model,true)[0];if(!surface)continue;
    const foreign=g.world.colliders.some(b=>!b.custodian&&(b.containsPoint(g.player)||(independent.ray.intersectBox(b,hit)&&hit.distanceTo(g.player)<=surface.distance)));
    const expected=foreign?null:expectedLabel(surface),actual=M.custodianAim(g),marker=g.captureMarkers().find(m=>m.id==='custodian-focus'),focused=V.threatVisor(marker?[marker]:[],null).focused;
    rows.push({open,spent0:dead,x,z,legal:g.canOccupy(x,z,.4),aim:name,first:surface.object.name,expected,actual:actual?.label??null,marker:marker?.label??null,pointError:actual?.point?actual.point.distanceTo(surface.point):null,focus:focused?.label??null});
   }
  }
  // A broad foreign wall must still suppress both direct readout and generic focus.
  g.player.set(11,1.7,23);c.open=0;c.coils.forEach(n=>n.hp=160);M.updateCustodian(g,0);aim(new T.Vector3(11,2.18,16));const wall=new T.Box3(new T.Vector3(7,0,20),new T.Vector3(15,5,20.3));g.world.colliders.push(wall);const foreignWall={readout:M.custodianAim(g)?.label??null,marker:g.captureMarkers().some(m=>m.id==='custodian-focus')};g.world.colliders.pop();
  g.spawnEnemy(new T.Vector3(11,0,20),'warden');aim(new T.Vector3(11,2.18,16));const actorBlock=M.custodianAim(g)?.label??null;g.clearRun();
  const priorities=[];
  const direct={id:'custodian-focus',kind:'enemy',front:true,x:0,y:0,aimed:true,label:'INERT HOUSING'},previous={id:'patrol',kind:'enemy',front:true,x:.04,y:0,label:'SENTINEL'};
  priorities.push({label:'Direct surface takes existing readout over nearby previous threat',passed:V.threatVisor([previous,direct],'patrol').focused?.id===direct.id});
  priorities.push({label:'Looking away releases direct priority and normal hysteresis resumes',passed:V.threatVisor([previous,{...direct,aimed:false,x:.09}],'patrol').focused?.id==='patrol'});
  priorities.push({label:'Offscreen direct flag cannot force a readout',passed:V.threatVisor([{...direct,x:1.2}],null).focused===undefined});
  const lifecycle=[];for(const phase of ['paused','planning','won','lost']){g.phase=phase;lifecycle.push({phase,marker:g.captureMarkers().some(m=>m.id==='custodian-focus')});}g.phase='playing';
  const failures=[];for(const r of rows){if(r.actual!==r.expected)failures.push({kind:'surface classification',...r});if(r.expected&&r.legal&&(r.marker!==r.expected||r.focus!==r.expected))failures.push({kind:'visible focus',...r});if(r.expected&&(r.pointError===null||r.pointError>1e-6))failures.push({kind:'reticle surface anchor',...r});}
  if(foreignWall.readout||foreignWall.marker)failures.push({kind:'foreign-wall leak',foreignWall});if(actorBlock)failures.push({kind:'closer actor leak',actorBlock});for(const p of priorities)if(!p.passed)failures.push(p);for(const l of lifecycle)if(l.marker)failures.push(l);return {rows,foreignWall,actorBlock,priorities,lifecycle,fallback:c.fallback,failures};
 });
 mkdirSync('docs/media/build66-parent-readout',{recursive:true});
 await page.waitForTimeout(3700); // Let the unrelated deployment notice retire before arranged photographs.
 const frames=[];
 for(const mode of ['support','armored','exposed','spent']){
  const frame=await page.evaluate(async mode=>{const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),M=await import('/src/custodian.js'),c=g.custodian;g.clearRun();g.phase='playing';g.cores=3;g.coreNodes.forEach(n=>n.collected=true);c.active=true;c.dead=false;c.windup=0;c.cooldown=100;c.coils.forEach(n=>n.hp=160);c.open=mode==='exposed'?3:0;if(mode==='spent')c.coils[0].hp=0;M.updateCustodian(g,0);g.player.set(mode==='support'?7:11,1.7,mode==='support'?16:23);g.grounded=true;const target=mode==='support'?new T.Vector3(8.75,1.7,16):new T.Vector3(mode==='spent'?9.35:11,2.18,16);g.recoil=0;g.yaw=Math.atan2(g.player.x-target.x,g.player.z-target.z);g.pitch=Math.atan2(target.y-g.player.y,Math.hypot(target.x-g.player.x,target.z-g.player.z));g.aim=true;g.aimBlend=1;g.camera.fov=56;g.animate(0);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);return{mode,label:M.custodianAim(g)?.label,dom:document.querySelector('#threat-focus')?.textContent,legal:g.canOccupy(g.player.x,g.player.z,.4)};},mode);
  frames.push(frame);await page.screenshot({path:`docs/media/build66-parent-readout/${process.env.READOUT_FORCE_FALLBACK==='1'?'fallback-':''}${mode}.jpg`,type:'jpeg',quality:85});
 }
 for(const f of frames)assert.equal(f.dom,f.label,'Actual one-line DOM readout matches classified surface');
 writeFileSync(process.env.CUSTODIAN_READOUT_OUTPUT||'docs/quality-reviews/build66-parent-readout.json',JSON.stringify({method:'Arranged real model, independent centre-camera mesh ray and foreign-cover queries. Includes legal and explicitly labeled obstructed poses; no ordinary discovery/enjoyment claim.',...result,frames,errors},null,2)+'\n');if(process.env.READOUT_FORCE_FALLBACK==='1')assert.equal(result.fallback,true);assert.deepEqual(result.failures,[]);assert.deepEqual(errors,[]);console.log(`${result.rows.length} actual mesh classification/focus cases plus foreign wall and actor exclusion passed.`);
}finally{await browser.close();}
