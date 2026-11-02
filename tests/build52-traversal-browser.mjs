import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const fallback=process.env.VAULT_FALLBACK==='1';const checks=[],errors=[];mkdirSync('docs/media/build52-implementation-fixtures',{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errors.push(e.message));if(fallback)await p.route('**/*.glb',r=>/coil-rifle-handling|operator-hands|pump-breacher/.test(r.request().url())?r.abort():r.continue());
 await p.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});
 await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:100,timeout:60000});await p.click('#deploy',{force:true});
 const candidate=await p.evaluate(async()=>{const g=window.__SOULFALL__.game;g.clearRun();g.pointerFallback=true;document.exitPointerLock?.();g.encounters=new Set(['ingress','west','east','heart']);const {planVault}=await import('/src/traversal.js');for(const b of g.world.colliders){if(b.max.y<.45||b.max.y>1.45)continue;for(const sign of [-1,1]){const pos={x:(b.min.x+b.max.x)/2,y:1.7,z:sign>0?b.max.z+.55:b.min.z-.55},direction={x:0,z:-sign};if(planVault({player:pos,grounded:true},g.world,direction)){g.player.set(pos.x,pos.y,pos.z);g.yaw=sign>0?0:Math.PI;return {pos,direction,box:{min:b.min.toArray(),max:b.max.toArray()}};}}}throw Error('No actual prop vault candidate');});checks.push({name:'actual static world candidate, arranged start only',candidate});
 for(const weapon of ['rifle','breacher']){
 await p.keyboard.press(weapon==='rifle'?'Digit1':'Digit2');
 await p.evaluate(({pos,direction})=>{const g=window.__SOULFALL__.game;g.player.set(pos.x,pos.y,pos.z);g.grounded=true;g.vault=null;g.yaw=direction.z<0?0:Math.PI;},candidate);
 await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.setSettings({reducedMotion:g.activeWeapon==='breacher'});g.ammo--;g.reload();});
 await p.keyboard.press('Space');let start=await p.evaluate(()=>{const g=window.__SOULFALL__.game;return {vault:!!g.vault,ammo:g.ammo,health:g.health,cd:g.dashCooldown};});assert(start.vault);
 await p.mouse.down();await p.keyboard.press('ShiftLeft');await p.keyboard.press('Space');
 await p.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<36;i++)g.update(1/120);g.animate(.3);g.emit();g.renderer.render(g.scene,g.camera);});
 const mid=await p.evaluate(()=>{const g=window.__SOULFALL__.game;return {vault:!!g.vault,ammo:g.ammo,cd:g.dashCooldown,grounded:g.grounded,pose:g.weapon.position.toArray(),elapsed:g.vault?.elapsed};});assert(mid.vault);assert.equal(mid.ammo,start.ammo);assert.equal(mid.cd,start.cd);assert(!mid.grounded);
 await p.screenshot({path:`docs/media/build52-implementation-fixtures/${fallback?'fallback-':''}${weapon}-support.jpg`});
 await p.keyboard.press('Escape');await p.evaluate(()=>window.__SOULFALL__.game.update(1));assert.equal(await p.evaluate(()=>window.__SOULFALL__.game.vault.elapsed),mid.elapsed);
 await p.click('#resume',{force:true});await p.waitForTimeout(150);await p.keyboard.press('KeyM');const frozen=await p.evaluate(()=>{const g=window.__SOULFALL__.game;const t=g.vault.elapsed;g.update(1);return {phase:g.phase,elapsed:g.vault?.elapsed,t};});assert(frozen.phase==='planning'&&frozen.elapsed===frozen.t,JSON.stringify(frozen));await p.keyboard.press('KeyM');await p.mouse.up();await p.evaluate(()=>{const g=window.__SOULFALL__.game;for(let i=0;i<45;i++)g.update(1/120);g.animate(.3);});assert(await p.evaluate(()=>{const g=window.__SOULFALL__.game;return !g.vault&&g.grounded&&Math.abs(g.player.y-1.7)<1e-6;}));checks.push({name:weapon+' actual Space, repeat, fire/phase blocked, pause frozen, resume landing',start,mid});
 }
 const reset=await p.evaluate(()=>{const g=window.__SOULFALL__.game;g.vault={elapsed:.1};g.start();return !g.vault;});assert(reset);checks.push('reset clears traversal');
 assert.deepEqual(errors,[]);
}finally{await browser.close();writeFileSync(`docs/quality-reviews/build52-implementation-${fallback?'fallback-':''}browser.json`,JSON.stringify({checks,errors},null,2));}
