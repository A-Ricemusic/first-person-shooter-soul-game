import {chromium,devices} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const prefix=process.env.MOBILE_BASELINE_PREFIX||'build73-parent-mobile-baseline';
const report={method:'Engineering baseline on normal URL with mobile browser contexts and native touch taps only. Chromium mobile emulation/software WebGL, not physical phones or Safari; no desktop playtest, keyboard or mouse control.',profiles:[],errors:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
mkdirSync(`docs/media/${prefix}`,{recursive:true});
try{
 for(const [name,width,height,dpr]of [['landscape',844,390,3],['portrait',390,844,3],['small-landscape',667,375,2]]){
  const context=await browser.newContext({viewport:{width,height},screen:{width,height},deviceScaleFactor:dpr,isMobile:true,hasTouch:true,userAgent:devices['Pixel 7'].userAgent});
  const p=await context.newPage();p.setDefaultTimeout(3000);p.on('pageerror',e=>report.errors.push({name,error:e.message}));
  await p.goto(process.env.MOBILE_BASELINE_URL||'http://127.0.0.1:5173/');await p.waitForFunction(()=>document.querySelector('#deploy')&&!document.querySelector('#deploy').disabled,null,{timeout:60000});
  await p.screenshot({path:`docs/media/${prefix}/${name}-menu.jpg`,type:'jpeg',quality:80});
  await p.locator('#deploy').tap();await p.waitForTimeout(500);
  const data=await p.evaluate(()=>{
   const shown=el=>el&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none';
   const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
   const c=document.querySelector('#game-canvas');
   return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},coarse:matchMedia('(pointer:coarse)').matches,maxTouchPoints:navigator.maxTouchPoints,canvas:{width:c.width,height:c.height,css:rect(c)},virtualControlCount:document.querySelectorAll('#touch-controls button,#mobile-controls button,[data-touch-control]').length,visibleButtons:[...document.querySelectorAll('#hud button')].filter(shown).map(el=>({label:el.getAttribute('aria-label')||el.textContent,...rect(el)})),hud:['.hud-top','.hud-bottom','.signal-scan','#field-controls','#announcement','.ability'].map(s=>{const el=document.querySelector(s);return{selector:s,shown:shown(el),...(shown(el)?rect(el):{})}}),fieldText:document.querySelector('#field-controls').innerText,normalURLDebugExposed:typeof window.__SOULFALL__!=='undefined'};
  });
  await p.screenshot({path:`docs/media/${prefix}/${name}-playing.jpg`,type:'jpeg',quality:80});
  data.pointerLockTarget=await p.evaluate(()=>document.pointerLockElement?.id||null);
  try{await p.locator('#pause-button').tap();data.pauseVisible=await p.locator('#pause').isVisible();}catch(e){data.pauseFailure=e.message;data.pauseVisible=false;}
  report.profiles.push({name,...data,coverage:'Native tap deployment and attempted pause only; failed taps retained without force or keyboard escape. No movement/aim/fire mobile controls exist; no mission or enjoyment assessment.'});await context.close();
 }
}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));await browser.close()}
