import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
const out=root+'/docs/media/build40-parent-reload';
const record={sourceCommit:'033f752d858022a6eaeaff4bf019977a45d1c9da',method:'Short continuous normal-URL synthetic mouse/key observation, no hidden game state or arrangements. Video of real renderer; not full mission or human handling validation.',driverPid:process.pid,events:[],pageErrors:[]};
let server,browser,context;
const start=performance.now();
const mark=(name,data={})=>record.events.push({name,elapsedMs:performance.now()-start,...data});
try{
 server=await chromium.launchServer({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});record.chromePid=server.process().pid;
 browser=await chromium.connect(server.wsEndpoint());
 context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:out,size:{width:1280,height:800}}});
 const page=await context.newPage();page.on('pageerror',e=>record.pageErrors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');await page.locator('#deploy').waitFor();await page.locator('#deploy').click();mark('deploy');
 await page.evaluate(()=>document.dispatchEvent(new MouseEvent('mousemove',{movementX:0,movementY:-14,bubbles:true})));
 await page.mouse.down({button:'right'});await page.mouse.down({button:'left'});mark('ADS and fire down');
 await page.waitForTimeout(550);await page.mouse.up({button:'left'});mark('fire up');
 await page.waitForTimeout(600);await page.screenshot({path:out+'/held-ads.png'});mark('sustained ADS capture');
 await page.mouse.up({button:'right'});await page.waitForTimeout(200);mark('aim released');
 await page.keyboard.press('KeyR');mark('reload key');
 await page.waitForTimeout(1850);mark('reload observation end');
 await page.keyboard.press('Escape');
 record.visibleAfter={ammo:await page.locator('#ammo').innerText(),reserve:await page.locator('#reserve').innerText(),kills:await page.locator('#kills').innerText(),timer:await page.locator('#timer').innerText(),pauseVisible:await page.locator('#pause').isVisible()};
 const video=page.video();await context.close();context=null;await video.saveAs(out+'/continuous-reload.webm');record.video='continuous-reload.webm';
} catch(e){record.error=e.stack;process.exitCode=1;} finally{
 if(context)await context.close();if(browser)await browser.close();if(server)await server.close();
 record.browserClosed=!server||server.process().exitCode!==null||server.process().signalCode!==null;
 await writeFile(out+'/observation.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record));
}
