// Ordinary controls only. JSON lines on stdin; EOF always closes the owned Chrome.
import {chromium} from '@playwright/test';
import {createBrowserInput,validateSteps} from './visible-input.mjs';
import {parseArgs} from 'node:util';
import {createInterface} from 'node:readline';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile,appendFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';

const {values}=parseArgs({options:{'input-mode':{type:'string',default:'browser'},url:{type:'string',default:'http://127.0.0.1:5173/'},out:{type:'string',default:'docs/media/current-visible-playtest'},headed:{type:'boolean',default:false},help:{type:'boolean',short:'h',default:false}}});
if(!['browser','cdp'].includes(values['input-mode']))throw Error('Input mode must be browser or cdp.');
if(values.help){
 process.stdout.write(`Usage: npm run playtest:visible -- --out docs/media/unique-review-name
Use a TTY for an interactive session. Commands are JSON lines:
{"op":"click","selector":"#deploy","capture":"deploy","pauseAfter":true}
{"op":"act","resume":true,"steps":[{"type":"down","key":"KeyW"},{"type":"wait","ms":500}],"capture":"advance"}
{"op":"act","resume":true,"steps":[{"type":"mouseDown","button":"right"},{"type":"look","x":20,"y":0},{"type":"mouseDown","button":"left"},{"type":"wait","ms":300}],"capture":"fire"}
{"op":"capture","label":"view"}
{"op":"status"}
{"op":"close"}
Game keys: Digit1 rifle, Digit2 pump breacher; WASD, R reload, E recover, M toggle paused facility map, arrows, Space,
KeyC (toggle crouch), ShiftLeft / ShiftRight, ControlLeft / ControlRight, Escape, Tab. Map freezes the mission; press M again to close and resume.
When mouse capture is unavailable, hold a mouse button BEFORE look. Right-button drag uses the game ADS sensitivity; a look without capture or a held button is rejected. Release left fire while keeping right aim held to turn without shooting.
For held-control photographs (Tab trace or ADS), set captureHeld:true on act: capture occurs BEFORE releasing held controls. Default capture releases first; automatic pause clears Tab.
Steps: down/up/press with a game key; mouseDown/mouseUp with left/right;
look with relative x/y; wait with ms. Act releases held inputs, captures live,
then uses ordinary Escape unless pauseAfter:false. Set captureHeld:true on an act
to photograph held ADS before input release. Held movement/fire continue during
capture; release those explicitly when only aiming is wanted. Inputs still release
on success or failure. The response includes visible afterRelease UI for this mode.
resume:true uses the visible
Resume button. Capture defaults to Escape pause from playing or planning.
Escape closes the map as it pauses, including the automatic post-capture pause.
After resume the map starts closed; M opens it again. To capture a close toggle,
press M twice within one uninterrupted act.
Input batches default to browser-timed synthetic DOM events through ordinary game listeners.
No transport round trips occur between steps, and default input release happens in the browser
before the batch returns. Timings use browser performance time. captureHeld still leaves
inputs down through the photograph: explicitly release movement/fire for held ADS or Tab.
This remains paused, synthetic play; screenshot time and browser scheduling can add delays.
--input-mode=cdp retains the older transport-timed controls for diagnostics.
No test URL, arbitrary evaluation or hidden game observations are accepted.
EOF closes the owned browser. A project lock rejects a second driver before launch.
--headed opens a window; software-WebGL fallback remains allowed, not a GPU benchmark.
`);
 process.exit(0);
}
const root=fileURLToPath(new URL('../',import.meta.url));
const url=new URL(values.url);
if(url.searchParams.has('test'))throw new Error('Ordinary play uses the normal URL. Remove the test parameter.');
const output=resolve(root,values.out),token=randomUUID();
const lock=join(tmpdir(),`soulfall-visible-${createHash('sha256').update(root).digest('hex').slice(0,16)}.lock`);
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
// Subscribe before async startup: piped input/EOF must not be lost during launch.
const commands=rl[Symbol.asyncIterator]();
const emit=value=>process.stdout.write(JSON.stringify(value)+'\n');
let server,browser,page,cdp,browserInput,owned=false,closing,sequence=0;
const keys=new Set(),buttons=new Set(),pageErrors=[];
const metadata={token,driverPid:process.pid,root,chromePid:null,started:new Date().toISOString()};
const validKey=key=>/^(Key[WASDREMC]|Digit[12]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Escape|Tab)$/.test(key);

async function log(entry){await appendFile(join(output,'actions.jsonl'),JSON.stringify({at:new Date().toISOString(),...entry})+'\n');}
async function release(){
 if(browserInput){try{await browserInput.evaluate(input=>input.release());}catch{}}
 for(const key of keys){try{await page.keyboard.up(key);}catch{}}keys.clear();
 for(const button of buttons){try{await page.mouse.up({button});}catch{}}buttons.clear();
}
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
  if(['playing','planning'].includes(phase))for(const id of ['objective','health','shield','ammo','reserve','kills','timer','heading','interaction','signal-distance','extraction-status','memory-card','announcement','event-feed','dash-status','facility-map','field-controls','service-hint'])result[id]=text(id);
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
 if(pauseAfter&&['playing','planning'].includes(beforePause.phase))await page.keyboard.press('Escape');
 return{path,captureMs,beforePause,after:await ui()};
}
async function step(action){
 if(['down','up','press'].includes(action.type)){
  if(!validKey(action.key))throw new Error('Unsupported game key.');
  if(action.type==='down'){await page.keyboard.down(action.key);keys.add(action.key);}
  if(action.type==='up'){await page.keyboard.up(action.key);keys.delete(action.key);}
  if(action.type==='press')await page.keyboard.press(action.key);
 }else if(action.type==='mouseDown'||action.type==='mouseUp'){
  const button=action.button||'left';if(!['left','right'].includes(button))throw new Error('Unsupported mouse button.');
  if(action.type==='mouseDown'){await page.mouse.down({button});buttons.add(button);}
  else{await page.mouse.up({button});buttons.delete(button);}
 }else if(action.type==='look'){
  const x=action.x||0,y=action.y||0;
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>2400||Math.abs(y)>2400)throw new Error('Invalid relative mouse delta.');
  if(!buttons.size&&!await page.evaluate(()=>document.pointerLockElement===document.querySelector('#game-canvas')))throw Error('Look requires mouse capture or a held mouse button. Hold right before fallback look.');
  await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x,y});
 }else if(action.type==='wait'){
  if(!Number.isFinite(action.ms)||action.ms<0||action.ms>12000)throw new Error('Wait must be between0 and12000ms.');
  await delay(action.ms);
 }else throw new Error('Unsupported input step.');
}
async function shutdown(reason){
 if(closing)return closing;
 closing=(async()=>{
  rl.close();if(browserInput){try{await browserInput.evaluate(input=>input.cancel());}catch{}}await release();
  if(server){let timer;try{await Promise.race([server.close(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Close timed out')),5000);})]);}catch{await server.kill();}finally{clearTimeout(timer);}}
  if(owned){const current=JSON.parse(await readFile(join(lock,'owner.json'),'utf8').catch(()=>'{}'));if(current.token===token)await rm(lock,{recursive:true,force:true});}
  emit({type:'closed',reason,driverPid:process.pid,chromePid:metadata.chromePid,browserLaunched:!!server,browserClosed:!server||server.process().exitCode!==null||server.process().signalCode!==null});
 })();return closing;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{shutdown(signal).then(()=>process.exit(signal==='SIGINT'?130:143)).catch(()=>process.exit(1));});

try{
 try{await mkdir(lock);owned=true;}catch(error){if(error.code!=='EEXIST')throw error;const owner=await readFile(join(lock,'owner.json'),'utf8').catch(()=>'metadata unavailable');throw new Error(`Another visible-playtest driver owns ${lock}: ${owner}. Close that owned session first; no second browser was launched.`);}
 await writeFile(join(lock,'owner.json'),JSON.stringify(metadata));await mkdir(output,{recursive:true});
 server=await chromium.launchServer({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:!values.headed,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 metadata.chromePid=server.process().pid;await writeFile(join(lock,'owner.json'),JSON.stringify(metadata));
 browser=await chromium.connect(server.wsEndpoint());browser.once('disconnected',()=>rl.close());
 page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(4000);page.on('pageerror',e=>pageErrors.push(e.message));cdp=await page.context().newCDPSession(page);
 await page.goto(url.href,{timeout:30000});await page.waitForFunction(()=>{const b=document.querySelector('#deploy');return b&&!b.disabled;},null,{timeout:30000});
 if(values['input-mode']==='browser')browserInput=await page.evaluateHandle(createBrowserInput);
 emit({type:'ready',...metadata,inputMode:values['input-mode'],lock,output,ui:await ui(),graphics:'Software-WebGL fallback enabled; renderer not certified'});
 for await(const line of commands){
  if(!line.trim())continue;
  let command;const started=performance.now();
  try{
   command=JSON.parse(line);await log({type:'command',sequence:++sequence,command});
   if(command.op==='close')break;
   let result;
   if(command.op==='status')result={ui:await ui()};
   else if(command.op==='click'){
    await page.locator(command.selector).click();
    result=command.capture?await capture(command.capture,command.pauseAfter===true):{ui:await ui()};
   }else if(command.op==='capture')result=await capture(command.label||`${sequence}-capture`,command.pauseAfter!==false);
   else if(command.op==='act'){
    validateSteps(command.steps||[]);
    if(command.capture&&!/^[a-zA-Z0-9_-]{1,80}$/.test(command.capture))throw Error('Capture label must use letters, digits, underscore or hyphen.');
    if(command.resume){const state=await ui();if(state.phase==='paused')await page.locator('#resume').click();else if(!['playing','planning'].includes(state.phase))throw new Error(`Cannot resume from visible ${state.phase}; use its normal UI.`);}
    if(!['playing','planning'].includes((await ui()).phase))throw new Error('Action requires the playing or planning view.');
    let timings=[],heldCapture,inputBatchMs;
    try{
     if(browserInput){const batch=await browserInput.evaluate((input,args)=>input.run(args),{steps:command.steps||[],retainHeld:command.captureHeld===true});timings=batch.timings;inputBatchMs=batch.browserMs;}
     else for(const action of command.steps||[]){const t=performance.now();await step(action);timings.push({action,clientMs:performance.now()-t});}
     if(command.captureHeld===true)heldCapture=await capture(command.capture||`${sequence}-act`,command.pauseAfter!==false);
    }finally{await release();}
    result={...(heldCapture||await capture(command.capture||`${sequence}-act`,command.pauseAfter!==false)),timings,inputMode:values['input-mode'],inputBatchMs,...(heldCapture?{captureHeld:true,afterRelease:await ui()}:{} )};
   }else throw new Error('Use click, capture, act, status or close. No arbitrary evaluation is accepted.');
   const response={type:'result',sequence,...result,clientMs:performance.now()-started,pageErrors:[...pageErrors]};await log(response);emit(response);
  }catch(error){await release();try{if(page&&['playing','planning'].includes((await ui()).phase))await page.keyboard.press('Escape');}catch{}const response={type:'command-error',sequence,error:error.message};await log(response);emit(response);}
 }
}catch(error){emit({type:'fatal',error:error.message});process.exitCode=1;}
finally{await shutdown('input ended or close requested');}
