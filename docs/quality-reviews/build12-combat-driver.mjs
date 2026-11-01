import {chromium} from '/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/node_modules/@playwright/test/index.mjs';
import readline from 'node:readline';
import {writeFileSync} from 'node:fs';
const root='/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});const errors=[],log=[],observations=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__);await p.click('#deploy');
async function shot(label){const path=`${root}/docs/media/build12-combat-${label}.png`;await p.screenshot({path});console.log(JSON.stringify({path}));}
console.log('READY');
for await(const line of readline.createInterface({input:process.stdin}))try{
 const a=JSON.parse(line);log.push(a);
 if(a.fresh){await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__);await p.click('#deploy');}
 if(a.cue){await p.getByText('CHARGING',{exact:true}).first().waitFor({state:'visible',timeout:20000});await p.keyboard.down('KeyW');await p.keyboard.press('ShiftLeft');await p.waitForTimeout(250);await p.keyboard.up('KeyW');}
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
 if(a.state){const state=await p.evaluate(()=>window.__SOULFALL__.game.captureState());observations.push({label:a.shot,state});console.log(JSON.stringify({state}));}
 if(a.done){writeFileSync(root+'/docs/quality-reviews/build12-combat-observations.json',JSON.stringify({method:'Visible DOM charge cue; ordinary control actions; state only after actions. No position/timing reads for decisions.',log,observations,errors},null,2));await b.close();break;}
 console.log('READY');
}catch(e){console.log(e.stack)}
