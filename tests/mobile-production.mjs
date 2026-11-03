import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','61469','--strictPort'],{stdio:['ignore','pipe','inherit']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('preview timeout')),15000);server.once('exit',code=>{clearTimeout(timer);reject(Error('preview exit '+code))});server.stdout.on('data',d=>{if(String(d).includes('61469')){clearTimeout(timer);resolve()}})});
 const prefix=process.env.MOBILE_PREFIX||'mobile-production';
 for(const file of ['tests/mobile-smoke.mjs','tests/mobile-usability.mjs','tests/mobile-aim-hud.mjs','tests/mobile-insets.mjs']){
  const child=spawn(process.execPath,[file],{stdio:'inherit',env:{...process.env,MOBILE_PREFIX:prefix,MOBILE_UI_PREFIX:prefix+'-usability',MOBILE_AIM_PREFIX:prefix+'-aim-hud',MOBILE_INSET_PREFIX:prefix+'-insets',MOBILE_URL:'http://127.0.0.1:61469/'}});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  if(code!==0)process.exitCode=code||1;
 }
}finally{server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve))}
