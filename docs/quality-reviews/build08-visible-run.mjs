import {chromium} from '@playwright/test';
import readline from 'node:readline';
import {writeFileSync} from 'node:fs';
globalThis.b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
globalThis.p=await b.newPage({viewport:{width:1440,height:900}});globalThis.errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>document.querySelector('#deploy')&&!document.querySelector('#deploy').disabled);
globalThis.log=[];globalThis.obs=async(label)=>{const s=await p.evaluate(()=>window.__SOULFALL__.game.captureState());log.push({label,state:s});console.log(JSON.stringify({label,state:s}));await p.screenshot({path:`docs/media/build08-visible-${label}.png`});};
globalThis.hold=async(key,ms)=>{await p.keyboard.down(key);await p.waitForTimeout(ms);await p.keyboard.up(key)};
globalThis.save=()=>writeFileSync('docs/quality-reviews/build08-visible-raw.json',JSON.stringify({method:'Manual agent decisions from rendered screenshots; normal controls. Read-only HUD stats sampled after inputs. Paused between decisions; no exact enemy data or arrangements.',log,errors},null,2));
console.log('READY');
for await(const cmd of readline.createInterface({input:process.stdin})){try{console.log(await eval(cmd))}catch(e){console.log(String(e))}}
