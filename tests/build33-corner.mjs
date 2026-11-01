import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=[],captures=[],errors=[];
try{
 const p=await b.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.requestAnimationFrame=cb=>(window.__frame=cb,1);window.cancelAnimationFrame=()=>{}});await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await p.click('#deploy');
 for(const [name,x,z] of [['service-south-turn',-14.9,-13],['right-recovery-south',-21.8,-13.3],['receiver-left',-26,-13.3]])for(const dx of [-.3,0,.3])for(const angle of [-10,0,10]){
  const start=await p.evaluate(({x,z,dx,angle})=>{const g=window.__SOULFALL__.game;g.restart();g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.player.set(x+dx,1.7,z);g.yaw=Math.PI+angle*Math.PI/180;g.pitch=0;return{position:g.player.toArray(),valid:g.canOccupy(g.player.x,g.player.z,.4)}},{x,z,dx,angle});assert.ok(start.valid);
  await p.keyboard.down('KeyW');const end=await p.evaluate(()=>{const g=window.__SOULFALL__.game;let minY=Infinity,maxY=-Infinity;for(let i=0;i<240;i++){g.update(1/120);minY=Math.min(minY,g.player.y);maxY=Math.max(maxY,g.player.y);}return{position:g.player.toArray(),grounded:g.grounded,minY,maxY,dashes:g.dashCount}});await p.keyboard.up('KeyW');rows.push({name,dx,angle,start,end});
 }
 for(const width of [1280,1440])for(const quality of ['low','balanced','high'])for(const ads of [false,true])for(const [name,pos,target] of [['receiver',[-21.8,1.7,-13.3],[-14,1.7,-5]],['yard',[-17,1.7,-4],[-24,2,-16]],['right',[-14.9,1.7,-13],[-14.9,1.7,0]],['south',[-25,1.7,-12],[-25,1.7,0]],['east',[-18,1.7,-16],[-5,1.7,-16]]]){
  await p.setViewportSize({width,height:900});const result=await p.evaluate(({quality,ads,pos,target})=>{const g=window.__SOULFALL__.game;g.setSettings({quality});g.player.set(...pos);g.yaw=Math.atan2(pos[0]-target[0],pos[2]-target[2]);g.pitch=0;g.aim=ads;g.animate(.5);g.emit();g.onMarkers(g.captureMarkers());g.renderer.render(g.scene,g.camera);return{renderer:g.renderer.getContext().getParameter(g.renderer.getContext().RENDERER),calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles}},{quality,ads,pos,target});const path=`docs/media/${process.env.CORNER_PREFIX||'build33-corner'}-${width}-${quality}-${ads?'ads':'hip'}-${name}.jpg`;await p.screenshot({path,type:'jpeg',quality:65});captures.push({width,quality,ads,name,path,...result});
 }
 writeFileSync(process.env.CORNER_OUTPUT||'docs/quality-reviews/build33-corner.json',JSON.stringify({method:'Source-arranged ordinary W, actual 240 x 1/120 updates; no enemies. Render samples are correctness evidence, not ordinary discovery, enjoyment, audio or hardware certification.',rows,captures,errors},null,2));
 assert.deepEqual(errors,[]);for(const r of rows){assert.ok(r.end.position[2]>-5,JSON.stringify(r));assert.ok(r.end.grounded);assert.equal(r.end.minY,1.7);assert.equal(r.end.maxY,1.7);assert.equal(r.end.dashes,0)}
}finally{await b.close()}
