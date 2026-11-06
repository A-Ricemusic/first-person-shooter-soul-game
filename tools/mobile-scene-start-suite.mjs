import {spawn} from 'node:child_process';
const checks=[
 ['mobile-scene-start','start','MOBILE_SCENE_START_PREFIX'],
 ['mobile-scene-controls','scene','MOBILE_SCENE_PREFIX'],
 ['mobile-tap-aim','tap-aim','MOBILE_TAP_PREFIX'],
 ['mobile-tap-tolerance','tolerance','MOBILE_TOLERANCE_PREFIX'],
 ['mobile-compact-controls','compact','MOBILE_COMPACT_PREFIX'],
 ['mobile-turn-route','turn-route','MOBILE_TURN_PREFIX'],
 ['mobile-focus-aim','focus','MOBILE_FOCUS_PREFIX'],
 ['mobile-control-hierarchy','hierarchy','MOBILE_HIERARCHY_PREFIX'],
 ['mobile-thumb-layout','thumb-layout','MOBILE_THUMB_PREFIX'],
 ['mobile-fire-speed','fire-speed','MOBILE_FIRE_SPEED_PREFIX'],
 ['mobile-phase-route-buffer','phase-route','MOBILE_PHASE_ROUTE_PREFIX'],
 ['mobile-usability','settings-ui','MOBILE_UI_PREFIX']
];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','61469','--strictPort'],{stdio:['ignore','pipe','inherit']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('preview timeout')),15000);server.once('exit',c=>{clearTimeout(timer);reject(Error('preview exit '+c))});server.stdout.on('data',d=>{if(String(d).includes('61469')){clearTimeout(timer);resolve()}})});
 const prefix=process.env.MOBILE_PREFIX||'mobile-production';
 for(const[file,suffix,variable]of checks){
  const child=spawn(process.execPath,['tests/'+file+'.mjs'],{stdio:'inherit',env:{...process.env,MOBILE_PREFIX:prefix,[variable]:prefix+'-'+suffix,MOBILE_URL:'http://127.0.0.1:61469/'}});
  const code=await new Promise(resolve=>child.once('exit',resolve));
  if(code!==0){process.exitCode=code||1;break;}
 }
}finally{server.kill('SIGTERM');await new Promise(resolve=>server.exitCode!==null?resolve():server.once('exit',resolve))}
