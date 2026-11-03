// Ordinary controls only. JSON lines on stdin; EOF always closes the owned Chrome.
import {chromium} from '@playwright/test';

import {parseArgs} from 'node:util';
import {createInterface} from 'node:readline';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,appendFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

const {values}=parseArgs({options:{url:{type:'string',default:'http://127.0.0.1:5173/'},out:{type:'string',default:'docs/media/build73-mobile-ordinary'},width:{type:'string',default:'844'},height:{type:'string',default:'390'},headed:{type:'boolean',default:false},help:{type:'boolean',short:'h',default:false}}});
if(values.help){console.log(`Mobile visible-only playtest. --out UNIQUE_PREFIX --width 844 --height 390 (or portrait 390x844). Normal URL only. Native Chromium touch emulation, not physical hardware.
JSON lines:
{"op":"click","selector":"#deploy"}
{"op":"status"}
{"op":"geometry","selector":"#touch-stick"}
{"op":"act","resume":true,"steps":[{"type":"down","id":1,"selector":"#touch-stick"},{"type":"move","id":1,"x":0.09,"y":0.73},{"type":"down","id":2,"selector":"#touch-fire"},{"type":"move","id":2,"x":0.8,"y":0.45},{"type":"wait","ms":500},{"type":"up","id":2}],"capture":"walk-fire"}
{"op":"capture","label":"view"}
{"op":"close"}
Coordinates x/y are normalized CSS viewport coordinates (0..1). Selectors resolve visible center geometry only. Menus scroll by down/move/up swipes (use several move steps). down/move/up/cancel/tap/wait; at most two contacts. tap may use selector or coordinates. Each act releases contacts then captures LIVE before tapping Pause by default. pauseAfter:false leaves play running; screenshots can add live damage. resume:true taps visible Resume. Use #touch-map and #close-map for map. No keyboard, mouse, arbitrary evaluation, game handles or hidden state. Use FIRE hold + drag with right thumb while left moves. Each ended contact is sent individually. EOF/error/close releases all contacts; project lock and exact owned PIDs recorded. Capture metadata reports CSS and screenshot scale. Two terminal attempts means play to the actual win/loss UI twice, using play-again for a fresh second run.
`);process.exit(0)}
const root=fileURLToPath(new URL('../',import.meta.url));
const url=new URL(values.url);
if(url.searchParams.has('test'))throw new Error('Ordinary play uses the normal URL. Remove the test parameter.');
const output=resolve(root,values.out),token=randomUUID();
const lock=join(tmpdir(),`soulfall-visible-${createHash('sha256').update(root).digest('hex').slice(0,16)}.lock`);
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
// Subscribe before async startup: piped input/EOF must not be lost during launch.
const commands=rl[Symbol.asyncIterator]();
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
let server,browser,page,cdp,owned=false,closing,sequence=0;
const contacts=new Map(),pageErrors=[];
const metadata={token,driverPid:process.pid,root,chromePid:null,started:new Date().toISOString()};
async function log(entry){await appendFile(join(output,'actions.jsonl'),JSON.stringify({at:new Date().toISOString(),...entry})+'\n');}
async function release(){if(cdp&&contacts.size){try{await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]})}catch{}}contacts.clear()}
async function point(a){
 if(a.selector){const l=page.locator(a.selector);if(!await l.isVisible())throw Error('Selector must be visible');const r=await l.boundingBox();if(!r)throw Error('No visible geometry');if(r.x<0||r.y<0||r.x+r.width>Number(values.width)+1||r.y+r.height>Number(values.height)+1)throw Error('Target outside viewport; scroll with native down/move/up gesture before tapping');return {x:r.x+r.width/2,y:r.y+r.height/2}}
 if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>1||a.y<0||a.y>1)throw Error('Coordinates must be normalized 0..1');return {x:a.x*Number(values.width),y:a.y*Number(values.height)};
}
async function step(a){
 if(a.type==='wait'){if(!Number.isFinite(a.ms)||a.ms<0||a.ms>12000)throw Error('wait 0..12000ms');await delay(a.ms);return}
 if(a.type==='tap'){const id=[1,2].find(i=>!contacts.has(i));if(!id)throw Error('Two contact maximum');await step({...a,type:'down',id});await delay(60);await step({type:'up',id});await delay(80);return}
 if(![1,2].includes(a.id))throw Error('Contact id must be 1 or 2');
 if(a.type==='down'){if(contacts.has(a.id)||contacts.size>=2)throw Error('Contact already held');contacts.set(a.id,{id:a.id,...await point(a)});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...contacts.values()]})}
 else if(a.type==='move'){if(!contacts.has(a.id))throw Error('Contact not held');contacts.set(a.id,{id:a.id,...await point(a)});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[...contacts.values()]})}
 else if(a.type==='up'){const p=contacts.get(a.id);if(!p)throw Error('Contact not held');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[p]});contacts.delete(a.id)}
 else if(a.type==='cancel')await release();else throw Error('Unsupported touch action');
}
async function tap(selector){await step({type:'tap',selector})}
async function ui(){
 return page.evaluate(()=>{
  const visibility=new Map();
  const visible=el=>{
   if(!el)return false;if(visibility.has(el))return visibility.get(el);
   const style=getComputedStyle(el),shown=!!el.getClientRects().length&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&(!el.parentElement||visible(el.parentElement));
   visibility.set(el,shown);return shown;
  };
  const text=id=>visible(document.getElementById(id))?document.getElementById(id).innerText:null;
  const dialog=document.querySelector('dialog[open]');
  const phase=visible(dialog)?'dialog':visible(document.getElementById('end'))?'end':visible(document.getElementById('pause'))?'paused':visible(document.getElementById('menu'))?'menu':visible(document.getElementById('facility-map'))?'planning':visible(document.getElementById('hud'))?'playing':'loading';
  const result={phase};
  if(['playing','planning'].includes(phase))for(const id of ['objective','health','shield','ammo','reserve','kills','timer','heading','compass-direction','interaction','signal-distance','extraction-status','memory-card','announcement','event-feed','dash-status','facility-map','field-controls','service-hint','threat-focus'])result[id]=text(id);
  if(phase==='end')result.outcome=text('end');
  if(phase==='dialog')result.dialog=dialog.innerText;
  return result;
 });
}
async function capture(label,pauseAfter){
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(label))throw new Error('Capture label must use letters, digits, underscore or hyphen.');
 const beforePause=await ui(),started=performance.now();
 const result=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:75});
 const path=join(output,`${label}.jpg`);await writeFile(path,Buffer.from(result.data,'base64'));
 const captureMs=performance.now()-started;
 if(pauseAfter&&['playing','planning'].includes(beforePause.phase)){if(beforePause.phase==='planning')await tap('#close-map');if((await ui()).phase==='playing')await tap('#pause-button');}
 return{path,captureMs,beforePause,after:await ui(),cssViewport:{width:Number(values.width),height:Number(values.height)},screenshotScale:3};
}
async function shutdown(reason){
 if(closing)return closing;
 closing=(async()=>{
  rl.close();await release();
  if(server){let timer;try{await Promise.race([server.close(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Close timed out')),5000);})]);}catch{await server.kill();}finally{clearTimeout(timer);}}
  if(owned){const current=JSON.parse(await readFile(join(lock,'owner.json'),'utf8').catch(()=>'{}'));if(current.token===token)await rm(lock,{recursive:true,force:true});}
  emit({type:'closed',reason,driverPid:process.pid,chromePid:metadata.chromePid,browserLaunched:!!server,browserClosed:!server||server.process().exitCode!==null||server.process().signalCode!==null});
 })();return closing;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{shutdown(signal).then(()=>process.exit(signal==='SIGINT'?130:143)).catch(()=>process.exit(1));});

try{
 try{await mkdir(lock);owned=true;}catch(error){if(error.code!=='EEXIST')throw error;const owner=JSON.parse(await readFile(join(lock,'owner.json'),'utf8'));const alive=pid=>{if(!Number.isInteger(pid)||pid<1)return true;try{process.kill(pid,0);return true}catch(e){return e.code!=='ESRCH'}};if(alive(owner.driverPid)||alive(owner.chromePid))throw Error('A live driver or Chrome owns '+lock);await rm(lock,{recursive:true});await mkdir(lock);owned=true;}
 await writeFile(join(lock,'owner.json'),JSON.stringify(metadata));await mkdir(output,{recursive:true});
 server=await chromium.launchServer({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:!values.headed,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 metadata.chromePid=server.process().pid;await writeFile(join(lock,'owner.json'),JSON.stringify(metadata));
 browser=await chromium.connect(server.wsEndpoint());browser.once('disconnected',()=>rl.close());
 page=await browser.newPage({viewport:{width:Number(values.width),height:Number(values.height)},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36'});page.setDefaultTimeout(4000);page.on('pageerror',e=>pageErrors.push(e.message));cdp=await page.context().newCDPSession(page);
 await page.goto(url.href,{timeout:30000});await page.waitForFunction(()=>{const b=document.querySelector('#deploy');return b&&!b.disabled;},null,{timeout:30000});
 
 emit({type:'ready',...metadata,inputMode:'native-cdp-touch',lock,output,ui:await ui(),graphics:'Software-WebGL fallback enabled; renderer not certified'});
 for await(const line of commands){
  if(!line.trim())continue;
  let command;const started=performance.now();
  try{
   command=JSON.parse(line);await log({type:'command',sequence:++sequence,command});
   if(command.op==='close')break;
   let result;
   if(command.op==='geometry'){const l=page.locator(command.selector);if(!await l.isVisible())throw Error('Not visible');result={rect:await l.boundingBox(),viewport:{width:Number(values.width),height:Number(values.height)}};}
   else if(command.op==='status')result={ui:await ui()};
   else if(command.op==='click'){
    await tap(command.selector);
    result=command.capture?await capture(command.capture,command.pauseAfter===true):{ui:await ui()};
   }else if(command.op==='capture')result=await capture(command.label||`${sequence}-capture`,command.pauseAfter!==false);
   else if(command.op==='act'){
    if(!Array.isArray(command.steps)||command.steps.length>200)throw Error('steps array max200');
    if(command.capture&&!/^[a-zA-Z0-9_-]{1,80}$/.test(command.capture))throw Error('Capture label must use letters, digits, underscore or hyphen.');
    if(command.resume){const state=await ui();if(state.phase==='paused')await tap('#resume');else if(!['playing','planning'].includes(state.phase))throw new Error(`Cannot resume from visible ${state.phase}; use its normal UI.`);}
    if(!['playing','planning'].includes((await ui()).phase))throw new Error('Action requires the playing or planning view.');
    let timings=[],heldCapture,inputBatchMs;
    try{
     for(const action of command.steps||[]){const t=performance.now();await step(action);timings.push({action,clientMs:performance.now()-t});}
     if(command.captureHeld===true)heldCapture=await capture(command.capture||`${sequence}-act`,command.pauseAfter!==false);
    }finally{await release();}
    result={...(heldCapture||await capture(command.capture||`${sequence}-act`,command.pauseAfter!==false)),timings,inputMode:'native-cdp-touch',inputBatchMs,...(heldCapture?{captureHeld:true,afterRelease:await ui()}:{} )};
   }else throw new Error('Use click, capture, act, status or close. No arbitrary evaluation is accepted.');
   const response={type:'result',sequence,...result,clientMs:performance.now()-started,pageErrors:[...pageErrors]};await log(response);emit(response);
  }catch(error){await release();try{if(page&&['playing','planning'].includes((await ui()).phase))await tap((await ui()).phase==='planning'?'#close-map':'#pause-button');}catch{}const response={type:'command-error',sequence,error:error.message};await log(response);emit(response);}
 }
}catch(error){emit({type:'fatal',error:error.message});process.exitCode=1;}
finally{await shutdown('input ended or close requested');}
