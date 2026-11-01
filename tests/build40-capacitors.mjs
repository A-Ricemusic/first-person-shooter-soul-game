import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const out='docs/media/build40-capacitors';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.nativeRAF=requestAnimationFrame;window.requestAnimationFrame=cb=>(window.__nextFrame=cb,1)});
 await page.goto('http://127.0.0.1:5173/?test=1');await page.waitForFunction(()=>window.__SOULFALL__,null,{polling:100,timeout:60000});await page.locator('#deploy').click({force:true});
 const result=await page.evaluate(async()=>{
 const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),H=await import('/src/capacitors.js');
 const checks=[];const ok=(name,value)=>{checks.push({name,value});if(!value)throw Error(name)};
 const b=g.world.capacitors[0];ok('exactly two authored banks',g.world.capacitors.length===2&&!b.fallback&&b.targets.length>0);
 g.player.set(29,1.7,-6);g.yaw=0;g.pitch=-.1;g.recoil=0;g.aim=true;g.syncCamera();g.shoot();ok('normal rifle body activates; ammo and accuracy honest',b.state==='warning'&&g.ammo===29&&g.shotsFired===1&&g.shotsHit===0);
 g.fireTimer=0;g.shoot();ok('repeated shot does not stack timer',b.timer===1.1);
 g.phase='planning';g.update(.9);ok('planning freezes timer',b.timer===1.1);g.phase='playing';
 const body=b.origin.clone().add(new T.Vector3(0,0,5.99));ok('3D inside radius',H.blastReaches(b,body,[]));ok('3D raised outside radius',!H.blastReaches(b,body.clone().add(new T.Vector3(0,2,0)),[]));ok('edge inclusive',H.blastReaches(b,b.origin.clone().add(new T.Vector3(6,0,0)),[]));
 const cover=new T.Box3(b.origin.clone().add(new T.Vector3(-1,-1,2)),b.origin.clone().add(new T.Vector3(1,1,3)));ok('solid cover stops burst',!H.blastReaches(b,body,[cover]));cover.capacitor=b;ok('own bounds alone excluded',H.blastReaches(b,body,[cover]));cover.capacitor=g.world.capacitors[1];ok('other bank bounds block',!H.blastReaches(b,body,[cover]));
 g.player.copy(b.origin).add(new T.Vector3(0,.5,3));g.shield=60;g.health=100;g.invulnerable=0;H.updateCapacitors(g,1.09);ok('warning persists before boundary',b.state==='warning'&&g.shield===60);H.updateCapacitors(g,.01);ok('one 35 damage discharge',b.state==='spent'&&g.shield===25&&g.health===100);H.updateCapacitors(g,2);ok('no repeat damage',g.shield===25);
 H.resetCapacitors(g.world.capacitors);g.invulnerable=.4;H.activateCapacitor(g,b);H.updateCapacitors(g,1.1);ok('phase award once',g.phaseDodges===1&&g.shield===25);H.updateCapacitors(g,1);ok('phase no farming',g.phaseDodges===1);
 H.resetCapacitors(g.world.capacitors);g.invulnerable=0;g.player.set(29,1.7,-2);const e=g.enemies[0];e.group.position.set(29,0,-9);e.health=89;const k=g.kills,h=g.headshots,sh=g.shotsHit;H.activateCapacitor(g,b);H.updateCapacitors(g,1.1);ok('actual area kill without critical or accuracy credit',g.kills===k+1&&g.headshots===h&&g.shotsHit===sh);H.updateCapacitors(g,1);ok('no duplicate reward',g.kills===k+1);
 g.restart();ok('restart resets all banks' ,g.world.capacitors.every(b=>b.state==='intact'&&b.timer===0));return checks;
 });checks.push(...result);
 for(const state of ['intact','warning','spent','discharge','square-reduced']){
 if(state==='square-reduced')await page.setViewportSize({width:900,height:900});
 if(state==='warning')await page.mouse.down({button:'right'});
 await page.evaluate(async state=>{const g=window.__SOULFALL__.game,H=await import('/src/capacitors.js');g.player.set(29,1.7,-7);g.yaw=0;g.pitch=.06;g.recoil=0;g.aim=state==='warning';g.options.reducedMotion=state==='square-reduced';const b=g.world.capacitors[0];b.state=state==='discharge'?'spent':state==='square-reduced'?'warning':state;b.flash=state==='discharge'?.15:0;b.timer=.55;H.visualCapacitor(b,g.options.reducedMotion);g.syncCamera();g.animate(.5);document.querySelector('#pause').classList.add('hidden');document.querySelector('#hud').classList.remove('hidden');g.renderer.render(g.scene,g.camera);},state);await page.evaluate(()=>{const g=window.__SOULFALL__.game;if(!window.__captureLoop){window.__captureLoop=true;const render=()=>{g.renderer.render(g.scene,g.camera);window.nativeRAF(render)};render()}});await page.waitForTimeout(80);await page.screenshot({path:`${out}/${state}.png`});if(state==='warning')await page.mouse.up({button:'right'});
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();writeFileSync('docs/quality-reviews/build40-capacitors.json',JSON.stringify({checks,errors,browserClosed:true,method:'Arranged test URL, actual renderer and normal shoot API; not ordinary play.'},null,2));}
