import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {createInterface} from 'node:readline';
import {mkdtemp,readFile,stat,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const output=await mkdtemp(join(tmpdir(),'soulfall-driver-check-')),sessions=[];
function session(name,args=[],eof=false){
 const child=spawn(process.execPath,['tools/visible-playtest.mjs','--out',join(output,name),...args],{cwd:process.cwd(),stdio:[eof?'ignore':'pipe','pipe','pipe']});
 const events=new EventEmitter(),messages=[];let ended=null,stderr='';
 child.stderr.on('data',chunk=>stderr+=chunk);
 createInterface({input:child.stdout}).on('line',line=>{try{messages.push(JSON.parse(line));events.emit('change');}catch{}});
 const exit=new Promise(resolve=>child.once('exit',(code,signal)=>{ended={code,signal};events.emit('change');resolve(ended);}));
 const s={child,messages,exit,send:command=>child.stdin.write(JSON.stringify(command)+'\n'),get:(type,sequence)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(new Error(`Timed out waiting for ${name}/${type}: ${stderr.slice(-800)}`)),45000);
  const finish=(error,value)=>{clearTimeout(timer);events.off('change',check);error?reject(error):resolve(value);};
  const check=()=>{const found=messages.find(m=>m.type===type&&(sequence===undefined||m.sequence===sequence));if(found)finish(null,found);else if(ended)finish(new Error(`${name} exited before ${type}: ${stderr.slice(-800)}`));};
  events.on('change',check);check();
 })};sessions.push(s);return s;
}
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const missing=async path=>{try{await stat(path);return false;}catch(e){if(e.code==='ENOENT')return true;throw e;}};
const results=[];
try{
 const first=session('normal');const ready=await first.get('ready');assert.equal(ready.ui.phase,'menu');assert.ok(alive(ready.chromePid));
 const second=session('rejected',[],true);const rejected=await second.get('fatal');const denied=await second.get('closed');assert.ok(rejected.error.includes('no second browser'));assert.equal(denied.browserLaunched,false);assert.equal((await second.exit).code,1);assert.equal(JSON.parse(await readFile(join(ready.lock,'owner.json'),'utf8')).driverPid,first.child.pid);assert.ok(alive(ready.chromePid));
 results.push({check:'Exclusive ownership rejects another driver before Chrome launch',passed:true,firstPid:first.child.pid,denied});
 first.send({op:'click',selector:'#deploy',capture:'deploy',pauseAfter:true});const deploy=await first.get('result',1);assert.equal(deploy.beforePause.phase,'playing');assert.equal(deploy.after.phase,'paused');
 first.send({op:'act',resume:true,steps:[{type:'look',x:0,y:-20},{type:'mouseDown',button:'left'},{type:'wait',ms:400}],capture:'fire'});const fire=await first.get('result',2);assert.equal(fire.after.phase,'paused');assert.ok(Number(fire.beforePause.ammo)<Number(deploy.beforePause.ammo));assert.deepEqual(fire.pageErrors,[]);
 first.send({op:'act',resume:true,steps:[{type:'down',key:'KeyW'},{type:'wait',ms:-1}]});const invalid=await first.get('command-error',3);assert.ok(invalid.error.includes('Wait must'));
 first.send({op:'status'});assert.equal((await first.get('result',4)).ui.phase,'paused');
 first.send({op:'close'});const closed=await first.get('closed');assert.equal((await first.exit).code,0);assert.equal(closed.browserClosed,true);assert.equal(alive(ready.chromePid),false);assert.ok(await missing(ready.lock));results.push({check:'Ordinary deploy/fire/capture/pause, invalid-input release, explicit close',passed:true,deploy,fire,invalid,closed});
 const eof=session('eof',[],true);const eofReady=await eof.get('ready');const eofClosed=await eof.get('closed');assert.equal((await eof.exit).code,0);assert.equal(eofClosed.browserClosed,true);assert.equal(alive(eofReady.chromePid),false);assert.ok(await missing(eofReady.lock));results.push({check:'Non-TTY stdin EOF closes Chrome and releases ownership',passed:true,closed:eofClosed});
 const failed=session('startup-failure',['--url','http://127.0.0.1:1/'],true);await failed.get('fatal');const failureClosed=await failed.get('closed');assert.equal((await failed.exit).code,1);assert.equal(failureClosed.browserLaunched,true);assert.equal(failureClosed.browserClosed,true);assert.equal(alive(failureClosed.chromePid),false);results.push({check:'Startup navigation failure closes owned browser',passed:true,closed:failureClosed});
 const interrupted=session('signal');const interruptReady=await interrupted.get('ready');interrupted.child.kill('SIGTERM');const interruptClosed=await interrupted.get('closed');assert.equal((await interrupted.exit).code,143);assert.equal(interruptClosed.browserClosed,true);assert.equal(alive(interruptReady.chromePid),false);assert.ok(await missing(interruptReady.lock));results.push({check:'SIGTERM closes owned Chrome and releases ownership',passed:true,closed:interruptClosed});
 await writeFile(process.env.DRIVER_CHECK_OBSERVATIONS||'docs/current-visible-driver-checks.json',JSON.stringify({method:'Real installed Chrome lifecycle checks, sequential instances; a concurrent second driver is rejected before browser launch. Gameplay exercise uses normal URL, ordinary inputs and visible DOM only. No independent quality or hardware/enjoyment claims.',output,results},null,2)+'\n');
 console.log('Visible playtest driver ownership, normal input, close, EOF, startup failure and SIGTERM: passed');
}finally{
 for(const s of sessions)if(s.child.exitCode===null&&s.child.signalCode===null)s.child.kill('SIGTERM');
 await Promise.all(sessions.map(s=>s.exit));
}
