import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const report={method:'Native Chromium CDP multi-touch transport probe on a synthetic two-zone page in a mobile context. No game state/keyboard/mouse injection, not a game playtest or physical-phone test.',calls:[]};
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
 report.browser=await browser.version();
 const p=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await p.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;touch-action:none}div{position:absolute;width:50vw;height:100vh}#b{left:50vw}</style><div id="a">Move</div><div id="b">Aim</div>');
 await p.evaluate(()=>{window.events=[];for(const type of ['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','touchcancel'])document.addEventListener(type,e=>{window.events.push({type,target:e.target.id,pointerId:e.pointerId,pointerType:e.pointerType,trusted:e.isTrusted,touches:e.touches?[...e.touches].map(t=>t.identifier):undefined});if(type==='pointerdown')e.target.setPointerCapture(e.pointerId);},{passive:false});});
 const cdp=await p.context().newCDPSession(p),a={id:1,x:100,y:280,radiusX:6,radiusY:6,force:1},b={id:2,x:650,y:240,radiusX:6,radiusY:6,force:1};
 for(const [name,type,points]of [['first-down','touchStart',[a]],['second-down','touchStart',[a,b]],['both-move','touchMove',[{...a,x:110},{...b,x:660}]],['second-up-first-still-held','touchEnd',[{...b,x:660}]],['first-keeps-moving','touchMove',[{...a,x:120}]],['all-up','touchEnd',[]]]){
  try{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await p.waitForTimeout(25);report.calls.push({name,type,points:points.map(p=>p.id),ok:true});}
  catch(e){report.calls.push({name,type,points:points.map(p=>p.id),error:e.message});}
 }
 report.events=await p.evaluate(()=>window.events);
 const bUp=report.events.findIndex(e=>e.type==='pointerup'&&e.target==='b');
 report.partialReleaseWorks=bUp>=0&&report.events.slice(bUp+1).some(e=>e.type==='pointermove'&&e.target==='a')&&!report.calls.some(c=>c.error);
 console.log(JSON.stringify(report,null,2));
}finally{writeFileSync('docs/quality-reviews/build73-parent-touch-transport.json',JSON.stringify(report,null,2));await browser.close()}
