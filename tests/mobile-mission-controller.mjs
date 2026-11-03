import {mobileTouch} from '../tools/mobile-touch.mjs';
import {chromium} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:3});const errors=[],log=[];p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto('http://127.0.0.1:5173/?test=1');await p.waitForFunction(()=>window.__SOULFALL__,null,{timeout:60000});const t=await mobileTouch(p);await t.tap('#deploy');
mkdirSync(root+'/docs/media',{recursive:true});
const world=await p.evaluate(()=>{const g=window.__SOULFALL__.game;return {boxes:g.debug.colliders(),bounds:g.world.bounds}});
function walkable(x,z){const a=world.bounds;if(x<a.minX+.5||x>a.maxX-.5||z<a.minZ+.5||z>a.maxZ-.5)return false;return !world.boxes.some(b=>b.max[1]>.32&&b.min[1]<1.8&&Math.hypot(x-Math.max(b.min[0],Math.min(b.max[0],x)),z-Math.max(b.min[2],Math.min(b.max[2],z)))<.55)}
// Match grounded player height, including low feet; do not cut blocked corners.
function segmentWalkable(a,b){const steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.12));for(let i=1;i<=steps;i++){const t=i/steps;if(!walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false}return true}
function path(pos,goal){const sx=Math.round(pos.x),sz=Math.round(pos.z),gx=Math.round(goal.x),gz=Math.round(goal.z),q=[[sx,sz]],prev=new Map([[`${sx},${sz}`,null]]);let end;
for(let i=0;i<q.length;i++){const [x,z]=q[i];if(Math.hypot(x-gx,z-gz)<1.8){end=[x,z];break}for(const [dx,dz]of [[0,-1],[1,0],[0,1],[-1,0]]){const a=x+dx,c=z+dz,k=`${a},${c}`;if(!prev.has(k)&&walkable(a,c)&&segmentWalkable({x,z},{x:a,z:c})){prev.set(k,[x,z]);q.push([a,c])}}}if(!end)return[];const out=[];for(let e=end;e;e=prev.get(`${e[0]},${e[1]}`))out.push({x:e[0],z:e[1]});return out.reverse()}
let pathCache=[],routeGoal='',held='',shooting=false,steps=0;const start=Date.now();
while(Date.now()-start<Number(process.env.CONTROL_TIMEOUT_MS||360000)){
const s=await p.evaluate(()=>{const g=window.__SOULFALL__.game;const {facilityLayout,...state}=g.captureState();return {...state,pitch:g.pitch,targets:g.enemies.filter(e=>g.hasLineOfSight(g.player,e.group.position.clone().add({x:0,y:1.3,z:0}))).map(e=>({x:e.group.position.x,z:e.group.position.z,y:1.3,health:e.health})),boss:!g.custodian.dead&&g.custodian.active?g.custodian.coils.filter(n=>n.hp>0).map(n=>({x:g.custodian.group.position.x+n.metadata.target[0],y:n.metadata.target[1],z:g.custodian.group.position.z+n.metadata.target[2],health:n.hp})):[],inv:g.invulnerable}});
if(s.phase!=='playing'){log.push({at:Date.now()-start,state:s.phase,kills:s.kills,cores:s.cores,health:s.health});break}
if(steps%10===0)log.push({at:Date.now()-start,time:s.time,x:s.player.x,z:s.player.z,health:s.health,shield:s.shield,kills:s.kills,cores:s.cores,ammo:s.ammo,targets:s.targets.length});
const goals=s.coreMarkers.filter(c=>!c.collected).sort((a,b)=>a.distance-b.distance);const goal=goals[0]?{...goals[0],z:goals[0].z+1.5}:s.boss.length?{x:11,z:22}:s.exit;
const recovering=s.recoveryReady===true;
const goalKey=`${goal.x},${goal.z}`;if(routeGoal!==goalKey||steps%10===0){pathCache=path(s.player,goal);routeGoal=goalKey}
while(pathCache.length&&Math.hypot(pathCache[0].x-s.player.x,pathCache[0].z-s.player.z)<.85)pathCache.shift();
const ahead=pathCache[Math.min(1,pathCache.length-1)];const nav=(ahead&&segmentWalkable(s.player,ahead)?ahead:pathCache[0])||goal;const target=(s.boss.length&&Math.hypot(s.player.x-11,s.player.z-22)<1.8?s.boss:[])[0]||s.targets.sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z))[0];
const aim=target||{...nav,y:1.7};let desired=Math.atan2(s.player.x-aim.x,s.player.z-aim.z),delta=desired-s.player.yaw;delta=Math.atan2(Math.sin(delta),Math.cos(delta));const pitch=Math.atan2(aim.y-1.7,Math.hypot(aim.x-s.player.x,aim.z-s.player.z));
// All observations above read state; every control below is a native touch contact.
await t.clear();
if(s.ammo<5&&!s.reloading)await t.tap('#touch-reload');
const stop=recovering||(s.boss.length&&Math.hypot(s.player.x-11,s.player.z-22)<1.8)||(s.cores===3&&!s.boss.length&&s.exitDistance<2.2);
if(recovering){const u=await t.center('#touch-use');await t.down(1,u.x,u.y)}
else if(!stop){const m=await t.center('#touch-stick');await t.down(1,m.x,m.y);const vx=nav.x-s.player.x,vz=nav.z-s.player.z,f=vx*-Math.sin(s.player.yaw)+vz*-Math.cos(s.player.yaw),r=vx*Math.cos(s.player.yaw)+vz*-Math.sin(s.player.yaw),len=Math.hypot(f,r)||1;await t.move(1,m.x+r/len*46,m.y-f/len*46)}
const aligned=Math.abs(delta)<.18;
const a=target&&aligned&&!s.reloading?await t.center('#touch-fire'):{x:500,y:160};await t.down(2,a.x,a.y);
const scale=3.2/390;await t.move(2,Math.max(350,Math.min(820,a.x-Math.max(-1.4,Math.min(1.4,delta))/scale)),Math.max(70,Math.min(360,a.y-(pitch-s.pitch)/scale)));
await p.waitForTimeout(recovering?1400:120);steps++;
}
await t.clear();const final=await p.evaluate(()=>{const {facilityLayout,...s}=window.__SOULFALL__.game.captureState();return s});console.log(JSON.stringify({method:'Automated real-time combat exercise; no teleport, killAll, resource changes or simulation advance. All actions use native CDP touch; exact privileged state and geometry for decisions.',steps,log,final,errors},null,2));await p.screenshot({path:process.env.CONTROLLER_IMAGE||'docs/media/build73-controller-final.png',timeout:15000});
writeFileSync(process.env.CONTROLS_OUTPUT||root+'/docs/quality-reviews/build73-mobile-controller.json',JSON.stringify({method:'Exact-information automated normal controls: reads colliders, authored Custodian target metadata, player/target positions, LOS, health and goals for path/aim decisions; ordinary input only. Strong source/internal-state advantage; not independent discovery or human play. Grounded-height planning includes low obstacles, lookahead requires a clear segment, every route edge has swept capsule clearance, and boss aiming waits for the known firing position.',steps,log,final,errors},null,2));
assert.equal(final.phase,'won','Controller must actually finish extraction');assert.equal(final.cores,3);assert.equal(final.extractionProgress,1);assert.deepEqual(errors,[]);
}finally{await b.close()}
