// Arranged final presentation evidence, not a mission / natural-control run.
import {chromium} from '@playwright/test';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
try {
 const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__);await p.click('#deploy');await p.waitForTimeout(3000);
 for(const [name,x,z] of [['medical',-33,-19],['engineering',33,-19],['relay',7,-40]]) {
  await p.evaluate(({x,z})=>{const g=window.__SOULFALL__.game;g.clearRun();g.encounters=new Set(['ingress','medical','engineering','heart']);g.player.set(x+2,1.7,z+5);g.yaw=Math.atan2(2,5);g.pitch=0;g.syncCamera();g.emit();},{x,z});
  await p.waitForTimeout(3000);await p.screenshot({path:`docs/media/build08-final-${name}.png`});
 }
}finally{await b.close();}
