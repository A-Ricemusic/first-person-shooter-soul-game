import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,options){return get.call(this,type,/webgl/.test(type)?{...options,preserveDrawingBuffer:true}:options);};});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.requestLock=()=>{};g.pointerFallback=true;});await page.click('#deploy',{force:true});

 const result=await page.evaluate(async()=>{
 const g=window.__SOULFALL__.game,{serviceStatus,resetService}=await import('/src/suit-service.js'),{STANDING,CROUCHED}=await import('/src/movement.js'),L=(await import('/src/suit-service-layout.json')).default;
 const checks=[],ok=(v,s)=>{if(!v)throw Error(s);checks.push(s)};
 function setup(difficulty='standard'){g.restart({difficulty});g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.player.set(-2.05,1.7,31);g.profile=STANDING;g.grounded=true;g.cores=3;g.custodian.active=true;g.custodian.dead=true;g.health=30;g.shield=0;g.lastDamage=g.runTime;g.keys.clear();g.vault=null;g.dashTime=0;g.invulnerable=0;resetService(g);}
 function hold(t){g.keys.add('KeyE');for(let i=0;i<Math.round(t*120);i++){g.extractionProgress=0;g.update(1/120);}g.emit();}
 setup();let notices=0;const originalEvent=g.event;g.event=function(type,...args){if(type==='notice')notices++;return originalEvent.call(this,type,...args)};g.interact();ok(notices===0,'service E does not issue generic memory approach notice');g.event=originalEvent;ok(g.canOccupy(-2.05,31),'actual grounded service stance clears cabinet and west footing');ok(serviceStatus(g).valid,'standing face has real world LOS');
 g.custodian.dead=false;g.custodian.active=false;hold(2.2);ok(!g.suitService.spent&&g.suitService.progress===0,'live custodian locks real held E');g.custodian.dead=true;g.cores=2;hold(2.2);ok(!g.suitService.spent,'missing memory locks');g.cores=3;
 g.health=100;g.shield=60;hold(2.2);ok(!g.suitService.spent,'full suit preserves cartridge');g.health=30;g.shield=0;hold(1);ok(g.suitService.progress>.9&&!g.suitService.spent,'partial real hold');g.keys.clear();g.update(1/120);ok(g.suitService.progress===0,'release resets');
 hold(1);g.damage(1);ok(g.suitService.progress===0,'applied damage resets immediately');g.update(1/120);ok(g.suitService.progress===0,'damage frame cannot build progress');hold(.5);const p=g.suitService.progress;g.invulnerable=1;g.damage(20);ok(g.suitService.progress===p,'rejected damage does not interrupt');g.invulnerable=0;
 setup();hold(.5);g.dash();g.update(1/120);ok(g.suitService.progress===0,'actual phase input action resets held service');setup();hold(.5);g.canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));g.update(1/120);ok(g.suitService.progress===0,'actual jump input resets held service');
 for(const mode of ['air','raised','phase','vault','back','reach']){setup();hold(.5);if(mode==='air'){g.grounded=false;g.player.y=2.5;}if(mode==='raised')g.player.y=2.2;if(mode==='phase')g.dashTime=.2;if(mode==='vault')g.vault={};if(mode==='back')g.player.z=32.7;if(mode==='reach')g.player.x=0;ok(!serviceStatus(g).valid,mode+' rejects actual eligibility');const {updateService}=await import('/src/suit-service.js');updateService(g,.1);ok(g.suitService.progress===0,mode+' clears unfinished hold');}
 setup();hold(.5);g.openPlanning();ok(g.suitService.progress===0&&!g.keys.has('KeyE'),'planning clears input/progress');g.closePlanning();g.extractionProgress=0;g.update(.1);ok(g.suitService.progress===0,'planning resume no catchup');hold(.5);g.pause();ok(g.suitService.progress===0&&!g.keys.has('KeyE'),'pause clears channel');
 for(const posture of [STANDING,CROUCHED]){setup();g.profile=posture;g.crouchRequested=posture===CROUCHED;g.player.y=posture.eyeHeight;hold(1.99);ok(!g.suitService.spent,'no early grant '+posture.eyeHeight);hold(.03);ok(g.suitService.spent&&g.health===70&&g.shield===60,'atomic capped grant '+posture.eyeHeight);hold(2.2);ok(g.health===70,'held E cannot double grant');}
 setup();g.health=85;hold(2.1);ok(g.health===100&&g.shield===60,'health cap 100 armor60');g.restart();ok(!g.suitService.spent&&g.suitService.progress===0&&!serviceStatus(g).powered,'restart restores locked cartridge');
 setup();hold(.5);g.finish(false);ok(g.suitService.progress===0&&!g.keys.has('KeyE'),'death clears channel');setup();hold(.5);g.finish(true);ok(g.suitService.progress===0,'win clears channel');
 setup();const stance=new g.player.constructor(-2.05,1.2,31),front=new g.player.constructor(-2.05,1.2,24),flank=new g.player.constructor(-8,1.2,31);ok(!g.hasLineOfSight(front,stance,0),'west plate blocks front yard line');ok(g.hasLineOfSight(flank,stance,0),'west stance remains exposed to flank');
 ok(g.world.colliders.includes(g.world.suitBounds),'authored envelope registered');ok(g.world.suitBounds.min.x===L.center[0]-L.size[0]/2,'collider metadata agreement');ok(g.playerRoute.path(g.player,'extraction',true,STANDING).length>0,'stance has extraction ground route');
 g.yaw=Math.PI;g.pitch=-.35;for(const difficulty of ['story','standard','veteran']){setup(difficulty);g.health=95;hold(2.05);ok(g.health===100&&g.shield===60,'fixed service caps independent of damage tuning '+difficulty);}
 setup();g.keys.add('KeyE');g.extractionProgress=0;for(let i=0;i<250;i++)g.update(1/120);ok(g.suitService.spent&&g.extractionProgress>2,'upload advances during actual service');
 setup();g.player.set(-2.05,1.7,29);ok(!serviceStatus(g).valid,'real plate blocks service face LOS');
 setup();g.yaw=Math.PI;g.pitch=-.35;g.animate(0);g.emit();g.renderer.render(g.scene,g.camera);return {checks,state:g.captureState().suitService};
 });
 await page.screenshot({path:'docs/media/build60-arranged-service.png'});
 assert.deepEqual(errors,[]);writeFileSync('docs/quality-reviews/build60-service-tests.json',JSON.stringify({method:'ARRANGED actors/resources/posture, real held E update loops; geometry LOS and lifecycle assertions. Not independent discovery.',...result,errors},null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
