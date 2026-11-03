import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const prefix=process.env.MOBILE_DRIVER_PREFIX||'build74-menu-driver';
const child=spawn(process.execPath,['tools/mobile-playtest.mjs','--width','844','--height','390','--out',`docs/media/${prefix}`],{stdio:['pipe','pipe','pipe']});
const events=[];let stderr='';child.stderr.on('data',b=>stderr+=b);
const lines=createInterface({input:child.stdout});
const send=o=>child.stdin.write(JSON.stringify(o)+'\n');
lines.on('line',line=>{const e=JSON.parse(line);events.push(e);if(e.type==='ready')send({op:'act',steps:[{type:'down',id:1,x:.6,y:.7},{type:'move',id:1,x:.6,y:.6},{type:'move',id:1,x:.6,y:.5},{type:'up',id:1}],capture:'title-native-swipe'});if(e.type==='result'){
 if(e.sequence===1)send({op:'click',selector:'#deploy'});
 else if(e.sequence===2)send({op:'act',steps:[{type:'tap',selector:'#touch-map'}],capture:'planning-stays-open'});
 else if(e.sequence===3)send({op:'click',selector:'#close-map'});
 else if(e.sequence===4)send({op:'click',selector:'#pause-button'});
 else send({op:'close'});
}if(['command-error','fatal'].includes(e.type))send({op:'close'});});
const timer=setTimeout(()=>child.kill('SIGTERM'),60000);
const exit=await new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));clearTimeout(timer);
const ready=events.find(e=>e.type==='ready');const pids=[ready?.driverPid,ready?.chromePid].filter(Number.isInteger);
const absent=pids.map(pid=>{try{process.kill(pid,0);return false}catch(e){return e.code==='ESRCH'}});
const report={method:'Normal-URL mobile native-touch driver integration. A real title-screen swipe and normal map open/capture/close must run through native touch. Capturing an already paused planning view keeps it open. No hidden state or keyboard/mouse.',events,stderr,exit,ownedPids:pids,ownedPidsAbsent:absent};
try{assert.equal(exit.code,0);assert(events.some(e=>e.type==='result'&&e.beforePause?.phase==='menu'));assert(events.some(e=>e.type==='result'&&e.beforePause?.phase==='planning'&&e.after?.phase==='planning'),'map capture must keep planning open');assert(!events.some(e=>e.type==='command-error'||e.type==='fatal'));assert(events.some(e=>e.type==='closed'&&e.browserClosed));assert.equal(pids.length,2);assert(absent.every(Boolean));report.passed=true}catch(e){report.failure=e.message;process.exitCode=1}
writeFileSync(`docs/quality-reviews/${prefix}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
