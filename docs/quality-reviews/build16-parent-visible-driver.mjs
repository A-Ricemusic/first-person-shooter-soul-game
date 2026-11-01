import {chromium} from '/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/node_modules/@playwright/test/index.mjs';
import {createInterface} from 'node:readline';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/');await page.locator('#deploy').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('#deploy').disabled);console.log('READY');
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){try{const c=JSON.parse(line);if(c.close){await browser.close();rl.close();break;}
if(c.click)await page.locator(c.click).click({force:true});
if(c.resume && await page.locator('#resume').isVisible())await page.locator('#resume').click({force:true});
for(const a of c.actions||[]){if(a.down)await page.keyboard.down(a.down);if(a.up)await page.keyboard.up(a.up);if(a.press)await page.keyboard.press(a.press);if(a.look)await page.evaluate(({x,y})=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),{x:a.look[0],y:a.look[1]});if(a.mouseDown)await page.mouse.down({button:a.mouseDown});if(a.mouseUp)await page.mouse.up({button:a.mouseUp});if(a.wait)await page.waitForTimeout(a.wait);}
if(c.shot)await page.screenshot({path:c.shot});if(c.pause)await page.keyboard.press('Escape');
console.log(JSON.stringify({visible:await page.evaluate(()=>Object.fromEntries(['objective','health','shield','ammo','reserve','kills','timer','interaction','signal-distance','end-title','end-details'].map(id=>[id,document.getElementById(id)?.innerText]))),errors}));
}catch(e){console.log(JSON.stringify({error:e.message}));}}
