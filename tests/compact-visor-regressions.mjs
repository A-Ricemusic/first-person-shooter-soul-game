import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

const prefix=process.env.COMPACT_PREFIX||'current-compact-visor';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const rows=[],errors=[];
try {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__nativeRaf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=()=>1;});
 await page.goto('http://127.0.0.1:5173/?test=1');
 await page.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50,timeout:60000});await page.click('#deploy');
 for(const width of [1280,1440])for(const aim of [false,true])for(const fixture of ['roster','boundary']) {
  await page.setViewportSize({width,height:width===1280?800:900});
  const row=await page.evaluate(({aim,fixture})=>{
   window.cancelAnimationFrame(window.__drawHandle);const g=window.__SOULFALL__.game;g.clearRun();g.player.set(0,1.7,31);g.yaw=0;g.pitch=0;g.aim=aim;g.syncCamera();g.animate(.5);g.emit();
   const source=(id,bearing,charging=false)=>({id,kind:'enemy',type:'sentinel',label:'SENTINEL',bearing,front:false,x:2,y:0,distance:15,health:1,charging,recent:true});
   // Explicit representation stress data; Game's real eligibility is exercised
   // by the existing moving-actor suite, not inferred from these injected cues.
   const markers=fixture==='roster'?Array.from({length:12},(_,i)=>source(`s${i}`,i*Math.PI/6+.14,i===0||i===6)):
    [source('a',Math.PI/12-.0001,true),source('b',Math.PI/12+.0001)];
   if(fixture==='roster')markers.push(source('extra',.15));
   g.onMarkers(markers);const render=()=>{g.renderer.render(g.scene,g.camera);window.__drawHandle=window.__nativeRaf(render);};render();
   return {sources:markers.map(m=>m.id),cues:[...document.querySelectorAll('.visor.edge')].map(e=>({members:e.dataset.members.split(','),count:Number(e.dataset.count),charges:Number(e.dataset.charges),warning:e.querySelector('b').textContent,countText:e.querySelector('small').textContent,rotation:e.querySelector('.marker-symbol').style.transform,rect:e.getBoundingClientRect().toJSON()}))};
  },{aim,fixture});
  assert.equal(row.cues.length,fixture==='roster'?12:2);
  assert.equal(row.cues.reduce((s,c)=>s+c.count,0),row.sources.length);
  assert.deepEqual(row.cues.flatMap(c=>c.members).sort(),row.sources.toSorted());
  for(const cue of row.cues){assert.ok(cue.rect.width<=36&&cue.rect.height<=34);assert.equal(cue.warning,cue.charges?'!':'');assert.equal(cue.countText,cue.count>1?String(cue.count):'');assert.ok(cue.rotation.includes('rotate('));}
  for(let i=0;i<row.cues.length;i++)for(let j=i+1;j<row.cues.length;j++){const a=row.cues[i].rect,b=row.cues[j].rect;assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,JSON.stringify({fixture,a,b}));}
  row.width=width;row.aim=aim;row.fixture=fixture;row.path=`docs/media/${prefix}-${width}-${aim?'ads':'hip'}-${fixture}.jpg`;await page.screenshot({path:row.path,type:'jpeg',quality:80});rows.push(row);
 }
 const paused=await page.evaluate(()=>{const g=window.__SOULFALL__.game;g.pause();g.onMarkers(g.captureMarkers());return document.querySelectorAll('.visor').length;});assert.equal(paused,0);
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>!document.querySelector('#deploy').disabled,null,{polling:50});await page.click('#open-controls');
 const handbook=await page.evaluate(()=>{const content=document.querySelector('.handbook-content'),button=document.querySelector('#controls-dialog > .primary-button');content.scrollTop=content.scrollHeight;return{body:content.getBoundingClientRect().toJSON(),button:button.getBoundingClientRect().toJSON(),last:content.lastElementChild.getBoundingClientRect().toJSON(),text:content.lastElementChild.textContent};});
 assert.ok(handbook.body.bottom<=handbook.button.top);assert.ok(handbook.last.bottom<=handbook.body.bottom+1);assert.ok(handbook.text.includes('Orange !'));assert.deepEqual(errors,[]);
 writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify({method:'Explicit synthetic cue representation stress with 13 sources over all 12 sectors and a near-boundary pair, two viewports and hip/ADS. Source membership, warning/count semantics, non-overlap, pause cleanup and normal-URL handbook scroll verified. Eligibility and actual optic anchoring are covered separately by moving-actor tests. These are not ordinary play or human readability judgments.',rows,paused,handbook,errors},null,2)+'\n');
 console.log('Compact visor: source coverage, adjacent-sector separation, counts/warnings, pause cleanup and handbook scroll passed');
} finally {await browser.close();}
