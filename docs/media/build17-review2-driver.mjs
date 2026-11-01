import { chromium } from '/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs';
import readline from 'node:readline';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const context=await browser.newContext({viewport:{width:1280,height:800},});
const page=await context.newPage();
const cdp=await context.newCDPSession(page);
await page.goto('http://127.0.0.1:5173/');
await page.waitForTimeout(1500);
console.log(JSON.stringify({ready:true,text:await page.locator('body').innerText()}));
const rl=readline.createInterface({input:process.stdin});
for await(const line of rl){try{const c=JSON.parse(line);fs.appendFileSync('docs/media/build17-review2-actions.jsonl',JSON.stringify({at:new Date().toISOString(),...c})+'\n');let out={};if(c.text)out.text=await page.locator('body').innerText();if(c.click)await page.getByRole('button',{name:c.click,exact:true}).click();if(c.xy)await page.mouse.click(...c.xy);if(c.key)await page.keyboard.press(c.key);if(c.move)await page.mouse.move(...c.move);if(c.rel)await page.evaluate(([x,y])=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),c.rel);if(c.down)for(const k of c.down)await page.keyboard.down(k);if(c.mouseDown)await page.mouse.down({button:c.mouseDown});if(c.wait)await page.waitForTimeout(c.wait);if(c.mouseUp)await page.mouse.up({button:c.mouseUp});if(c.up)for(const k of c.up)await page.keyboard.up(k);if(c.shot){const img=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true}); fs.writeFileSync(`docs/media/build17-review2-${c.shot}.png`,Buffer.from(img.data,'base64'));out.shot=c.shot;}if(c.close){await context.close();await browser.close();console.log('CLOSED');break;}console.log(JSON.stringify(out));}catch(e){console.log(JSON.stringify({error:e.message}));}}
