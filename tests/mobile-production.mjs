import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','61469','--strictPort'],{stdio:['ignore','pipe','inherit']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('preview timeout')),15000);server.once('exit',code=>{clearTimeout(timer);reject(Error('preview exit '+code))});server.stdout.on('data',d=>{if(String(d).includes('61469')){clearTimeout(timer);resolve()}})});
 const child=spawn(process.execPath,['tests/mobile-smoke.mjs'],{stdio:'inherit',env:{...process.env,MOBILE_PREFIX:process.env.MOBILE_PREFIX||'build73-mobile-production',MOBILE_URL:'http://127.0.0.1:61469/'}});
 process.exitCode=await new Promise(resolve=>child.once('exit',resolve));
}finally{server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve))}
