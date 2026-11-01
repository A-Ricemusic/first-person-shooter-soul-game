import { chromium } from '/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/node_modules/@playwright/test/index.mjs';
import readline from 'node:readline';
import fs from 'node:fs';
const base='/Users/pelicannurse/.t3/projects/first-person-shooter-soul-game/';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const logs=[]; const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
await page.screenshot({path:base+'docs/media/build17-review1-00-briefing.png'});
console.log(JSON.stringify({ready:true,text:await page.locator('body').innerText()}));
const rl=readline.createInterface({input:process.stdin,terminal:false});
for await (const line of rl) { try { const c=JSON.parse(line); logs.push({at:new Date().toISOString(),...c}); let out={};
 if(c.click) await page.mouse.click(c.click[0],c.click[1]);
 if(c.key) await page.keyboard.press(c.key);
 if(c.down) for(const k of c.down) await page.keyboard.down(k);
 if(c.mouseDown) await page.mouse.down({button:c.mouseDown});
 if(c.move) { await page.evaluate(([x,y])=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:x,movementY:y,bubbles:true})),c.move); }
 if(c.wait) await page.waitForTimeout(c.wait);
 if(c.mouseUp) await page.mouse.up({button:c.mouseUp});
 if(c.up) for(const k of c.up) await page.keyboard.up(k);
 if(c.shot){const path='docs/media/build17-review1-'+c.shot+'.png';await page.screenshot({path:base+path});out.shot=path;}
 if(c.text) out.text=await page.locator('body').innerText();
 if(c.reload){await page.reload({waitUntil:'networkidle'});}
 if(c.close){out.errors=errors;fs.writeFileSync(base+'docs/quality-reviews/build17-reviewer1-actions.json',JSON.stringify(logs,null,2)); await browser.close(); console.log(JSON.stringify(out));break;}
 console.log(JSON.stringify(out));
 }catch(e){console.log(JSON.stringify({error:String(e)}));}}
rl.close();
process.stdin.pause();
