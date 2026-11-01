import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
const rows=[],errors=[];mkdirSync('docs/media/build47-implementation-art',{recursive:true});
try{
 for(const fallback of [false,true]){
 const p=await b.newPage({viewport:{width:1280,height:800}});p.on('pageerror',e=>errors.push(e.message));if(fallback)await p.route(/assets\/(contact-discharge|sentinel|interceptor|induction-warden)\.glb/,r=>r.abort());await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__?.game.loaded,null,{polling:50});await p.click('#deploy',{force:true});
 for(const distance of [4,1.35])for(const type of ['warden','sentinel','stalker'])for(const [state,angle,ads]of [['idle',0,false],['charge',0,false],['charge',Math.PI/2,true],['release',Math.PI,false],['cancel',.8,false]]){
 const info=await p.evaluate(async({type,state,angle,ads,distance})=>{const g=window.__SOULFALL__.game,T=await import('/node_modules/three/build/three.module.js'),C=await import('/src/contact-discharge.js');g.clearRun();g.phase='playing';g.player.set(0,1.7,31);g.spawnEnemy(new T.Vector3(0,0,31-distance),type);const e=g.enemies[0];e.group.rotation.y=angle;e.cooldown=100;if(state==='charge')e.contactWindup=.15;if(state==='release')e.contactFlash=.22;if(state==='cancel'){e.contactFlash=.22;e.contactCanceled=true;}C.animateContact(e,0);g.yaw=0;g.pitch=distance<2?0:-.12;g.aim=ads;for(let i=0;i<30;i++)g.animate(1/60);g.emit();g.renderer.render(g.scene,g.camera);return {type,state,angle,ads,distance,calls:g.renderer.info.render.calls,triangles:g.renderer.info.render.triangles,shutters:e.contactRig.shutters.map(s=>s.node.position.y)};},{type,state,angle,ads,distance});
 const path=`docs/media/build47-implementation-art/${fallback?'fallback':'native'}-${type}-${distance}-${state}-${angle.toFixed(1)}.jpg`;await p.screenshot({path});rows.push({...info,fallback,path});
 }
 await p.close();
 }
 if(errors.length)throw Error(JSON.stringify(errors));
}finally{await b.close();writeFileSync('docs/quality-reviews/build47-implementation-art.json',JSON.stringify({method:'Arranged WebGL presentation at 4m and 1.35m, geometry states and multiple angles; not ordinary play. Scene draw calls include world and shadow passes; no FPS claim.',rows,errors},null,2));}
