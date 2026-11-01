import {chromium} from '/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/node_modules/@playwright/test/index.mjs';
import readline from 'node:readline';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__);await p.click('#deploy');
let n=0;const log=[];
async function shot(label){const path=`/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/docs/media/build10-normal-${label}.png`;await p.screenshot({path});console.log(JSON.stringify({path}));}
await shot('opening');console.log('READY');
for await(const line of readline.createInterface({input:process.stdin}))try{
 const a=JSON.parse(line);log.push(a);
 if(a.click)await p.click(a.click);
 if(a.keys)for(const k of a.keys)await p.keyboard.down(k);
 if(a.look)await p.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:a.look[0],y:a.look[1]});
 if(a.press)await p.keyboard.press(a.press);
 if(a.mouse)await p.mouse.down({button:a.mouse});
 if(a.wait)await p.waitForTimeout(a.wait);
 if(a.release)for(const k of a.release)await p.keyboard.up(k);
 if(a.mouseup)await p.mouse.up({button:a.mouseup});
 if(a.shot)await shot(a.shot);
 if(a.pause)await p.keyboard.press('Escape');
 if(a.state)console.log(JSON.stringify({state:await p.evaluate(()=>window.__SOULFALL__.game.captureState())}));
 if(a.done){console.log(JSON.stringify({log,errors}));await b.close();break;}
 console.log('READY');
}catch(e){console.log(e.stack)}
