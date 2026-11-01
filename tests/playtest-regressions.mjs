// Focused regressions from browser playtest observations, not a fun/quality rating.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync,writeFileSync} from 'node:fs';
const base=process.env.PLAYTEST_URL||'http://127.0.0.1:5173/';
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const b=await chromium.launch({...(existsSync(chrome)?{executablePath:chrome}:{}),headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const checks=[];
try {
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto(`${base}?test=1`);await p.waitForFunction(()=>window.__SOULFALL__?.game.weaponAsset,null,{timeout:60000});await p.click('#deploy');
 await p.mouse.down({button:'right'});await p.waitForTimeout(500);
 // Test the actual imported Blender mesh against the central sightline, excluding the HUD.
 const sight=await p.evaluate(async()=>{const T=await import('/node_modules/three/build/three.module.js');const g=window.__SOULFALL__.game;g.weapon.updateWorldMatrix(true,true);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,0),g.camera);const hits=ray.intersectObject(g.weaponAsset,true).filter(h=>h.object.visible);return {hits:hits.map(h=>({name:h.object.name,distance:h.distance})),aim:g.aimBlend};});
 assert.ok(sight.aim>.9);assert.deepEqual(sight.hits,[],'ADS aperture must not intersect the central ray');checks.push({name:'Actual Blender optic leaves center sightline clear while aiming',status:'passed'});
 mkdirSync('docs/media',{recursive:true});await p.screenshot({path:'docs/media/current-playtest-ads-after.png'});await p.mouse.up({button:'right'});
 await p.evaluate(()=>window.__SOULFALL__.game.debug.collectCore(2));await p.waitForFunction(()=>document.querySelector('#core-slots').children[2].classList.contains('recovered'));
 assert.deepEqual(await p.locator('#core-slots span').evaluateAll(xs=>xs.map(x=>x.classList.contains('recovered'))),[false,false,true]);checks.push({name:'Recovering core 03 lights 03 rather than 01',status:'passed'});
 const input=await p.evaluate(()=>{const e=new KeyboardEvent('keydown',{code:'KeyW',ctrlKey:true,bubbles:true,cancelable:true});document.querySelector('#game-canvas').dispatchEvent(e);document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));return e.defaultPrevented});assert.equal(input,true);checks.push({name:'Sprint movement suppresses browser Ctrl+W shortcut',status:'passed'});
 console.log(JSON.stringify(checks,null,2));writeFileSync('docs/current-playtest-regressions.json',JSON.stringify({timestamp:new Date().toISOString(),checks,limitation:'Targeted automated checks with test hooks; not independent human feedback.'},null,2)+'\n');
}finally{await b.close()}
